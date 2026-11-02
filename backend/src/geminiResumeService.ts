type ResumeAnalysis = { score: number; summary: string; strengths: string[]; missingSkills: string[]; suggestions: string[]; atsKeywords: string[]; actionPlan: string[] };

export async function analyzeResumeWithGemini(input: { resumeText: string; targetCompany: string | null; targetRole: string }): Promise<ResumeAnalysis> {
  const key = process.env.GEMINI_API_KEY;
  const models = Array.from(new Set([
    process.env.GEMINI_MODEL,
    "gemini-2.5-flash-lite",
    "gemini-2.5-flash",
    "gemini-3-flash-preview",
  ].filter(Boolean))) as string[];
  if (!key) throw new Error("GEMINI_API_KEY is not configured");
  const requestBody = {
    systemInstruction: { parts: [{ text: "Review resumes honestly. Never invent skills or experience. Return only JSON." }] },
    contents: [{ role: "user", parts: [{ text: `Analyze this resume for ${input.targetRole} at ${input.targetCompany || "any company"}. Resume:\n${input.resumeText.slice(0, 30000)}` }] }],
    generationConfig: {
      temperature: 0.2, responseMimeType: "application/json", responseSchema: {
        type: "OBJECT", properties: {
          score: { type: "INTEGER", minimum: 0, maximum: 100 }, summary: { type: "STRING" },
          strengths: { type: "ARRAY", items: { type: "STRING" } }, missingSkills: { type: "ARRAY", items: { type: "STRING" } },
          suggestions: { type: "ARRAY", items: { type: "STRING" } }, atsKeywords: { type: "ARRAY", items: { type: "STRING" } },
          actionPlan: { type: "ARRAY", items: { type: "STRING" } },
        }, required: ["score", "summary", "strengths", "missingSkills", "suggestions", "atsKeywords", "actionPlan"]
      }
    },
  };

  let response: Response | null = null;
  let lastError = "No response";
  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(requestBody),
      });
      if (response.ok) break;
      lastError = `${model}: ${response.status} ${(await response.text()).slice(0, 300)}`;
      if (![429, 500, 502, 503, 504].includes(response.status)) break;
      await new Promise((resolve) => setTimeout(resolve, 1500 * (attempt + 1)));
    }
    if (response?.ok) break;
  }
  if (!response || !response.ok) {
    throw new Error(`Gemini request failed after trying available models: ${lastError}`);
  }
  const payload = await response.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini returned an empty analysis");
  const result = JSON.parse(text) as ResumeAnalysis;
  if (!Number.isFinite(result.score) || !result.summary) throw new Error("Gemini returned invalid analysis data");
  return result;
}
