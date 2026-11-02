import { Router } from "express";
import db from "../db";
import { authenticateToken, AuthenticatedRequest } from "../middleware/authMiddleware";
import { analyzeGitHubProject } from "../githubProjectService";

const router = Router();

async function githubFetch(url: string, headers: Record<string, string>) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
        return await fetch(url, { headers, signal: controller.signal });
    } finally {
        clearTimeout(timeout);
    }
}

function parseGitHubUrl(value: string) {
    try {
        const url = new URL(value.trim());
        if (url.protocol !== "https:" || url.hostname.toLowerCase() !== "github.com") return null;
        const parts = url.pathname.split("/").filter(Boolean);
        if (parts.length < 2 || parts[0].startsWith(".") || parts[1].startsWith(".")) return null;
        const repoName = parts[1].replace(/\.git$/, "");
        if (!/^[A-Za-z0-9_.-]+$/.test(parts[0]) || !/^[A-Za-z0-9_.-]+$/.test(repoName)) return null;
        return { owner: parts[0], repoName, repoUrl: `https://github.com/${parts[0]}/${repoName}` };
    } catch { return null; }
}

router.get("/", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ success: false, message: "Authentication required" });
        const [rows] = await db.query(`
            SELECT p.id, p.repo_url, p.owner, p.repo_name, p.description,
                   p.primary_language, p.stars, p.forks, p.created_at,
                   a.overall_score, a.target_role, a.target_company, a.created_at AS analyzed_at
            FROM github_projects p
            LEFT JOIN github_project_analyses a ON a.id = (
                SELECT MAX(a2.id) FROM github_project_analyses a2 WHERE a2.project_id = p.id
            )
            WHERE p.user_id = ? ORDER BY p.updated_at DESC
        `, [userId]);
        return res.json({ success: true, data: rows });
    } catch (error) {
        console.error("GitHub projects list error:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch GitHub projects" });
    }
});

router.get("/:projectId/analysis", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
        const userId = req.user?.userId;
        const projectId = Number(req.params.projectId);
        if (!userId) return res.status(401).json({ success: false, message: "Authentication required" });
        if (!Number.isInteger(projectId) || projectId <= 0) return res.status(400).json({ success: false, message: "Invalid project ID" });

        const [rows] = await db.query(
            `SELECT a.* FROM github_project_analyses a
             INNER JOIN github_projects p ON p.id = a.project_id
             WHERE a.project_id = ? AND p.user_id = ?
             ORDER BY a.id DESC LIMIT 1`,
            [projectId, userId]
        );
        const row = (rows as { analysis_result: unknown }[])[0];
        if (!row) return res.status(404).json({ success: false, message: "No analysis found for this project" });

        const analysis = typeof row.analysis_result === "string" ? JSON.parse(row.analysis_result) : row.analysis_result;
        return res.json({ success: true, data: analysis });
    } catch (error) {
        console.error("GitHub project analysis fetch error:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch project analysis" });
    }
});

/**
 * @swagger
 * /api/github-projects/import:
 *   post:
 *     summary: Import a public GitHub repository
 *     tags: [GitHub Projects]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [repoUrl]
 *             properties:
 *               repoUrl:
 *                 type: string
 *                 example: https://github.com/octocat/Hello-World
 *     responses:
 *       201:
 *         description: Repository imported successfully
 *       400:
 *         description: Invalid repository URL
 *       404:
 *         description: Repository not found or not public
 */
router.post("/import", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
        const userId = req.user?.userId;
        const parsed = typeof req.body?.repoUrl === "string" ? parseGitHubUrl(req.body.repoUrl) : null;
        if (!userId) return res.status(401).json({ success: false, message: "Authentication required" });
        if (!parsed) return res.status(400).json({ success: false, message: "Enter a valid public GitHub repository URL" });

        const githubResponse = await fetch(`https://api.github.com/repos/${encodeURIComponent(parsed.owner)}/${encodeURIComponent(parsed.repoName)}`, {
            headers: { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "SmartPrep-Project-Analyzer" },
        });
        if (githubResponse.status === 404) return res.status(404).json({ success: false, message: "Public GitHub repository not found" });
        if (!githubResponse.ok) return res.status(502).json({ success: false, message: "GitHub could not be reached right now" });

        const repo = await githubResponse.json() as { owner: { login: string }; name: string; html_url: string; description: string | null; default_branch: string; language: string | null; stargazers_count: number; forks_count: number; private: boolean; };
        if (repo.private) return res.status(400).json({ success: false, message: "Only public repositories are supported" });

        const [existingRows] = await db.query("SELECT id FROM github_projects WHERE user_id = ? AND repo_url = ? LIMIT 1", [userId, parsed.repoUrl]);
        let projectId: number;
        if ((existingRows as { id: number }[]).length) {
            projectId = (existingRows as { id: number }[])[0].id;
            await db.query(`UPDATE github_projects SET description=?, default_branch=?, primary_language=?, stars=?, forks=?, repo_data=? WHERE id=?`, [repo.description, repo.default_branch, repo.language, repo.stargazers_count, repo.forks_count, JSON.stringify(repo), projectId]);
        } else {
            const [result] = await db.query(`INSERT INTO github_projects (user_id, repo_url, owner, repo_name, description, default_branch, primary_language, stars, forks, repo_data) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [userId, parsed.repoUrl, repo.owner.login, repo.name, repo.description, repo.default_branch, repo.language, repo.stargazers_count, repo.forks_count, JSON.stringify(repo)]);
            projectId = (result as { insertId: number }).insertId;
        }

        return res.status(201).json({ success: true, message: "GitHub repository imported successfully", data: { projectId, repoUrl: parsed.repoUrl, owner: repo.owner.login, repoName: repo.name, description: repo.description, defaultBranch: repo.default_branch, primaryLanguage: repo.language, stars: repo.stargazers_count, forks: repo.forks_count } });
    } catch (error) {
        console.error("GitHub project import error:", error);
        return res.status(500).json({ success: false, message: "Failed to import GitHub repository" });
    }
});

/**
 * @swagger
 * /api/github-projects/{projectId}/scan:
 *   get:
 *     summary: Scan safe public repository metadata for analysis
 *     tags: [GitHub Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema: { type: integer }
 */
router.get("/:projectId/scan", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
        const userId = req.user?.userId;
        const projectId = Number(req.params.projectId);
        if (!userId) return res.status(401).json({ success: false, message: "Authentication required" });
        if (!Number.isInteger(projectId) || projectId <= 0) return res.status(400).json({ success: false, message: "Invalid project ID" });

        const [rows] = await db.query("SELECT * FROM github_projects WHERE id = ? AND user_id = ? LIMIT 1", [projectId, userId]);
        const project = (rows as { owner: string; repo_name: string; default_branch: string | null; repo_data: unknown }[])[0];
        if (!project) return res.status(404).json({ success: false, message: "GitHub project not found" });

        const githubHeaders = { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "SmartPrep-Project-Analyzer" };
        const baseUrl = `https://api.github.com/repos/${encodeURIComponent(project.owner)}/${encodeURIComponent(project.repo_name)}`;
        const scanResults = await Promise.allSettled([
            githubFetch(`${baseUrl}/readme`, githubHeaders),
            githubFetch(`${baseUrl}/languages`, githubHeaders),
            githubFetch(`${baseUrl}/git/trees/${encodeURIComponent(project.default_branch || "main")}?recursive=1`, githubHeaders),
        ]);

        const readmeResponse = scanResults[0].status === "fulfilled" ? scanResults[0].value : null;
        const languagesResponse = scanResults[1].status === "fulfilled" ? scanResults[1].value : null;
        const treeResponse = scanResults[2].status === "fulfilled" ? scanResults[2].value : null;

        if ([readmeResponse, languagesResponse, treeResponse].some((response) => response?.status === 403)) return res.status(502).json({ success: false, message: "GitHub rate limit reached. Please wait and try again." });

        const readme = readmeResponse?.ok ? await readmeResponse.json() as { content?: string; encoding?: string } : null;
        const languages = languagesResponse?.ok ? await languagesResponse.json() as Record<string, number> : {};
        const tree = treeResponse?.ok ? await treeResponse.json() as { tree?: { path: string; type: string; size?: number }[] } : { tree: [] };
        const safeFiles = (tree.tree || []).filter((item) => !/(^|\/)(\.env|\.git|node_modules|uploads|dist|build)(\/|$)/i.test(item.path)).slice(0, 300);
        const scannedData = {
            readmeText: readme?.content ? Buffer.from(readme.content, "base64").toString("utf8").slice(0, 20000) : "",
            languages,
            files: safeFiles,
            scannedAt: new Date().toISOString(),
        };

        const existingData = typeof project.repo_data === "string" ? JSON.parse(project.repo_data) : (project.repo_data || {});
        await db.query("UPDATE github_projects SET repo_data = ? WHERE id = ? AND user_id = ?", [JSON.stringify({ ...(existingData as object), scan: scannedData }), projectId, userId]);

        return res.json({ success: true, message: "Repository scan completed", data: { projectId, languages, fileCount: safeFiles.length, readmeCharacters: scannedData.readmeText.length, files: safeFiles, warnings: [
            !readmeResponse?.ok ? "README was not available" : null,
            !languagesResponse?.ok ? "Language statistics were not available" : null,
            !treeResponse?.ok ? "File tree was not available" : null,
        ].filter(Boolean) } });
    } catch (error) {
        console.error("GitHub project scan error:", error);
        if (error instanceof Error && error.name === "AbortError") return res.status(504).json({ success: false, message: "GitHub scan timed out. Try again with a smaller repository." });
        return res.status(500).json({ success: false, message: "Failed to scan GitHub repository" });
    }
});

/**
 * @swagger
 * /api/github-projects/{projectId}/analyze:
 *   post:
 *     summary: Analyze an imported project for the student's target role
 *     tags: [GitHub Projects]
 *     security:
 *       - bearerAuth: []
 */
router.post("/:projectId/analyze", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
        const userId = req.user?.userId;
        const projectId = Number(req.params.projectId);
        const targetRole = typeof req.body?.targetRole === "string" ? req.body.targetRole.trim() : "Software Engineer";
        const targetCompany = typeof req.body?.targetCompany === "string" ? req.body.targetCompany.trim() || null : null;
        if (!userId) return res.status(401).json({ success: false, message: "Authentication required" });
        if (!Number.isInteger(projectId) || projectId <= 0) return res.status(400).json({ success: false, message: "Invalid project ID" });

        const [rows] = await db.query("SELECT * FROM github_projects WHERE id = ? AND user_id = ? LIMIT 1", [projectId, userId]);
        const project = (rows as { id: number; repo_data: unknown }[])[0];
        if (!project) return res.status(404).json({ success: false, message: "GitHub project not found" });

        const projectData = typeof project.repo_data === "string" ? JSON.parse(project.repo_data) : project.repo_data;
        const analysis = await analyzeGitHubProject({ project: projectData, targetCompany, targetRole });
        await db.query(`INSERT INTO github_project_analyses (project_id, target_role, target_company, overall_score, relevance_summary, detected_technologies, strengths, missing_skills, recommendations, next_project_ideas, interview_questions, analysis_result) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [projectId, targetRole, targetCompany, analysis.score, analysis.relevanceSummary, JSON.stringify(analysis.detectedTechnologies), JSON.stringify(analysis.strengths), JSON.stringify(analysis.missingSkills), JSON.stringify(analysis.recommendations), JSON.stringify(analysis.nextProjectIdeas), JSON.stringify(analysis.interviewQuestions), JSON.stringify(analysis)]);
        return res.status(201).json({ success: true, message: "GitHub project analyzed successfully", data: { projectId, targetRole, targetCompany, analysis } });
    } catch (error) {
        console.error("GitHub project analysis error:", error);
        const detail = error instanceof Error ? error.message : "Unknown analysis error";
        return res.status(502).json({ success: false, message: detail.slice(0, 500) });
    }
});

export default router;
