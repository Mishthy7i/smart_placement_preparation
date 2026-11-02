import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import db from "./db";
import authRoutes from "./routes/authRoutes";
import topicsRoutes from "./routes/topicsRoutes";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./swagger";
import {
    authenticateToken,
    AuthenticatedRequest,
} from "./middleware/authMiddleware";
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use("/api/auth", authRoutes);
app.use("/api/topics", topicsRoutes);

app.get("/api/health", (_req, res) => {
    res.json({
        success: true,
        message: "Backend is running",
    });
});

app.get("/api/db-test", async (_req, res) => {
    try {
        const [rows] = await db.query("SELECT 1 AS result");

        res.json({
            success: true,
            message: "Database connected successfully",
            data: rows,
        });
    } catch (error) {
        console.error("Database connection failed:", error);

        res.status(500).json({
            success: false,
            message: "Database connection failed",
        });
    }
});
/**
 * @swagger
 * /api/protected-test:
 *   get:
 *     summary: Test a protected endpoint
 *     tags:
 *       - Authentication
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Authenticated successfully
 *       401:
 *         description: Authentication failed
 */
app.get(
    "/api/protected-test",
    authenticateToken,
    (req: AuthenticatedRequest, res) => {
        res.json({
            success: true,
            message: "You accessed a protected endpoint",
            user: req.user,
        });
    }
);


app.listen(PORT, () => {
    console.log(`Backend running on http://localhost:${PORT}`);
});