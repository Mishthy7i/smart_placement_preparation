import { Router } from "express";
import db from "../db";
import { authenticateToken } from "../middleware/authMiddleware";

const router = Router();

/**
 * @swagger
 * /api/topics/{topicId}/questions:
 *   get:
 *     summary: Get questions for a topic
 *     tags:
 *       - Questions
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: topicId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Topic ID
 *     responses:
 *       200:
 *         description: Questions retrieved successfully
 *       401:
 *         description: Authentication token is required
 *       404:
 *         description: Topic not found
 *       500:
 *         description: Server error
 */
router.get(
    "/topics/:topicId/questions",
    authenticateToken,
    async (req, res) => {
        try {
            const topicId = Number(req.params.topicId);

            if (!Number.isInteger(topicId) || topicId <= 0) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid topic ID",
                });
            }

            const [rows] = await db.query(
                `
        SELECT
          id,
          topic_id,
          question_text,
          option_a,
          option_b,
          option_c,
          option_d,
          difficulty
        FROM questions
        WHERE topic_id = ?
        ORDER BY id ASC
        `,
                [topicId]
            );

            return res.status(200).json({
                success: true,
                data: rows,
            });
        } catch (error) {
            console.error("Questions error:", error);

            return res.status(500).json({
                success: false,
                message: "Failed to fetch questions",
            });
        }
    }
);

export default router;