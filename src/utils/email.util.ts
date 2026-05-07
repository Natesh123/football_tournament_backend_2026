// @ts-ignore
import nodemailer from "nodemailer";
import * as dotenv from "dotenv";

dotenv.config();

const getTransporter = () => {
    const user = (process.env.SMTP_USER || "").trim();
    const pass = (process.env.SMTP_PASS || "").replace(/\s/g, "");
    const host = (process.env.SMTP_HOST || "smtp.gmail.com").trim();
    const port = parseInt((process.env.SMTP_PORT || "465").trim());
    const secure = (process.env.SMTP_SECURE || "true").trim() === "true";
    const debug = process.env.SMTP_DEBUG === "true";

    // If SMTP is not fully configured, return null to signify console-only mode
    if (!user || !pass || pass === 'YOUR_APP_PASSWORD_HERE') {
        console.warn("[SMTP] Email credentials not configured. Emails will be logged to console only.");
        return null;
    }

    console.log(`[SMTP] Initializing with Host: ${host}, Port: ${port}, Secure: ${secure}, User: ${user}`);
    if (debug) console.log("[SMTP] Debug mode enabled");

    const config: any = {
        host,
        port,
        secure,
        pool: true, // Use pooling for production efficiency
        maxConnections: 5,
        maxMessages: 100,
        auth: {
            user,
            pass,
        },
        tls: {
            rejectUnauthorized: false // Better compatibility for some servers
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 30000,
        debug,
        logger: debug,
    };

    return nodemailer.createTransport(config);
};

let transporter = getTransporter();

/**
 * Verifies the SMTP connection
 */
export async function verifySMTPConnection() {
    if (!transporter) {
        return { success: false, message: "Transporter not initialized (check .env)" };
    }
    try {
        await transporter.verify();
        console.log("[SMTP] Connection verified successfully!");
        return { success: true };
    } catch (error: any) {
        console.error("[SMTP] Connection failed:", error.message);
        return { success: false, error: error.message };
    }
}

export async function sendOTP(email: string, otp: string, type: "registration" | "login") {
    const subject = type === "registration"
        ? "Verify Your Registration - Football Tournament"
        : "Login Verification Code - Football Tournament";

    const message = type === "registration"
        ? `Welcome! Your verification code is: ${otp}\n\nThis code will expire in 5 minutes.`
        : `Your login verification code is: ${otp}\n\nThis code will expire in 5 minutes.`;

    try {
        // If transporter is null, SMTP is not configured
        if (!transporter) {
            console.warn(`\n[SMTP WARNING] OTP Email for ${email} was NOT sent because SMTP is not configured.`);
            console.warn(`[SMTP WARNING] Check your .env file and set a valid SMTP_PASS.`);
            console.log(`\n=== OTP EMAIL LOGGING (${type.toUpperCase()}) ===`);
            console.log(`To: ${email}`);
            console.log(`OTP: ${otp}`);
            console.log(`===========================\n`);
            return { 
                success: true, 
                message: "Logged to console (SMTP not configured)",
                warning: "SMTP not configured" 
            };
        }

        const info = await transporter.sendMail({
            from: `"Football Tournament" <${process.env.SMTP_USER}>`,
            to: email,
            subject: subject,
            text: message,
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #667eea;">${subject}</h2>
                    <p style="font-size: 16px; color: #333;">
                        ${type === "registration" ? "Welcome to Football Tournament!" : "You're logging in to Football Tournament."}
                    </p>
                    <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <p style="margin: 0; font-size: 14px; color: #666;">Your verification code is:</p>
                        <h1 style="margin: 10px 0; color: #667eea; font-size: 32px; letter-spacing: 5px;">${otp}</h1>
                    </div>
                    <p style="font-size: 14px; color: #666;">
                        This code will expire in 5 minutes.
                    </p>
                    <p style="font-size: 12px; color: #999; margin-top: 30px;">
                        If you didn't request this code, please ignore this email.
                    </p>
                </div>
            `,
        });

        return { success: true, messageId: info.messageId };
    } catch (error: any) {
        if (error.message.includes('535') || error.message.includes('Username and Password not accepted')) {
            console.error("\n[SMTP ERROR] Authentication failed! This is likely due to an incorrect Google App Password.");
            console.error("Please ensure you are using a 16-character App Password, NOT your regular account password.");
            console.error("Link: https://myaccount.google.com/apppasswords\n");
        }

        // Fallback to console log if email fails
        console.log(`\n=== OTP EMAIL FALLBACK (${type.toUpperCase()}) ===`);
        console.log(`To: ${email}`);
        console.log(`OTP: ${otp}`);
        console.log(`Error: ${error.message}`);
        console.log(`===========================\n`);
        return { success: false, error: error.message };
    }
}

export async function sendPasswordEmail(email: string, password: string) {
    const subject = "Welcome to Football Tournament - Your Account Credentials";
    const message = `Welcome! Your account has been created successfully.\n\nYour login password is: ${password}\n\nPlease change your password after your first login.`;

    try {
        // If transporter is null, SMTP is not configured
        if (!transporter) {
            console.log(`\n=== PASSWORD EMAIL LOGGING ===`);
            console.log(`To: ${email}`);
            console.log(`Password: ${password}`);
            console.log(`==========================\n`);
            return { success: true, message: "Logged to console (SMTP not configured)" };
        }

        const info = await transporter.sendMail({
            from: `"Football Tournament" <${process.env.SMTP_USER}>`,
            to: email,
            subject: subject,
            text: message,
            html: `
                    <div style="background-color: #0c0c0c; color: #ffffff; padding: 40px; border: 1px solid #d4af37; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
                        <div style="text-align: center; margin-bottom: 30px;">
                            <h1 style="color: #d4af37; font-size: 28px; margin: 0; text-transform: uppercase; letter-spacing: 3px;">Account Created</h1>
                            <p style="color: #888; font-size: 14px; margin-top: 10px;">Welcome to the Football Tournament Management System</p>
                        </div>
                        
                        <div style="background: rgba(212, 175, 55, 0.05); border: 1px dashed rgba(212, 175, 55, 0.3); padding: 25px; border-radius: 12px; margin: 25px 0; text-align: center;">
                            <p style="margin: 0 0 10px 0; font-size: 12px; color: #aaa; text-transform: uppercase; letter-spacing: 1px;">Your temporary password is:</p>
                            <h2 style="margin: 0; color: #d4af37; font-size: 32px; font-family: 'Courier New', monospace; letter-spacing: 5px;">${password}</h2>
                        </div>

                        <ul style="color: #ccc; font-size: 14px; padding-left: 20px; line-height: 1.6;">
                            <li>Login at: <span style="color: #d4af37;">${process.env.FRONTEND_URL || 'Admin Panel'}</span></li>
                            <li>Please change your password immediately after your first login.</li>
                            <li>Do not share these credentials with anyone.</li>
                        </ul>

                        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #333; text-align: center;">
                            <p style="font-size: 11px; color: #555;">&copy; 2026 Football Tournament Platform. All rights reserved.</p>
                        </div>
                    </div>
            `,
        });

        return { success: true, messageId: info.messageId };
    } catch (error: any) {
        console.error("Password email sending failed:", error);
        console.log(`\n=== PASSWORD EMAIL FALLBACK ===`);
        console.log(`To: ${email}`);
        console.log(`Password: ${password}`);
        console.log(`Error: ${error.message}`);
        console.log(`===============================\n`);
        return { success: false, error: error.message };
    }
}
