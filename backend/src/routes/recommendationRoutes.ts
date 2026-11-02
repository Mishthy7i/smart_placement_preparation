import { Router } from "express";
import db from "../db";
import {
    authenticateToken,
    AuthenticatedRequest,
} from "../middleware/authMiddleware";

const router = Router();
/**
 * @swagger
 * /api/recommendations:
 *   get:
 *     summary: Get personalized preparation recommendations
 *     tags:
 *       - Recommendations
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Recommendations generated successfully
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Server error
 */

router.get(
    "/",
    authenticateToken,
    async (req: AuthenticatedRequest, res) => {
        try {
            const userId = req.user?.userId;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: "Authentication required",
                });
            }

            const [rows] = await db.query(
                `
        SELECT
          t.id AS topic_id,
          t.name AS topic_name,
          COUNT(a.id) AS attempts,
          COALESCE(
            ROUND(
              (SUM(a.score) / NULLIF(SUM(a.total_questions), 0)) * 100
            ),
            0
          ) AS percentage
        FROM topics t
        LEFT JOIN attempts a
          ON t.id = a.topic_id
          AND a.user_id = ?
        GROUP BY t.id, t.name
        ORDER BY percentage ASC, attempts ASC
        `,
                [userId]
            );

            const recommendations = (
                rows as {
                    topic_id: number;
                    topic_name: string;
                    attempts: number;
                    percentage: number;
                }[]
            ).map((topic) => {
                let priority: "HIGH" | "MEDIUM" | "LOW";
                let message: string;

                if (topic.attempts === 0) {
                    priority = "HIGH";
                    message = "You have not practiced this topic yet.";
                } else if (topic.percentage < 60) {
                    priority = "HIGH";
                    message = "Focus on this topic and revise the fundamentals.";
                } else if (topic.percentage < 75) {
                    priority = "MEDIUM";
                    message = "Practice more questions to improve consistency.";
                } else {
                    priority = "LOW";
                    message = "Good performance. Continue practicing to maintain it.";
                }

                return {
                    topicId: topic.topic_id,
                    topicName: topic.topic_name,
                    attempts: topic.attempts,
                    percentage: topic.percentage,
                    priority,
                    message,
                };
            });

            return res.status(200).json({
                success: true,
                data: recommendations,
            });
        } catch (error) {
            console.error("Recommendations error:", error);

            return res.status(500).json({
                success: false,
                message: "Failed to generate recommendations",
            });
        }
    }
);

router.get("/coding", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ success: false, message: "Authentication required" });

        const [rows] = await db.query(
            `SELECT platform, username, total_solved, contest_rating, last_synced_at
             FROM coding_profiles WHERE user_id = ? ORDER BY total_solved ASC`,
            [userId]
        );

        const data = (rows as { platform: string; username: string | null; total_solved: number; contest_rating: number | null; last_synced_at: string | null }[]).map((profile) => ({
            platform: profile.platform,
            username: profile.username,
            totalSolved: Number(profile.total_solved || 0),
            contestRating: profile.contest_rating,
            priority: Number(profile.total_solved || 0) < 100 ? "HIGH" : Number(profile.total_solved || 0) < 250 ? "MEDIUM" : "LOW",
            message: Number(profile.total_solved || 0) < 100
                ? `Build consistency on ${profile.platform} by solving a few problems every day.`
                : `Keep growing your ${profile.platform} problem-solving streak and review harder topics.`,
            lastSyncedAt: profile.last_synced_at,
        }));

        return res.json({ success: true, data });
    } catch (error) {
        console.error("Coding recommendations error:", error);
        return res.status(500).json({ success: false, message: "Failed to generate coding recommendations" });
    }
});

export default router;
