import { Router } from "express";
import { PDFParse } from "pdf-parse";
import * as mammothModule from "mammoth";
import db from "../db";
import {
    authenticateToken,
    AuthenticatedRequest,
} from "../middleware/authMiddleware";
import { resumeUpload } from "../config/upload";
import { analyzeResumeWithGemini } from "../geminiResumeService";

const router = Router();

const mammoth =
  (mammothModule as typeof mammothModule & {
    default?: typeof mammothModule;
  }).default ?? mammothModule;

const uploadResume = (req: any, res: any, next: any) => {
  resumeUpload.single("resume")(req, res, (error: unknown) => {
    if (error) {
      return res.status(400).json({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Invalid resume file",
      });
    }

    next();
  });
};

const resumeIndicators = [
  "resume",
  "curriculum vitae",
  "education",
  "experience",
  "skills",
  "projects",
  "internship",
  "certifications",
  "linkedin",
  "github",
];

const reportIndicators = [
  "abstract",
  "table of contents",
  "chapter 1",
  "chapter 2",
  "methodology",
  "literature review",
  "research objectives",
  "references",
  "bibliography",
];

function validateResumeText(text: string) {
  const normalizedText = text.toLowerCase();

  const foundResumeIndicators = resumeIndicators.filter((indicator) =>
    normalizedText.includes(indicator)
  );

  const foundReportIndicators = reportIndicators.filter((indicator) =>
    normalizedText.includes(indicator)
  );

  const hasContactInformation =
    /[\w.-]+@[\w.-]+\.\w+/.test(normalizedText) ||
    normalizedText.includes("phone") ||
    normalizedText.includes("mobile");

  const resumeScore =
    foundResumeIndicators.length + (hasContactInformation ? 2 : 0);

  const reportScore = foundReportIndicators.length;

  return {
    isLikelyResume:
      resumeScore >= 3 &&
      resumeScore > reportScore &&
      text.trim().length >= 250,
    resumeScore,
    reportScore,
    foundResumeIndicators,
    foundReportIndicators,
  };
}

type RoleRequirement = {
    skill_name: string;
    priority: "REQUIRED" | "PREFERRED";
};

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
 *               - targetRole
 *             properties:
 *               resume:
 *                 type: string
 *                 format: binary
 *               targetCompany:
 *                 type: string
 *                 example: Google
 *               targetRole:
 *                 type: string
 *                 example: Frontend Developer
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
    uploadResume,
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

      const validation = validateResumeText(extractedText);

      if (!validation.isLikelyResume) {
        return res.status(400).json({
          success: false,
          message:
            "This document does not appear to be a resume. Please upload a resume containing sections such as Skills, Education, Experience or Projects.",
          data: {
            resumeScore: validation.resumeScore,
            reportScore: validation.reportScore,
            detectedResumeIndicators: validation.foundResumeIndicators,
            detectedReportIndicators: validation.foundReportIndicators,
          },
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
 *     summary: Analyze a resume for a company and role
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
 *       400:
 *         description: Invalid resume ID
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

            if (process.env.GEMINI_API_KEY) {
                try {
                    const analysis = await analyzeResumeWithGemini({ resumeText: resume.extracted_text, targetCompany: resume.target_company, targetRole: resume.target_role });
                    const result = { ...analysis, targetCompany: resume.target_company, targetRole: resume.target_role, provider: "Google Gemini", analyzedAt: new Date().toISOString() };
                    await db.query("UPDATE resumes SET analysis_result = ? WHERE id = ? AND user_id = ?", [JSON.stringify(result), resumeId, userId]);
                    return res.status(200).json({ success: true, message: "Resume analyzed successfully with Gemini", data: result });
                } catch (geminiError) {
                    console.error("Gemini unavailable; using rule-based fallback:", geminiError);
                }
            }

            const resumeText = resume.extracted_text.toLowerCase();

            let requirements: RoleRequirement[] = [];

            if (resume.target_company) {
                const [requirementRows] = await db.query(
                    `
          SELECT
            skill_name,
            priority
          FROM role_requirements
          WHERE LOWER(company_name) = LOWER(?)
            AND LOWER(role_name) = LOWER(?)
          ORDER BY
            CASE
              WHEN priority = 'REQUIRED' THEN 1
              ELSE 2
            END,
            skill_name ASC
          `,
                    [resume.target_company, resume.target_role]
                );

                requirements = requirementRows as RoleRequirement[];
            }

            const requiredSkills =
                requirements.length > 0
                    ? requirements.map((requirement) => requirement.skill_name)
                    : [
                        "JavaScript",
                        "TypeScript",
                        "React",
                        "Node.js",
                        "SQL",
                        "Git",
                        "Data Structures",
                        "Algorithms",
                    ];

            const foundSkills = requiredSkills.filter((skill) =>
                resumeText.includes(skill.toLowerCase())
            );

            const missingSkills = requiredSkills.filter(
                (skill) => !resumeText.includes(skill.toLowerCase())
            );

            const suggestions = [
                requirements.length > 0
                    ? `This analysis is based on the ${resume.target_company} ${resume.target_role} requirement profile.`
                    : "No exact company-role profile was found, so general role requirements were used.",

                missingSkills.length > 0
                    ? `Add evidence of these skills if you have used them: ${missingSkills.join(
                        ", "
                    )}.`
                    : "Your resume covers the configured skills for this target role.",

                resumeText.includes("project")
                    ? "Strengthen project descriptions with measurable results and technologies used."
                    : "Add two or three relevant projects with your contribution, tools and outcomes.",

                resumeText.includes("experience")
                    ? "Use action verbs and measurable outcomes in your experience section."
                    : "Add internship, project or practical experience details.",

                resumeText.includes("education")
                    ? "Keep your education section concise and relevant to the target role."
                    : "Add your degree, institution and graduation details.",
            ];

            const analysisResult = {
                targetCompany: resume.target_company,
                targetRole: resume.target_role,
                matchedProfile: requirements.length > 0,
                requiredSkills,
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
