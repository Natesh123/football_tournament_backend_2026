import { verifySMTPConnection, sendOTP } from "../src/utils/email.util";
import * as dotenv from "dotenv";
import * as path from "path";

// Load .env from the parent directory
dotenv.config({ path: path.resolve(__dirname, "../.env") });

async function runTest() {
    console.log("--- SMTP CONFIGURATION TEST ---");
    console.log("User:", process.env.SMTP_USER);
    console.log("Host:", process.env.SMTP_HOST);
    console.log("Port:", process.env.SMTP_PORT);
    console.log("-------------------------------");

    const result = await verifySMTPConnection();
    
    if (result.success) {
        console.log("\n[SUCCESS] Connection to SMTP server established!");
        
        // Optional: Try sending a test OTP
        const testEmail = process.env.SMTP_USER; // Send to self
        if (testEmail) {
            console.log(`\nAttempting to send a test OTP to: ${testEmail}...`);
            const emailResult = await sendOTP(testEmail, "123456", "registration");
            if (emailResult.success) {
                console.log("[SUCCESS] Test email sent successfully! Please check your inbox (and spam folder).");
            } else {
                console.error("[FAILED] Could not send test email:", emailResult.error);
            }
        }
    } else {
        console.error("\n[FAILED] SMTP connection failed.");
        console.error("Reason:", result.error || result.message);
        console.log("\nTroubleshooting Tips:");
        console.log("1. Check if 'App Passwords' is enabled in Google Security.");
        console.log("2. Ensure the 16-character code is correct (no spaces).");
        console.log("3. If using 587, ensure secure: false (TLS). If using 465, use secure: true (SSL).");
    }
}

runTest();
