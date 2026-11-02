import { Router } from "express";
import db from "../db";
import { authenticateToken, AuthenticatedRequest } from "../middleware/authMiddleware";

const router = Router();
const requestTimes = new Map<number, number[]>();
const dailyRequestTimes = new Map<number, number[]>();

router.get("/context", authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ success: false, message: "Authentication required" });
    const [codingProfiles] = await db.query("SELECT platform, total_solved, easy_solved, medium_solved, hard_solved, contest_rating FROM coding_profiles WHERE user_id = ?", [userId]);
    const [practicePerformance] = await db.query(`SELECT t.name AS topic, COUNT(a.id) AS attempts, COALESCE(ROUND(SUM(a.score) / NULLIF(SUM(a.total_questions), 0) * 100), 0) AS percentage FROM topics t LEFT JOIN attempts a ON t.id = a.topic_id AND a.user_id = ? GROUP BY t.id, t.name ORDER BY percentage ASC`, [userId]);
    const [resumeAnalysis] = await db.query("SELECT target_company, target_role, analysis_result FROM resumes WHERE user_id = ? AND analysis_result IS NOT NULL ORDER BY id DESC LIMIT 1", [userId]);
    return res.json({ success: true, data: { codingProfiles, practicePerformance, resumeAnalysis } });
  } catch (error) {
    console.error("Coach context error:", error);
    return res.status(500).json({ success: false, message: "Failed to load coach context" });
  }
});

router.post("/chat", authenticateToken, async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.userId;
  const question = typeof req.body.question === "string" ? req.body.question.trim() : "";
  if (!userId) return res.status(401).json({ success: false, message: "Authentication required" });
  if (!question) return res.status(400).json({ success: false, message: "Question is required" });

  const now = Date.now();
  const recent = (requestTimes.get(userId) ?? []).filter((time) => now - time < 60_000);
  const today = (dailyRequestTimes.get(userId) ?? []).filter((time) => now - time < 24 * 60 * 60 * 1000);
  if (recent.length >= 3) return res.status(429).json({ success: false, message: "Coach limit reached. Please wait a minute before trying again." });
  if (today.length >= 30) return res.status(429).json({ success: false, message: "Daily coach limit reached. Try again tomorrow." });
  requestTimes.set(userId, [...recent, now]);
  dailyRequestTimes.set(userId, [...today, now]);

  try {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("Gemini fallback is not configured");
    const [codingRows] = await db.query("SELECT platform, username, total_solved, easy_solved, medium_solved, hard_solved, contest_rating FROM coding_profiles WHERE user_id = ?", [userId]);
    const [practiceRows] = await db.query(`SELECT t.name AS topic, COUNT(a.id) AS attempts, COALESCE(ROUND(SUM(a.score) / NULLIF(SUM(a.total_questions), 0) * 100), 0) AS percentage FROM topics t LEFT JOIN attempts a ON t.id = a.topic_id AND a.user_id = ? GROUP BY t.id, t.name ORDER BY percentage ASC`, [userId]);
    const [resumeRows] = await db.query("SELECT target_company, target_role, analysis_result FROM resumes WHERE user_id = ? AND analysis_result IS NOT NULL ORDER BY id DESC LIMIT 1", [userId]);
    const context = JSON.stringify({ codingProfiles: codingRows, practicePerformance: practiceRows, latestResumeAnalysis: resumeRows });
    const models = Array.from(new Set([process.env.GEMINI_MODEL, "gemini-2.5-flash-lite", "gemini-2.5-flash", "gemini-3-flash-preview"].filter(Boolean))) as string[];
    let answer: string | undefined;
    let lastError = "No response";
    for (const model of models) {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: `You are SmartPrep, a personalized placement coach. Use the student's stored data below. Never ask for profile URLs or data already present. If data is missing, say so clearly. Give practical, concise recommendations and never invent scores.\n\nStudent data:\n${context}\n\nStudent question:\n${question}` }] }] }),
      });
      if (!response.ok) { lastError = `${model} returned ${response.status}: ${(await response.text()).slice(0, 240)}`; continue; }
      const payload = await response.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
      answer = payload.candidates?.[0]?.content?.parts?.[0]?.text;
      if (answer) break;
    }
    if (!answer) throw new Error(lastError);
    return res.json({ success: true, provider: "Google Gemini", data: { answer } });
  } catch (error) {
    console.error("Coach fallback error:", error);
    return res.status(502).json({ success: false, message: `Coach fallback failed: ${error instanceof Error ? error.message : "Unknown error"}` });
  }
});

export default router;
