const nodemailer = require('nodemailer');
const net = require('net');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function checkPort(host, port) {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        socket.setTimeout(2000);
        socket.on('connect', () => { socket.destroy(); resolve(true); });
        socket.on('timeout', () => { socket.destroy(); resolve(false); });
        socket.on('error', () => { socket.destroy(); resolve(false); });
        socket.connect(port, host);
    });
}

const testProductionSMTP = async () => {
    console.log("--- Production SMTP Verification Script ---");
    
    const user = (process.env.SMTP_USER || "").trim();
    const pass = (process.env.SMTP_PASS || "").replace(/\s/g, "");
    const host = (process.env.SMTP_HOST || "smtp.gmail.com").trim();
    const port = parseInt((process.env.SMTP_PORT || "465").trim());
    const secure = (process.env.SMTP_SECURE || "true").trim() === "true";

    console.log(`Config Loaded:`);
    console.log(`- Host: ${host}`);
    console.log(`- Port: ${port}`);
    console.log(`- Secure: ${secure}`);
    console.log(`- User: ${user}`);
    console.log(`- Pass length: ${pass.length} chars`);

    if (!user || !pass) {
        console.error("CRITICAL ERROR: SMTP_USER or SMTP_PASS is missing in .env");
        process.exit(1);
    }

    // 1. Check Port Connectivity
    console.log(`\n1. Checking connectivity to ${host}:${port}...`);
    const isPortOpen = await checkPort(host, port);
    if (!isPortOpen) {
        console.error(`FAILED: Could not connect to ${host}:${port}. This port might be blocked by IONOS.`);
        console.log("Tip: Try port 465 with secure: true or port 587 with secure: false.");
        process.exit(1);
    }
    console.log("SUCCESS: Port is open.");

    // 2. Initialize Transporter
    console.log("\n2. Initializing Nodemailer transporter...");
    const transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass },
        tls: { rejectUnauthorized: false },
        debug: true,
        logger: true
    });

    try {
        // 3. Verify Connection
        console.log("\n3. Verifying SMTP authentication...");
        await transporter.verify();
        console.log("SUCCESS: SMTP Authentication successful!");

        // 4. Send Test Email
        console.log("\n4. Sending test email to yourself...");
        const info = await transporter.sendMail({
            from: `"Production Test" <${user}>`,
            to: user,
            subject: "IONOS Production SMTP Test",
            text: "If you received this, your IONOS production email delivery is working correctly!",
            html: "<b>If you received this, your IONOS production email delivery is working correctly!</b>"
        });
        console.log("SUCCESS: Test email sent!");
        console.log("Message ID:", info.messageId);
        console.log("\n--- VERIFICATION COMPLETE ---");
    } catch (error) {
        console.error("\nFAILED: SMTP Error encountered:");
        console.error(error);
        
        if (error.message.includes('535')) {
            console.log("\nTIP: Authentication failed. If using Gmail, double check your 16-character App Password.");
            console.log("Link: https://myaccount.google.com/apppasswords");
        }
    }
};

testProductionSMTP();
