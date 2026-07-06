// @ts-ignore
import bcrypt from "bcrypt";
import { AppDataSource } from "../../config/data-source";
import { User } from "../../entities/user.entity";
import { UserOtp } from "../../entities/otp.entity";
import { PendingUser } from "../../entities/pending_user.entity";
import { generateOTP } from "../../utils/otp.util";
import { generateToken, verifyToken } from "../../utils/jwt.util";
import { sendOTP, sendPasswordResetOtp } from "../../utils/email.util";
import { Permission } from "../../entities/permission.entity";
import { UserRole } from "../../entities/role.entity";

export async function registerUser(email: string, password: string, user_name: string, phone_number: string) {
    const userRepo = AppDataSource.getRepository(User);
    const pendingRepo = AppDataSource.getRepository(PendingUser);

    const existingEmail = await userRepo.findOne({ where: { email } });
    if (existingEmail) throw new Error("User already exists with this email");

    const existingUserName = await userRepo.findOne({ where: { user_name } });
    if (existingUserName) throw new Error("User already exists with this username");

    const hashed = await bcrypt.hash(password, 10);
    const otp = generateOTP();

    // Save or update pending registration
    let pendingUser = await pendingRepo.findOne({ where: { email } });
    if (pendingUser) {
        pendingUser.user_name = user_name;
        pendingUser.password = hashed;
        pendingUser.phone_number = phone_number;
        pendingUser.otp = otp;
        pendingUser.expires_at = new Date(Date.now() + 5 * 60000);
    } else {
        pendingUser = pendingRepo.create({
            email,
            user_name,
            password: hashed,
            phone_number,
            otp,
            expires_at: new Date(Date.now() + 5 * 60000)
        });
    }
    await pendingRepo.save(pendingUser);

    // Send OTP via email
    await sendOTP(email, otp, "registration");

    return { message: "OTP sent to email" };
}

export async function verifyOtp(email: string, otp: string) {
    const userRepo = AppDataSource.getRepository(User);
    const pendingRepo = AppDataSource.getRepository(PendingUser);

    const pendingUser = await pendingRepo.findOne({ where: { email } });
    if (!pendingUser) throw new Error("Registration session not found or expired");

    if (pendingUser.otp !== otp) throw new Error("Invalid OTP");
    if (new Date() > pendingUser.expires_at) throw new Error("OTP expired");

    // Find the 'user' role
    const roleRepo = AppDataSource.getRepository(UserRole);
    const userRole = await roleRepo.findOne({ where: { name: 'user' } });

    // Create the actual user
    // @ts-ignore
    const user = userRepo.create({
        email: pendingUser.email,
        password: pendingUser.password,
        user_name: pendingUser.user_name,
        phone_number: pendingUser.phone_number,
        roleId: userRole ? userRole.id : undefined,
        state: 1,
        is_verified: true
    });
    await userRepo.save(user);

    // Delete pending registration
    await pendingRepo.delete({ email });

    const permRepo = AppDataSource.getRepository(Permission);
    const permissions = await permRepo.findOne({ where: { roleId: user.roleId || 0 } });

    const token = generateToken({
        id: user.id,
        email: user.email,
        user_name: user.user_name,
        role: user.userRole?.name || 'user',
        roleId: user.roleId,
        permissions
    });

    return {
        message: "OTP verified, registration complete",
        token,
        user: {
            id: user.id,
            email: user.email,
            user_name: user.user_name,
            phone_number: user.phone_number,
            role: user.userRole?.name || 'user',
            roleId: user.roleId,
            state: user.state,
            permissions
        }
    };
}

export async function loginUser(email: string, password: string) {
    if (!email || !password) {
        throw new Error("Email and password are required");
    }
    const userRepo = AppDataSource.getRepository(User);
    const cleanEmail = email.trim();
    console.log(`[Login] Attempting login for email: '${cleanEmail}' (Original: '${email}')`);

    const user = await userRepo.findOne({
        where: { email: cleanEmail },
        relations: ["userRole"]
    });
    if (!user) {
        console.log(`[Login] User not found for email: '${cleanEmail}'`);
        throw new Error("User not found");
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
        console.warn(`[Login] Password mismatch for email: '${cleanEmail}'`);
        throw new Error("Invalid password");
    }
    console.log(`[Login] Successful authentication for user ID: ${user.id}`);

    const permRepo = AppDataSource.getRepository(Permission);
    let permissions: any = await permRepo.findOne({ where: { roleId: user.roleId || 0 } });

    // Requirement: If role_id = 1 (admin), then all modules should be visible
    if (user.roleId === 1) {
        permissions = {
            module_access: {
                can_dashboard: true,
                can_tournaments: true,
                can_teams: true,
                can_roles: true,
                can_permissions: true,
                can_users: true,
                can_settings: true
            }
        };
    }

    const token = generateToken({
        id: user.id,
        email: user.email,
        user_name: user.user_name,
        role: user.userRole?.name || 'user',
        roleId: user.roleId,
        permissions
    });

    return {
        message: "Login successful",
        token,
        user: {
            id: user.id,
            email: user.email,
            user_name: user.user_name,
            phone_number: user.phone_number,
            role: user.userRole?.name || 'user',
            roleId: user.roleId,
            state: user.state,
            permissions
        }
    };
}

export async function validateTokenService(token: string) {
    try {
        const decoded = verifyToken(token) as any;
        const userRepo = AppDataSource.getRepository(User);
        const user = await userRepo.findOne({
            where: { id: decoded.id },
            relations: ["userRole"]
        });

        if (!user) throw new Error("User not found");

        const permRepo = AppDataSource.getRepository(Permission);
        let permissions: any = await permRepo.findOne({ where: { roleId: user.roleId || 0 } });

        // Requirement: If role_id = 1 (admin), then all modules should be visible
        if (user.roleId === 1) {
            permissions = {
                module_access: {
                    can_dashboard: true,
                    can_tournaments: true,
                    can_teams: true,
                    can_roles: true,
                    can_permissions: true,
                    can_users: true,
                    can_settings: true
                }
            };
        }

        return {
            valid: true,
            user: {
                id: user.id,
                email: user.email,
                user_name: user.user_name,
                phone_number: user.phone_number,
                role: user.userRole?.name || 'user',
                roleId: user.roleId,
                state: user.state,
                permissions
            }
        };
    } catch (err: any) {
        console.error(`[Token Validation] Error for token: ${token.substring(0, 10)}... Error: ${err.message}`);
        throw new Error("Invalid token");
    }
}

export async function resendOtpService(email: string) {
    const pendingRepo = AppDataSource.getRepository(PendingUser);
    const userRepo = AppDataSource.getRepository(User);

    // Check if user is already registered and verified
    const user = await userRepo.findOne({ where: { email } });
    if (user && user.is_verified) {
        throw new Error("User is already registered and verified. Please login.");
    }

    const pendingUser = await pendingRepo.findOne({ where: { email } });
    if (!pendingUser) throw new Error("Registration session not found. Please register again.");

    // Generate new OTP
    const otp = generateOTP();

    // Update OTP
    pendingUser.otp = otp;
    pendingUser.expires_at = new Date(Date.now() + 5 * 60000);
    await pendingRepo.save(pendingUser);

    // Send OTP via email
    await sendOTP(email, otp, "registration");

    return { message: "OTP resent successfully" };
}

export async function requestPasswordReset(email: string) {
    const userRepo = AppDataSource.getRepository(User);
    const otpRepo = AppDataSource.getRepository(UserOtp);

    const user = await userRepo.findOne({ where: { email } });
    // Always return the same message to avoid email enumeration.
    if (!user) return { message: "If that email exists, a reset code has been sent." };

    // Generate a 6-digit OTP (same pattern as registration).
    const otp = generateOTP();

    // Invalidate any existing unused reset OTPs for this user.
    await otpRepo.delete({ user_id: user.id, is_used: false });

    const entry = otpRepo.create({
        user_id: user.id,
        otp,
        expires_at: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
        is_used: false,
    });
    await otpRepo.save(entry);

    await sendPasswordResetOtp(email, otp);

    return { message: "If that email exists, a reset code has been sent." };
}

/**
 * Find an active (unused, unexpired) reset OTP matching the email + code.
 * Returns the OTP entry, or null if no such active OTP exists.
 */
async function findActiveResetOtp(email: string, otp: string): Promise<UserOtp | null> {
    if (!email || !otp) return null;
    const userRepo = AppDataSource.getRepository(User);
    const otpRepo = AppDataSource.getRepository(UserOtp);

    const user = await userRepo.findOne({ where: { email } });
    if (!user) return null;

    const entry = await otpRepo.findOne({ where: { user_id: user.id, otp, is_used: false } });
    if (!entry) return null;
    if (entry.expires_at < new Date()) return null;
    return entry;
}

/**
 * Validate a reset OTP WITHOUT consuming it. Used by the clients to decide
 * whether to open the "set new password" form before the user submits.
 */
export async function verifyResetOtp(email: string, otp: string): Promise<{ valid: boolean }> {
    const entry = await findActiveResetOtp(email, otp);
    if (!entry) throw new Error("Invalid or expired OTP.");
    return { valid: true };
}

/**
 * Authoritative password strength rule shared by the reset flow:
 * min 8 chars, at least one uppercase, one lowercase, one number and one special character.
 */
export function isStrongPassword(password: string): boolean {
    if (typeof password !== "string" || password.length < 8) return false;
    return (
        /[A-Z]/.test(password) &&
        /[a-z]/.test(password) &&
        /[0-9]/.test(password) &&
        /[^A-Za-z0-9]/.test(password)
    );
}

export async function resetPassword(email: string, otp: string, newPassword: string) {
    const userRepo = AppDataSource.getRepository(User);
    const otpRepo = AppDataSource.getRepository(UserOtp);

    // Enforce the authoritative password policy server-side (clients also validate).
    if (!isStrongPassword(newPassword)) {
        throw new Error(
            "Password must be at least 8 characters and include uppercase, lowercase, a number and a special character."
        );
    }

    const entry = await findActiveResetOtp(email, otp);
    if (!entry) throw new Error("Invalid or expired OTP. Please request a new one.");

    const user = await userRepo.findOne({ where: { id: entry.user_id } });
    if (!user) throw new Error("User not found.");

    user.password = await bcrypt.hash(newPassword, 10);
    await userRepo.save(user);

    // Single-use: mark consumed, then remove every reset OTP for this user so no
    // stale code remains usable. NOTE: JWTs here are stateless (no session store), so
    // there are no server-side sessions to invalidate; a `tokenVersion` column would be
    // the future approach if forced logout-on-reset is required.
    entry.is_used = true;
    await otpRepo.save(entry);
    await otpRepo.delete({ user_id: user.id });

    return { message: "Password updated successfully." };
}

