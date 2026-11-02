import { Router } from "express";
import db from "../db";
import { authenticateToken } from "../middleware/authMiddleware";

const router = Router();

/**
 * @swagger
 * /api/topics:
 *   get:
 *     summary: Get all preparation topics
 *     tags:
 *       - Topics
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Topics retrieved successfully
 *       401:
 *         description: Authentication token is required
 *       500:
 *         description: Server error
 */
router.get("/", authenticateToken, async (_req, res) => {
    try {
        const [rows] = await db.query(
            "SELECT id, name, description FROM topics ORDER BY name ASC"
        );

        res.status(200).json({
            success: true,
            data: rows,
        });
    } catch (error) {
        console.error("Topics error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to fetch topics",
        });
    }
});

export default router;