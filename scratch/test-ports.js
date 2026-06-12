const net = require('net');

const ports = [25, 465, 587];
const hosts = ['smtp.gmail.com', 'smtp.ionos.com'];

console.log("--- SMTP Port Connectivity Test ---");

async function checkPort(host, port) {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        const timeout = 5000;
        let status = 'CLOSED';

        socket.setTimeout(timeout);

        socket.on('connect', () => {
            status = 'OPEN';
            socket.destroy();
        });

        socket.on('timeout', () => {
            status = 'TIMEOUT';
            socket.destroy();
        });

        socket.on('error', (err) => {
            status = `ERROR (${err.code})`;
            socket.destroy();
        });

        socket.on('close', () => {
            console.log(`[${host}:${port}] ${status}`);
            resolve({ host, port, status });
        });

        socket.connect(port, host);
    });
}

async function runTests() {
    for (const host of hosts) {
        for (const port of ports) {
            await checkPort(host, port);
        }
        console.log("-------------------");
    }
}

runTests();
