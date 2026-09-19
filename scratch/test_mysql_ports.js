const mysql = require('mysql2/promise');

const configs = [
    { host: 'localhost', port: 3306, user: 'root', password: '' },
    { host: 'localhost', port: 3306, user: 'root', password: 'password' },
    { host: 'localhost', port: 3306, user: 'phpmyadmin', password: 'Dortmund@2106' },
    { host: 'localhost', port: 3306, user: 'root', password: 'root' }
];

async function testAll() {
    for (const cfg of configs) {
        try {
            console.log(`Testing config: user=${cfg.user} pass="${cfg.password}"`);
            const conn = await mysql.createConnection(cfg);
            console.log(`>>> SUCCESS CONNECTING WITH user=${cfg.user} pass="${cfg.password}"`);
            const [dbs] = await conn.query('SHOW DATABASES');
            console.log("Databases:", dbs.map(d => Object.values(d)[0]));
            await conn.end();
            return cfg;
        } catch (err) {
            console.log(`Failed user=${cfg.user} pass="${cfg.password}": code=${err.code} msg=${err.message}`);
        }
    }
}

testAll();
