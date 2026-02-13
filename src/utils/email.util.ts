// @ts-ignore
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

export async function sendOTPEmail(email: string, otp: string, type: "registration" | "login") {
    const subject = type === "registration"
        ? "Verify Your Registration - Football Tournament"
        : "Login Verification Code - Football Tournament";

    const message = type === "registration"
        ? `Welcome! Your verification code is: ${otp}\n\nThis code will expire in 5 minutes.`
        : `Your login verification code is: ${otp}\n\nThis code will expire in 5 minutes.`;

    try {
        // If SMTP is not configured, log to console for development
        if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
            console.log(`\n=== OTP EMAIL (${type.toUpperCase()}) ===`);
            console.log(`To: ${email}`);
            console.log(`Subject: ${subject}`);
            console.log(`OTP: ${otp}`);
            console.log(`===========================\n`);
            return { success: true, message: "OTP logged to console (SMTP not configured)" };
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
        console.error("Email sending failed:", error);
        // Fallback to console log if email fails
        console.log(`\n=== OTP EMAIL FALLBACK (${type.toUpperCase()}) ===`);
        console.log(`To: ${email}`);
        console.log(`OTP: ${otp}`);
        console.log(`Error: ${error.message}`);
        console.log(`===========================\n`);
        return { success: false, error: error.message };
    }
}
