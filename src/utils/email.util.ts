// @ts-ignore
import nodemailer from "nodemailer";
import * as dotenv from "dotenv";

dotenv.config();

// ── Sender identity ─────────────────────────────────────────────────────────
// Deliverability note: the biggest reason transactional mail lands in spam is a
// From address that isn't aligned/authenticated, or a brand name that keeps
// changing between messages from the same mailbox (looks like spoofing).
//
//  • Keep ONE brand name across every email  -> MAIL_FROM_NAME
//  • Keep the From address equal to the authenticated SMTP mailbox (or a verified
//    alias on the same domain) so SPF/DKIM/DMARC stay aligned -> MAIL_FROM_ADDRESS
//
// When you move off a personal @gmail.com sender to your own domain, you only
// change these env vars — no code change needed.
const MAIL_FROM_NAME = (process.env.MAIL_FROM_NAME || "ATB Sports").trim();
const MAIL_FROM_ADDRESS = (process.env.MAIL_FROM_ADDRESS || process.env.SMTP_USER || "").trim();
const MAIL_REPLY_TO = (process.env.MAIL_REPLY_TO || MAIL_FROM_ADDRESS).trim();
const DEFAULT_FROM = () => `"${MAIL_FROM_NAME}" <${MAIL_FROM_ADDRESS}>`;

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

    // Optional DKIM signing. Only kicks in when you send from a domain you own and
    // have published the matching DKIM public key in DNS. With Gmail SMTP this is
    // unnecessary (Google signs outbound for gmail.com), so it stays off unless the
    // DKIM_* env vars are set. Private key can be inline (escaped \n) or a PEM.
    const dkimDomain = (process.env.DKIM_DOMAIN || "").trim();
    const dkimSelector = (process.env.DKIM_SELECTOR || "").trim();
    const dkimKey = (process.env.DKIM_PRIVATE_KEY || "").trim();
    if (dkimDomain && dkimSelector && dkimKey) {
        config.dkim = {
            domainName: dkimDomain,
            keySelector: dkimSelector,
            privateKey: dkimKey.replace(/\\n/g, "\n"),
        };
        console.log(`[SMTP] DKIM signing enabled (${dkimSelector}._domainkey.${dkimDomain})`);
    }

    return nodemailer.createTransport(config);
};

let transporter = getTransporter();

/**
 * Central sender. Guarantees every message has:
 *  - a consistent, authenticated-aligned From + Reply-To
 *  - BOTH a plaintext and an HTML part (HTML-only mail scores as spam)
 *  - transactional headers that hint "this is an automated 1:1 message"
 *
 * Falls back to console logging (matching the previous behaviour) when SMTP is
 * not configured or the send fails.
 */
async function deliver(
    opts: { to: string; subject: string; text: string; html: string; from?: string; replyTo?: string },
    onFallback: () => void
): Promise<{ success: boolean; messageId?: string; error?: string; message?: string; warning?: string }> {
    if (!transporter) {
        onFallback();
        return { success: true, message: "Logged to console (SMTP not configured)", warning: "SMTP not configured" };
    }

    try {
        const info = await transporter.sendMail({
            from: opts.from || DEFAULT_FROM(),
            to: opts.to,
            replyTo: opts.replyTo || MAIL_REPLY_TO,
            subject: opts.subject,
            text: opts.text,
            html: opts.html,
            headers: {
                // Signals an automatically generated, user-triggered transactional
                // message (not bulk marketing) and suppresses auto-responders.
                "Auto-Submitted": "auto-generated",
                "X-Auto-Response-Suppress": "All",
            },
        });
        return { success: true, messageId: info.messageId };
    } catch (error: any) {
        const msg = error?.message || String(error);
        if (msg.includes('535') || msg.includes('Username and Password not accepted')) {
            console.error("\n[SMTP ERROR] Authentication failed! This is likely due to an incorrect Google App Password.");
            console.error("Please ensure you are using a 16-character App Password, NOT your regular account password.");
            console.error("Link: https://myaccount.google.com/apppasswords\n");
        }
        onFallback();
        return { success: false, error: msg };
    }
}

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
        ? `Verify your registration — ${MAIL_FROM_NAME}`
        : `Your login verification code — ${MAIL_FROM_NAME}`;

    const intro = type === "registration"
        ? `Welcome to ${MAIL_FROM_NAME}!`
        : `You're logging in to ${MAIL_FROM_NAME}.`;

    const text =
        `${intro}\n\n` +
        `Your verification code is: ${otp}\n\n` +
        `This code will expire in 5 minutes.\n\n` +
        `If you didn't request this code, you can safely ignore this email.`;

    const html = `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #667eea;">${subject}</h2>
            <p style="font-size: 16px; color: #333;">${intro}</p>
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
    `;

    return deliver({ to: email, subject, text, html }, () => {
        console.warn(`\n[SMTP WARNING] OTP Email for ${email} was NOT sent because SMTP is not configured.`);
        console.warn(`[SMTP WARNING] Check your .env file and set a valid SMTP_PASS.`);
        console.log(`\n=== OTP EMAIL LOGGING (${type.toUpperCase()}) ===`);
        console.log(`To: ${email}`);
        console.log(`OTP: ${otp}`);
        console.log(`===========================\n`);
    });
}

export async function sendPasswordResetOtp(email: string, otp: string) {
    const subject = `Password reset code — ${MAIL_FROM_NAME}`;

    const text =
        `You requested to reset your ${MAIL_FROM_NAME} password.\n\n` +
        `Your password reset code is: ${otp}\n\n` +
        `This code will expire in 5 minutes.\n\n` +
        `If you didn't request this, you can safely ignore this email.`;

    const html = `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #667eea;">${subject}</h2>
            <p style="font-size: 16px; color: #333;">
                You requested to reset your ${MAIL_FROM_NAME} password.
            </p>
            <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; font-size: 14px; color: #666;">Your password reset code is:</p>
                <h1 style="margin: 10px 0; color: #667eea; font-size: 32px; letter-spacing: 5px;">${otp}</h1>
            </div>
            <p style="font-size: 14px; color: #666;">
                This code will expire in 5 minutes.
            </p>
            <p style="font-size: 12px; color: #999; margin-top: 30px;">
                If you didn't request this code, please ignore this email.
            </p>
        </div>
    `;

    return deliver({ to: email, subject, text, html }, () => {
        console.warn(`\n[SMTP WARNING] Password reset OTP for ${email} was NOT sent because SMTP is not configured.`);
        console.log(`\n=== PASSWORD RESET OTP LOGGING ===`);
        console.log(`To: ${email}`);
        console.log(`OTP: ${otp}`);
        console.log(`==================================\n`);
    });
}

export async function sendPasswordEmail(email: string, password: string) {
    const subject = `Welcome to ${MAIL_FROM_NAME} — your account credentials`;
    const loginAt = process.env.FRONTEND_URL || 'the Admin Panel';

    const text =
        `Welcome to ${MAIL_FROM_NAME}! Your account has been created successfully.\n\n` +
        `Your temporary password is: ${password}\n\n` +
        `Login at: ${loginAt}\n` +
        `Please change your password immediately after your first login.\n` +
        `Do not share these credentials with anyone.`;

    const html = `
            <div style="background-color: #0c0c0c; color: #ffffff; padding: 40px; border: 1px solid #d4af37; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #d4af37; font-size: 28px; margin: 0; text-transform: uppercase; letter-spacing: 3px;">Account Created</h1>
                    <p style="color: #888; font-size: 14px; margin-top: 10px;">Welcome to the ${MAIL_FROM_NAME} Management System</p>
                </div>

                <div style="background: rgba(212, 175, 55, 0.05); border: 1px dashed rgba(212, 175, 55, 0.3); padding: 25px; border-radius: 12px; margin: 25px 0; text-align: center;">
                    <p style="margin: 0 0 10px 0; font-size: 12px; color: #aaa; text-transform: uppercase; letter-spacing: 1px;">Your temporary password is:</p>
                    <h2 style="margin: 0; color: #d4af37; font-size: 32px; font-family: 'Courier New', monospace; letter-spacing: 5px;">${password}</h2>
                </div>

                <ul style="color: #ccc; font-size: 14px; padding-left: 20px; line-height: 1.6;">
                    <li>Login at: <span style="color: #d4af37;">${loginAt}</span></li>
                    <li>Please change your password immediately after your first login.</li>
                    <li>Do not share these credentials with anyone.</li>
                </ul>

                <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #333; text-align: center;">
                    <p style="font-size: 11px; color: #555;">&copy; 2026 ${MAIL_FROM_NAME} Platform. All rights reserved.</p>
                </div>
            </div>
    `;

    return deliver({ to: email, subject, text, html }, () => {
        console.log(`\n=== PASSWORD EMAIL LOGGING ===`);
        console.log(`To: ${email}`);
        console.log(`Password: ${password}`);
        console.log(`==========================\n`);
    });
}

export async function sendPasswordResetEmail(email: string, resetLink: string) {
    const subject = `Password reset request — ${MAIL_FROM_NAME}`;

    const text =
        `You requested a password reset for your ${MAIL_FROM_NAME} account.\n\n` +
        `Open this link to set a new password (expires in 30 minutes):\n${resetLink}\n\n` +
        `If you did not request this, you can safely ignore this email.`;

    const html = `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0c0c0c;color:#fff;border:1px solid #d4af37;border-radius:12px;padding:32px;">
            <h2 style="color:#d4af37;margin-top:0;">Password Reset</h2>
            <p style="color:#ccc;font-size:15px;">You requested a password reset for your ${MAIL_FROM_NAME} account. Click the button below to set a new password. This link expires in 30 minutes.</p>
            <div style="text-align:center;margin:30px 0;">
                <a href="${resetLink}" style="display:inline-block;padding:14px 32px;background:#d4af37;color:#000;font-weight:bold;text-decoration:none;border-radius:10px;font-size:15px;">Reset My Password</a>
            </div>
            <p style="color:#888;font-size:13px;">If you did not request this, you can safely ignore this email.</p>
            <p style="font-size:11px;color:#555;margin-top:24px;">&copy; 2026 ${MAIL_FROM_NAME} Platform</p>
        </div>
    `;

    return deliver({ to: email, subject, text, html }, () => {
        console.log(`\n=== PASSWORD RESET LINK (SMTP not configured / failed) ===`);
        console.log(`To: ${email}`);
        console.log(`Link: ${resetLink}`);
        console.log(`=================================================\n`);
    });
}

export async function sendContactEmail(data: { name: string; email: string; subject: string; message: string }) {
    const adminEmail = process.env.SMTP_USER || process.env.CONTACT_EMAIL;
    const subject = `[${MAIL_FROM_NAME} Contact] ${data.subject}`;

    if (!transporter || !adminEmail) {
        console.log(`\n=== CONTACT FORM SUBMISSION ===`);
        console.log(`From: ${data.name} <${data.email}>`);
        console.log(`Subject: ${data.subject}`);
        console.log(`Message: ${data.message}`);
        console.log(`===============================\n`);
        return { success: true, message: "Logged to console (SMTP not configured)" };
    }

    const text =
        `New contact message\n\n` +
        `Name: ${data.name}\n` +
        `Email: ${data.email}\n` +
        `Subject: ${data.subject}\n\n` +
        `${data.message}`;

    const html = `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0c0c0c;color:#fff;border:1px solid #d4af37;border-radius:12px;padding:32px;">
            <h2 style="color:#d4af37;margin-top:0;">New Contact Message</h2>
            <table style="width:100%;border-collapse:collapse;font-size:14px;color:#ccc;">
                <tr><td style="padding:8px 0;color:#888;width:80px;">Name</td><td style="padding:8px 0;">${data.name}</td></tr>
                <tr><td style="padding:8px 0;color:#888;">Email</td><td style="padding:8px 0;"><a href="mailto:${data.email}" style="color:#d4af37;">${data.email}</a></td></tr>
                <tr><td style="padding:8px 0;color:#888;">Subject</td><td style="padding:8px 0;">${data.subject}</td></tr>
            </table>
            <div style="margin-top:20px;padding:16px;background:#1a1a1a;border-left:3px solid #d4af37;border-radius:4px;color:#ddd;white-space:pre-wrap;">${data.message}</div>
            <p style="font-size:11px;color:#555;margin-top:24px;">&copy; 2026 ${MAIL_FROM_NAME} Platform</p>
        </div>
    `;

    // Sent to the admin's own mailbox; reply should go to the person who wrote in.
    return deliver(
        { to: adminEmail, subject, text, html, from: `"${MAIL_FROM_NAME} Contact" <${adminEmail}>`, replyTo: data.email },
        () => {
            console.log(`\n=== CONTACT FORM SUBMISSION (send failed) ===`);
            console.log(`From: ${data.name} <${data.email}>`);
            console.log(`Subject: ${data.subject}`);
            console.log(`Message: ${data.message}`);
            console.log(`=============================================\n`);
        }
    );
}
