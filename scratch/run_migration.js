const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USERNAME || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_DATABASE || 'football_tournament',
        port: parseInt(process.env.DB_PORT || '3306')
    });

    console.log("Connected to MySQL DB. Applying migration...");

    try {
        const [pendingCols] = await connection.query(`SHOW COLUMNS FROM pending_users LIKE 'planId'`);
        if (pendingCols.length === 0) {
            await connection.query(`ALTER TABLE pending_users ADD COLUMN planId int NULL`);
            console.log("Added planId to pending_users table.");
        } else {
            console.log("pending_users already has planId column.");
        }

        const [usersCols] = await connection.query(`SHOW COLUMNS FROM users LIKE 'planId'`);
        if (usersCols.length === 0) {
            await connection.query(`ALTER TABLE users ADD COLUMN planId int NULL`);
            console.log("Added planId to users table.");
        } else {
            console.log("users already has planId column.");
        }

        await connection.query(`UPDATE users SET planId = 1 WHERE planId IS NULL`);
        console.log("Updated null planId values to 1 in users table.");

        try {
            await connection.query(`
                ALTER TABLE users
                ADD CONSTRAINT FK_users_plans
                FOREIGN KEY (planId) REFERENCES plans(id)
                ON DELETE SET NULL ON UPDATE CASCADE
            `);
            console.log("Added FK_users_plans constraint.");
        } catch (err) {
            console.log("FK constraint note:", err.message);
        }

        console.log("Migration executed successfully!");
    } catch (err) {
        console.error("Migration error:", err);
    } finally {
        await connection.end();
    }
}

run();
