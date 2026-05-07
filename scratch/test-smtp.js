const nodemailer = require('nodemailer');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const testSMTP = async () => {
    console.log("--- SMTP Configuration Test (JS) ---");
    const user = (process.env.SMTP_USER || "").trim();
    const pass = (process.env.SMTP_PASS || "").trim().replace(/\s/g, "");
    const host = (process.env.SMTP_HOST || "smtp.gmail.com").trim();
    const port = parseInt((process.env.SMTP_PORT || "465").trim());
    const secure = (process.env.SMTP_SECURE || "true").trim() === "true";

    console.log(`User: ${user}`);
    console.log(`Host: ${host}`);
    console.log(`Port: ${port}`);
    console.log(`Secure: ${secure}`);

    if (!user || !pass) {
        console.error("ERROR: SMTP_USER or SMTP_PASS is missing in .env");
        return;
    }

    // Explicit config test
    console.log("Using explicit configuration (no service optimization)");
    transportOptions = {
        host: host,
        port: port,
        secure: secure,
        auth: {
            user: user,
            pass: pass,
        },
        tls: {
            // Do not fail on invalid certs
            rejectUnauthorized: false
        }
    };

    const transporter = nodemailer.createTransport(transportOptions);

    try {
        console.log("Attempting to verify transporter...");
        await transporter.verify();
        console.log("SUCCESS: SMTP connection verified!");

        console.log("Attempting to send test email...");
        const info = await transporter.sendMail({
            from: `"SMTP Test" <${user}>`,
            to: user, // Send to self
            subject: "Football Tournament SMTP Test",
            text: "This is a test email from your Football Tournament backend.",
        });
        console.log("SUCCESS: Test email sent! MessageID:", info.messageId);
    } catch (error) {
        console.error("FAILED: SMTP Error encountered:");
        console.error(error);
    }
};

testSMTP();
