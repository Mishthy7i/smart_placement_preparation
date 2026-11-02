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

    const sql = fs.readFileSync("github-projects-schema.sql", "utf8");
    for (const statement of sql.split(";").map((item) => item.trim()).filter(Boolean)) {
        await connection.query(statement);
    }

    console.log("GitHub project tables created successfully.");
    await connection.end();
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
