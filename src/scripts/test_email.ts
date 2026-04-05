import * as dotenv from "dotenv";
import { sendOTP } from "../utils/email.util";

dotenv.config();

/**
 * Script to test SMTP configuration from .env
 * usage: ts-node src/scripts/test_email.ts your-email@example.com
 */

async function test() {
    const email = process.argv[2] || process.env.SMTP_USER;
    if (!email) {
        console.error("Please provide an email to test: ts-node src/scripts/test_email.ts email@example.com");
        process.exit(1);
    }

    console.log(`\n--- SMTP TEST ---`);
    console.log(`SMTP_HOST: ${process.env.SMTP_HOST || "smtp.gmail.com"}`);
    console.log(`SMTP_USER: ${process.env.SMTP_USER}`);
    console.log(`Testing with email: ${email}`);
    console.log(`-----------------\n`);

    const result = await sendOTP(email, "123456", "registration");

    if (result.success) {
        console.log("\n✅ SUCCESS: Email sent successfully! Check your inbox.");
        console.log(`MessageId: ${result.messageId}`);
    } else {
        console.error("\n❌ FAILED: Could not send email.");
        console.error(`Error: ${result.error}`);
        console.log("\nIf you are using Gmail, please make sure you use an 'App Password':");
        console.log("1. Go to Google Account -> Security -> 2-Step Verification");
        console.log("2. Create an App Password and use that 16-character code in your .env SMTP_PASS.");
    }
}

test();
