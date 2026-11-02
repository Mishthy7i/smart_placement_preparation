import { Router } from "express";
import db from "../db";
import {
    authenticateToken,
    AuthenticatedRequest,
} from "../middleware/authMiddleware";

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
 *       - in: query
 *         name: difficulty
 *         required: false
 *         schema:
 *           type: string
 *           enum: [EASY, MEDIUM, HARD]
 *       - in: query
 *         name: subtopic
 *         required: false
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Questions retrieved successfully
 *       400:
 *         description: Invalid topic ID
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Server error
 */
router.get(
    "/topics/:topicId/questions",
    authenticateToken,
    async (req, res) => {
        try {
            const topicId = Number(req.params.topicId);
            const { difficulty, subtopic } = req.query;

            if (!Number.isInteger(topicId) || topicId <= 0) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid topic ID",
                });
            }

            const conditions = ["topic_id = ?"];
            const values: (number | string)[] = [topicId];

            if (
                difficulty === "EASY" ||
                difficulty === "MEDIUM" ||
                difficulty === "HARD"
            ) {
                conditions.push("difficulty = ?");
                values.push(difficulty);
            }

            if (typeof subtopic === "string" && subtopic.trim() !== "") {
                conditions.push("subtopic = ?");
                values.push(subtopic.trim());
            }

            const [rows] = await db.query(
                `
        SELECT
          id,
          topic_id,
          subtopic,
          question_text,
          option_a,
          option_b,
          option_c,
          option_d,
          difficulty
        FROM questions
        WHERE ${conditions.join(" AND ")}
        ORDER BY id ASC
        `,
                values
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

/**
 * @swagger
 * /api/topics/{topicId}/adaptive-questions:
 *   get:
 *     summary: Get an adaptive question set for a topic
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
 *       - in: query
 *         name: count
 *         required: false
 *         schema:
 *           type: integer
 *           default: 5
 *           maximum: 10
 *     responses:
 *       200:
 *         description: Adaptive question set retrieved successfully
 *       400:
 *         description: Invalid topic ID
 *       401:
 *         description: Authentication required
 *       404:
 *         description: No questions available
 *       500:
 *         description: Server error
 */
router.get(
    "/topics/:topicId/adaptive-questions",
    authenticateToken,
    async (req: AuthenticatedRequest, res) => {
        try {
            const userId = req.user?.userId;
            const topicId = Number(req.params.topicId);

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: "Authentication required",
                });
            }

            if (!Number.isInteger(topicId) || topicId <= 0) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid topic ID",
                });
            }

            const [historyRows] = await db.query(
                `
        SELECT
          q.difficulty,
          aa.is_correct
        FROM attempt_answers aa
        JOIN attempts a
          ON aa.attempt_id = a.id
        JOIN questions q
          ON aa.question_id = q.id
        WHERE a.user_id = ?
          AND q.topic_id = ?
        ORDER BY a.completed_at DESC, aa.id DESC
        LIMIT 10
        `,
                [userId, topicId]
            );

            const history = historyRows as {
                difficulty: "EASY" | "MEDIUM" | "HARD";
                is_correct: number | boolean;
            }[];

            let selectedDifficulty: "EASY" | "MEDIUM" | "HARD" = "EASY";

            const latestThree = history.slice(0, 3);
            const latestTwo = history.slice(0, 2);

            const threeCorrect =
                latestThree.length >= 3 &&
                latestThree.every((answer) => Boolean(answer.is_correct));

            const twoIncorrect =
                latestTwo.length >= 2 &&
                latestTwo.every((answer) => !Boolean(answer.is_correct));

            if (threeCorrect) {
                const currentDifficulty = latestThree[0].difficulty;

                if (currentDifficulty === "EASY") {
                    selectedDifficulty = "MEDIUM";
                } else {
                    selectedDifficulty = "HARD";
                }
            } else if (twoIncorrect) {
                const currentDifficulty = latestTwo[0].difficulty;

                if (currentDifficulty === "HARD") {
                    selectedDifficulty = "MEDIUM";
                } else {
                    selectedDifficulty = "EASY";
                }
            } else if (history.length > 0) {
                selectedDifficulty = history[0].difficulty;
            }

            const countValue = Number(req.query.count || 5);
            const count = Math.min(Math.max(countValue, 1), 10);

            const [questionRows] = await db.query(
                `
        SELECT
          id,
          topic_id,
          subtopic,
          question_text,
          option_a,
          option_b,
          option_c,
          option_d,
          difficulty
        FROM questions
        WHERE topic_id = ?
          AND difficulty = ?
        ORDER BY RAND()
        LIMIT ${count}
        `,
                [topicId, selectedDifficulty]
            );

            const questions = questionRows as object[];

            if (questions.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: `No ${selectedDifficulty} questions are available for this topic`,
                    recommendedDifficulty: selectedDifficulty,
                });
            }

            return res.status(200).json({
                success: true,
                data: {
                    recommendedDifficulty: selectedDifficulty,
                    questions,
                },
            });
        } catch (error) {
            console.error("Adaptive question-set error:", error);

            return res.status(500).json({
                success: false,
                message: "Failed to generate adaptive question set",
            });
        }
    }
);

export default router;