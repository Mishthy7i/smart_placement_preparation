import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import db from "./db";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

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

app.listen(PORT, () => {
    console.log(`Backend running on http://localhost:${PORT}`);
});