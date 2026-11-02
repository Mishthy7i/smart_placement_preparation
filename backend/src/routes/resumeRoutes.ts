import { Router } from "express";
import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";
import db from "../db";
import {
    authenticateToken,
    AuthenticatedRequest,
} from "../middleware/authMiddleware";
import { resumeUpload } from "../config/upload";

const router = Router();

/**
 * @swagger
 * /api/resumes/upload:
 *   post:
 *     summary: Upload and extract a resume
 *     tags:
 *       - Resumes
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - resume
 *             properties:
 *               resume:
 *                 type: string
 *                 format: binary
 *               targetCompany:
 *                 type: string
 *                 example: TCS
 *               targetRole:
 *                 type: string
 *                 example: Software Engineer
 *     responses:
 *       201:
 *         description: Resume uploaded successfully
 *       400:
 *         description: Invalid file or missing data
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Server error
 */
router.post(
    "/upload",
    authenticateToken,
    resumeUpload.single("resume"),
    async (req: AuthenticatedRequest, res) => {
        try {
            const userId = req.user?.userId;
            const file = req.file;

            const targetCompany =
                typeof req.body.targetCompany === "string"
                    ? req.body.targetCompany.trim()
                    : null;

            const targetRole =
                typeof req.body.targetRole === "string"
                    ? req.body.targetRole.trim()
                    : null;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: "Authentication required",
                });
            }

            if (!file) {
                return res.status(400).json({
                    success: false,
                    message: "Resume file is required",
                });
            }

            if (!targetRole) {
                return res.status(400).json({
                    success: false,
                    message: "Target role is required",
                });
            }

            let extractedText = "";

            if (file.mimetype === "application/pdf") {
                const parser = new PDFParse({
                    data: file.buffer,
                });

                const pdfData = await parser.getText();

                extractedText = pdfData.text;

                await parser.destroy();
            } else if (
                file.mimetype ===
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            ) {
                const docxData = await mammoth.extractRawText({
                    buffer: file.buffer,
                });

                extractedText = docxData.value;
            }

            if (!extractedText.trim()) {
                return res.status(400).json({
                    success: false,
                    message: "Could not extract text from the resume",
                });
            }

            const [result] = await db.query(
                `
        INSERT INTO resumes (
          user_id,
          file_name,
          file_type,
          extracted_text,
          target_company,
          target_role
        )
        VALUES (?, ?, ?, ?, ?, ?)
        `,
                [
                    userId,
                    file.originalname,
                    file.mimetype,
                    extractedText.trim(),
                    targetCompany,
                    targetRole,
                ]
            );

            return res.status(201).json({
                success: true,
                message: "Resume uploaded and processed successfully",
                data: {
                    resumeId: (result as { insertId: number }).insertId,
                    fileName: file.originalname,
                    targetCompany,
                    targetRole,
                    extractedCharacters: extractedText.trim().length,
                },
            });
        } catch (error) {
            console.error("Resume upload error:", error);

            return res.status(500).json({
                success: false,
                message: "Failed to process resume",
            });
        }
    }
);
/**
 * @swagger
 * /api/resumes/{resumeId}/analyze:
 *   post:
 *     summary: Analyze a resume for a target role
 *     tags:
 *       - Resumes
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: resumeId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Resume analyzed successfully
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Resume not found
 *       500:
 *         description: Server error
 */
router.post(
    "/:resumeId/analyze",
    authenticateToken,
    async (req: AuthenticatedRequest, res) => {
        try {
            const userId = req.user?.userId;
            const resumeId = Number(req.params.resumeId);

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: "Authentication required",
                });
            }

            if (!Number.isInteger(resumeId) || resumeId <= 0) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid resume ID",
                });
            }

            const [resumeRows] = await db.query(
                `
        SELECT
          id,
          extracted_text,
          target_company,
          target_role
        FROM resumes
        WHERE id = ?
          AND user_id = ?
        `,
                [resumeId, userId]
            );

            const resumes = resumeRows as {
                id: number;
                extracted_text: string;
                target_company: string | null;
                target_role: string;
            }[];

            if (resumes.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Resume not found",
                });
            }

            const resume = resumes[0];
            const resumeText = resume.extracted_text.toLowerCase();
            const targetRole = resume.target_role.toLowerCase();

            let requiredSkills = [
                "javascript",
                "typescript",
                "react",
                "node.js",
                "sql",
                "git",
                "data structures",
                "algorithms",
            ];

            if (
                targetRole.includes("frontend") ||
                targetRole.includes("front-end")
            ) {
                requiredSkills = [
                    "html",
                    "css",
                    "javascript",
                    "typescript",
                    "react",
                    "responsive design",
                    "git",
                ];
            } else if (
                targetRole.includes("backend") ||
                targetRole.includes("back-end")
            ) {
                requiredSkills = [
                    "node.js",
                    "express",
                    "sql",
                    "mysql",
                    "rest api",
                    "authentication",
                    "git",
                ];
            } else if (targetRole.includes("data")) {
                requiredSkills = [
                    "python",
                    "sql",
                    "pandas",
                    "numpy",
                    "statistics",
                    "machine learning",
                ];
            }

            const foundSkills = requiredSkills.filter((skill) =>
                resumeText.includes(skill.toLowerCase())
            );

            const missingSkills = requiredSkills.filter(
                (skill) => !resumeText.includes(skill.toLowerCase())
            );

            const suggestions = [
                missingSkills.length > 0
                    ? `Add evidence of these skills if you have used them: ${missingSkills.join(
                        ", "
                    )}.`
                    : "Your resume covers the main skills for this target role.",
                resumeText.includes("project")
                    ? "Strengthen project descriptions with measurable results and technologies used."
                    : "Add 2–3 relevant projects with your contribution, tools and outcomes.",
                resumeText.includes("experience")
                    ? "Use action verbs and measurable outcomes in your experience section."
                    : "Add internship, project or practical experience details.",
                resumeText.includes("github")
                    ? "Keep your GitHub projects relevant and link to your strongest repositories."
                    : "Consider adding a GitHub profile or links to relevant projects.",
            ];

            const analysisResult = {
                targetCompany: resume.target_company,
                targetRole: resume.target_role,
                foundSkills,
                missingSkills,
                suggestions,
                analyzedAt: new Date().toISOString(),
            };

            await db.query(
                `
        UPDATE resumes
        SET analysis_result = ?
        WHERE id = ?
          AND user_id = ?
        `,
                [JSON.stringify(analysisResult), resumeId, userId]
            );

            return res.status(200).json({
                success: true,
                message: "Resume analyzed successfully",
                data: analysisResult,
            });
        } catch (error) {
            console.error("Resume analysis error:", error);

            return res.status(500).json({
                success: false,
                message: "Failed to analyze resume",
            });
        }
    }
);

export default router;