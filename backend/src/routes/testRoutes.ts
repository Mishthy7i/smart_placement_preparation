import { Router } from "express";
import db from "../db";
import { authenticateToken, AuthenticatedRequest } from "../middleware/authMiddleware";

const router = Router();

/**
 * @swagger
 * /api/tests:
 *   get:
 *     summary: Get all available mock tests
 *     tags:
 *       - Tests
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Mock tests retrieved successfully
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Server error
 */
router.get("/", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ success: false, message: "Authentication required" });

        const [rows] = await db.query(`
      SELECT
        t.id,
        t.title,
        t.description,
        t.duration_minutes,
        COUNT(tq.question_id) AS total_questions,
        t.created_at,
        CASE WHEN MAX(a.id) IS NULL THEN 0 ELSE 1 END AS completed,
        MAX(a.score) AS last_score,
        MAX(a.total_questions) AS last_total_questions,
        MAX(a.completed_at) AS last_completed_at
      FROM tests t
      LEFT JOIN test_questions tq
        ON t.id = tq.test_id
      LEFT JOIN attempts a
        ON a.test_id = t.id AND a.user_id = ?
      GROUP BY
        t.id,
        t.title,
        t.description,
        t.duration_minutes,
        t.created_at
      ORDER BY t.created_at DESC
    `, [userId]);

        return res.status(200).json({
            success: true,
            data: rows,
        });
    } catch (error) {
        console.error("Tests error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch mock tests",
        });
    }
});
/**
 * @swagger
 * /api/tests/{testId}:
 *   get:
 *     summary: Get a mock test with its questions
 *     tags:
 *       - Tests
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: testId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Mock test ID
 *     responses:
 *       200:
 *         description: Mock test retrieved successfully
 *       400:
 *         description: Invalid test ID
 *       404:
 *         description: Mock test not found
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Server error
 */
router.get(
    "/:testId",
    authenticateToken,
    async (req, res) => {
        try {
            const testId = Number(req.params.testId);

            if (!Number.isInteger(testId) || testId <= 0) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid test ID",
                });
            }

            const [testRows] = await db.query(
                `
        SELECT
          id,
          title,
          description,
          duration_minutes
        FROM tests
        WHERE id = ?
        `,
                [testId]
            );

            const tests = testRows as {
                id: number;
                title: string;
                description: string;
                duration_minutes: number;
            }[];

            if (tests.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Mock test not found",
                });
            }

            const [questionRows] = await db.query(
                `
        SELECT
          q.id,
          q.question_text,
          q.option_a,
          q.option_b,
          q.option_c,
          q.option_d,
          q.difficulty
        FROM test_questions tq
        JOIN questions q
          ON tq.question_id = q.id
        WHERE tq.test_id = ?
        ORDER BY q.id ASC
        `,
                [testId]
            );

            return res.status(200).json({
                success: true,
                data: {
                    test: tests[0],
                    questions: questionRows,
                },
            });
        } catch (error) {
            console.error("Test details error:", error);

            return res.status(500).json({
                success: false,
                message: "Failed to fetch mock test",
            });
        }
    }
);

/**
 * @swagger
 * /api/tests/{testId}/result:
 *   get:
 *     summary: Get the logged-in student's latest result for a mock test
 *     tags:
 *       - Tests
 *     security:
 *       - bearerAuth: []
 */
router.get(
    "/:testId/result",
    authenticateToken,
    async (req: AuthenticatedRequest, res) => {
        try {
            const userId = req.user?.userId;
            const testId = Number(req.params.testId);
            if (!userId) return res.status(401).json({ success: false, message: "Authentication required" });
            if (!Number.isInteger(testId) || testId <= 0) return res.status(400).json({ success: false, message: "Invalid test ID" });

            const [rows] = await db.query(
                `SELECT id AS attempt_id, score, total_questions, started_at, completed_at,
                        TIMESTAMPDIFF(SECOND, started_at, completed_at) AS time_taken_seconds,
                        ROUND(score / NULLIF(total_questions, 0) * 100) AS percentage
                 FROM attempts
                 WHERE user_id = ? AND test_id = ?
                 ORDER BY completed_at DESC, id DESC LIMIT 1`,
                [userId, testId]
            );
            const result = (rows as object[])[0] || null;

            if (!result) return res.json({ success: true, data: null });

            const [answerRows] = await db.query(
                `SELECT aa.question_id, aa.selected_option, aa.is_correct,
                        q.question_text, q.option_a, q.option_b, q.option_c, q.option_d,
                        q.correct_option, q.explanation, q.difficulty, t.name AS topic_name
                 FROM attempt_answers aa
                 JOIN questions q ON q.id = aa.question_id
                 LEFT JOIN topics t ON t.id = q.topic_id
                 WHERE aa.attempt_id = ?
                 ORDER BY aa.id ASC`,
                [(result as { attempt_id: number }).attempt_id]
            );

            return res.json({
                success: true,
                data: {
                    ...result,
                    answers: answerRows,
                },
            });
        } catch (error) {
            console.error("Test result error:", error);
            return res.status(500).json({ success: false, message: "Failed to fetch test result" });
        }
    }
);
/**
 * @swagger
 * /api/tests/{testId}/submit:
 *   post:
 *     summary: Submit a mock test
 *     tags:
 *       - Tests
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: testId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - answers
 *             properties:
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
 *                       example: 1
 *                     selectedOption:
 *                       type: string
 *                       enum: [A, B, C, D]
 *                       example: B
 *     responses:
 *       201:
 *         description: Mock test submitted successfully
 *       400:
 *         description: Invalid submission
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Mock test not found
 *       500:
 *         description: Server error
 */
router.post(
    "/:testId/submit",
    authenticateToken,
    async (req: AuthenticatedRequest, res) => {
        const connection = await db.getConnection();

        try {
            const userId = req.user?.userId;
            const testId = Number(req.params.testId);

            const { answers } = req.body as {
                answers: {
                    questionId: number;
                    selectedOption: "A" | "B" | "C" | "D";
                }[];
            };
            const startedAtValue = req.body?.startedAt;
            const startedAt = startedAtValue ? new Date(startedAtValue) : new Date();
            const durationSeconds = Number(req.body?.durationSeconds);
            const effectiveStartedAt = Number.isFinite(durationSeconds) && durationSeconds > 0
                ? new Date(Date.now() - Math.floor(durationSeconds) * 1000)
                : startedAt;

            if (Number.isNaN(startedAt.getTime())) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid test start time",
                });
            };

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: "Authentication required",
                });
            }

            if (
                !Number.isInteger(testId) ||
                testId <= 0 ||
                !Array.isArray(answers) ||
                answers.length === 0
            ) {
                return res.status(400).json({
                    success: false,
                    message: "A valid test ID and answers are required",
                });
            }

            await connection.beginTransaction();

            const [questionRows] = await connection.query(
                `
        SELECT
          q.id,
          q.correct_option
        FROM test_questions tq
        JOIN questions q
          ON tq.question_id = q.id
        WHERE tq.test_id = ?
        `,
                [testId]
            );

            const questions = questionRows as {
                id: number;
                correct_option: "A" | "B" | "C" | "D";
            }[];

            if (questions.length === 0) {
                await connection.rollback();

                return res.status(404).json({
                    success: false,
                    message: "Mock test has no questions",
                });
            }

            const answerResults = answers.map((answer) => {
                const question = questions.find(
                    (item) => item.id === Number(answer.questionId)
                );

                return {
                    questionId: Number(answer.questionId),
                    selectedOption: answer.selectedOption,
                    isCorrect:
                        question?.correct_option === answer.selectedOption,
                };
            });

            const score = answerResults.filter(
                (answer) => answer.isCorrect
            ).length;

            const [attemptResult] = await connection.query(
                `
        INSERT INTO attempts
          (user_id, test_id, topic_id, score, total_questions, started_at, completed_at)
        VALUES (?, ?, NULL, ?, ?, ?, NOW())
        `,
                [userId, testId, score, questions.length, effectiveStartedAt]
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
                message: "Mock test submitted successfully",
                data: {
                    attemptId,
                    score,
                    totalQuestions: questions.length,
                    percentage: Math.round(
                        (score / questions.length) * 100
                    ),
                },
            });
        } catch (error) {
            await connection.rollback();

            console.error("Test submission error:", error);

            return res.status(500).json({
                success: false,
                message: "Failed to submit mock test",
            });
        } finally {
            connection.release();
        }
    }
);

export default router;
