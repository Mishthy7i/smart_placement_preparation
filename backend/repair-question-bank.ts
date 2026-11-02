import fs from "node:fs";
import dotenv from "dotenv";
import mysql from "mysql2/promise";

dotenv.config();

async function main() {
const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

for (const fileName of ["question-bank-seed.sql", "question-explanations-backfill.sql", "mock-tests-seed.sql"]) {
    const sql = fs
        .readFileSync(fileName, "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/--.*$/gm, "");

    for (const statement of sql.split(";").map((item) => item.trim()).filter(Boolean)) {
        await connection.query(statement);
    }

    console.log(`Executed ${fileName}`);
}

const [rows] = await connection.query(
    `SELECT topic_id, difficulty, COUNT(*) AS total_questions,
            SUM(explanation IS NOT NULL AND TRIM(explanation) <> '') AS explained_questions
     FROM questions
     GROUP BY topic_id, difficulty
     ORDER BY topic_id, difficulty`
);

console.table(rows);
await connection.end();
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
