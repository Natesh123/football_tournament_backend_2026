import nodemailer from "nodemailer";
import * as dotenv from "dotenv";

dotenv.config();

/**
 * STANDALONE SMTP TEST SCRIPT
 * 
 * Instructions:
 * 1. Ensure your .env file has SMTP_USER and SMTP_PASS.
 * 2. Run this script: npx ts-node test-smtp.ts
 */

const testSMTP = async () => {
    console.log("--- SMTP Configuration Test ---");
    const user = (process.env.SMTP_USER || "").trim();
    const pass = (process.env.SMTP_PASS || "").trim();
    const host = (process.env.SMTP_HOST || "smtp.gmail.com").trim();
    const port = (process.env.SMTP_PORT || "587").trim();

    console.log(`User: ${user}`);
    console.log(`Host: ${host}`);
    console.log(`Port: ${port}`);

    if (!user || !pass) {
        console.error("ERROR: SMTP_USER or SMTP_PASS is missing in .env");
        return;
    }

    if (pass.length !== 16) {
        console.warn("WARNING: SMTP_PASS is not 16 characters long. Google App Passwords are usually exactly 16 characters.");
    }

    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: user,
            pass: pass,
        },
    });

    try {
        console.log("Attempting to verify transporter...");
        await transporter.verify();
        console.log("SUCCESS: SMTP connection verified!");

        console.log("Attempting to send test email...");
        const info = await transporter.sendMail({
            from: `"SMTP Test" <${process.env.SMTP_USER}>`,
            to: process.env.SMTP_USER, // Send to self
            subject: "Football Tournament SMTP Test",
            text: "This is a test email from your Football Tournament backend.",
        });
        console.log("SUCCESS: Test email sent! MessageID:", info.messageId);
    } catch (error: any) {
        console.error("FAILED: SMTP Error encountered:");
        console.error(error.message);

        if (error.message.includes('535')) {
            console.error("\n--- FIXING THE ISSUE ---");
            console.error("1. Go to: https://myaccount.google.com/apppasswords");
            console.error("2. Log in and select 'Mail' and 'Other' (e.g. 'Football App').");
            console.error("3. Generate a 16-character code.");
            console.error("4. Copy that code into SMTP_PASS in your .env file (remove spaces).");
            console.error("--------------------------\n");
        }
    }
};

testSMTP();
