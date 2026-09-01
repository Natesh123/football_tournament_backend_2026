const mysql = require('mysql2/promise');
require('dotenv').config();

async function main() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USERNAME || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_DATABASE || 'football_tournament',
        port: parseInt(process.env.DB_PORT || '3306')
    });

    const [rows] = await connection.execute('SELECT * FROM plans');
    console.log("PLANS:", JSON.stringify(rows, null, 2));

    await connection.end();
}

main().catch(console.error);
