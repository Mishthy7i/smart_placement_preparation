import { Router } from "express";
import db from "../db";
import {
    authenticateToken,
    AuthenticatedRequest,
} from "../middleware/authMiddleware";

const router = Router();

/**
 * @swagger
 * /api/analytics/summary:
 *   get:
 *     summary: Get student performance analytics
 *     tags:
 *       - Analytics
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Analytics retrieved successfully
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Server error
 */
router.get(
    "/summary",
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

            const [overviewRows] = await db.query(
                `
        SELECT
          COUNT(*) AS total_attempts,
          COALESCE(SUM(score), 0) AS questions_correct,
          COALESCE(SUM(total_questions), 0) AS questions_attempted,
          COALESCE(
            ROUND(AVG((score / NULLIF(total_questions, 0)) * 100)),
            0
          ) AS average_percentage
        FROM attempts
        WHERE user_id = ?
        `,
                [userId]
            );

            const [topicRows] = await db.query(
                `
        SELECT
          t.name AS topic_name,
          COUNT(a.id) AS attempts,
          COALESCE(SUM(a.score), 0) AS correct_answers,
          COALESCE(SUM(a.total_questions), 0) AS total_questions,
          COALESCE(
            ROUND(
              (SUM(a.score) / NULLIF(SUM(a.total_questions), 0)) * 100
            ),
            0
          ) AS percentage
        FROM attempts a
        JOIN topics t ON a.topic_id = t.id
        WHERE a.user_id = ?
        GROUP BY t.id, t.name
        ORDER BY percentage ASC
        `,
                [userId]
            );

            const [trendRows] = await db.query(
                `
        SELECT
          DATE_FORMAT(completed_at, '%Y-%m-%d') AS date,
          ROUND(
            (score / NULLIF(total_questions, 0)) * 100
          ) AS percentage
        FROM attempts
        WHERE user_id = ?
        ORDER BY completed_at ASC
        LIMIT 10
        `,
                [userId]
            );

            return res.status(200).json({
                success: true,
                data: {
                    overview: overviewRows,
                    topicPerformance: topicRows,
                    scoreTrend: trendRows,
                },
            });
        } catch (error) {
            console.error("Analytics error:", error);

            return res.status(500).json({
                success: false,
                message: "Failed to fetch analytics",
            });
        }
    }
);

export default router;