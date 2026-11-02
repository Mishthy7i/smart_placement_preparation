import { Router } from "express";
import db from "../db";
import {
    authenticateToken,
    AuthenticatedRequest,
} from "../middleware/authMiddleware";

const router = Router();

type SubmittedAnswer = {
    questionId: number;
    selectedOption: "A" | "B" | "C" | "D" | null;
};

/**
 * @swagger
 * /api/attempts:
 *   post:
 *     summary: Submit a practice attempt
 *     tags:
 *       - Attempts
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - topicId
 *               - answers
 *             properties:
 *               topicId:
 *                 type: integer
 *                 example: 2
 *               answers:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - questionId
 *                     - selectedOption
 *                   properties:
 *                     questionId:
 *                       type: integer
 *                       example: 2
 *                     selectedOption:
 *                       type: string
 *                       enum: [A, B, C, D]
 *                       example: B
 *     responses:
 *       201:
 *         description: Attempt submitted successfully
 *       400:
 *         description: Invalid attempt data
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Server error
 */
router.post(
    "/",
    authenticateToken,
    async (req: AuthenticatedRequest, res) => {
        const connection = await db.getConnection();

        try {
            const userId = req.user?.userId;
            const { topicId, answers } = req.body as {
                topicId: number;
                answers: SubmittedAnswer[];
            };

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: "Authentication required",
                });
            }

            if (
                !Number.isInteger(Number(topicId)) ||
                !Array.isArray(answers) ||
                answers.length === 0
            ) {
                return res.status(400).json({
                    success: false,
                    message: "A valid topicId and at least one answer are required",
                });
            }

            const questionIds = answers.map((answer) => Number(answer.questionId));

            if (questionIds.some((id) => !Number.isInteger(id) || id <= 0)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid question ID",
                });
            }

            await connection.beginTransaction();

            const [questionRows] = await connection.query(
                `
        SELECT id, correct_option
        FROM questions
        WHERE topic_id = ?
          AND id IN (?)
        `,
                [Number(topicId), questionIds]
            );

            const questions = questionRows as {
                id: number;
                correct_option: "A" | "B" | "C" | "D";
            }[];

            if (questions.length !== answers.length) {
                await connection.rollback();

                return res.status(400).json({
                    success: false,
                    message: "One or more questions do not belong to this topic",
                });
            }

            const answerResults = answers.map((answer) => {
                const question = questions.find(
                    (item) => item.id === Number(answer.questionId)
                );

                const isCorrect =
                    question?.correct_option === answer.selectedOption;

                return {
                    questionId: Number(answer.questionId),
                    selectedOption: answer.selectedOption,
                    isCorrect,
                };
            });

            const score = answerResults.filter(
                (answer) => answer.isCorrect
            ).length;

            const [attemptResult] = await connection.query(
                `
        INSERT INTO attempts
          (user_id, topic_id, score, total_questions, started_at, completed_at)
        VALUES (?, ?, ?, ?, NOW(), NOW())
        `,
                [userId, Number(topicId), score, answerResults.length]
            );

            const attemptId = (attemptResult as { insertId: number }).insertId;

            for (const answer of answerResults) {
                await connection.query(
                    `
          INSERT INTO attempt_answers
            (attempt_id, question_id, selected_option, is_correct)
          VALUES (?, ?, ?, ?)
          `,
                    [
                        attemptId,
                        answer.questionId,
                        answer.selectedOption,
                        answer.isCorrect,
                    ]
                );
            }

            await connection.commit();

            return res.status(201).json({
                success: true,
                message: "Attempt submitted successfully",
                data: {
                    attemptId,
                    score,
                    totalQuestions: answerResults.length,
                    percentage: Math.round(
                        (score / answerResults.length) * 100
                    ),
                },
            });
        } catch (error) {
            await connection.rollback();

            console.error("Attempt submission error:", error);

            return res.status(500).json({
                success: false,
                message: "Failed to submit attempt",
            });
        } finally {
            connection.release();
        }
    }
);
/**
 * @swagger
 * /api/attempts/history:
 *   get:
 *     summary: Get the logged-in student's attempt history
 *     tags:
 *       - Attempts
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Attempt history retrieved successfully
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Server error
 */
router.get(
    "/history",
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
          a.id,
          a.topic_id,
          t.name AS topic_name,
          a.score,
          a.total_questions,
          ROUND((a.score / a.total_questions) * 100) AS percentage,
          a.started_at,
          a.completed_at
        FROM attempts a
        LEFT JOIN topics t ON a.topic_id = t.id
        WHERE a.user_id = ?
        ORDER BY a.completed_at DESC
        `,
                [userId]
            );

            return res.status(200).json({
                success: true,
                data: rows,
            });
        } catch (error) {
            console.error("Attempt history error:", error);

            return res.status(500).json({
                success: false,
                message: "Failed to fetch attempt history",
            });
        }
    }
);
export default router;