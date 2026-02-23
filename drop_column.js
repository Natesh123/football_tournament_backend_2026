const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE
    });

    try {
        console.log("Dropping column 'role' from 'users' table...");
        await connection.execute("ALTER TABLE users DROP COLUMN role");
        console.log("Column dropped successfully!");
    } catch (err) {
        console.error("Error dropping column (it might already be gone):", err.message);
    } finally {
        await connection.end();
    }
}

run();
