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

function adminModuleAccess() {
    return {
        can_dashboard: true,
        can_tournaments: true,
        can_teams: true,
        can_roles: true,
        can_permissions: true,
        can_users: true,
        can_settings: true,
        can_plans: true,
    };
}

/**
 * Fallback module access for a role that has no explicit Permission row yet.
 * Mirrors the seeded "user"/"organizer" defaults so a freshly registered account
 * can still reach at least the Tournaments module instead of being bounced back
 * to the login screen — which previously looked like an instant auto-logout right
 * after a successful login.
 */
function defaultModuleAccess(roleName?: string) {
    if ((roleName || "").toLowerCase() === "admin") return adminModuleAccess();
    return {
        can_dashboard: false,
        can_tournaments: true,
        can_teams: false,
        can_settings: false,
    };
}

/**
 * Resolves the effective permissions returned to the client. Admins always get
 * every module; everyone else gets their stored Permission row, or a sensible
 * default when none exists so no authenticated user ends up permission-less.
 */
function resolvePermissions(user: any, permissionRow: any) {
    const roleName = user?.userRole?.name;
    if (user?.roleId === 1 || (roleName || "").toLowerCase() === "admin") {
        return { module_access: adminModuleAccess() };
    }
    if (permissionRow && permissionRow.module_access) {
        return permissionRow;
    }
    return { module_access: defaultModuleAccess(roleName) };
}

export async function registerUser(email: string, password: string, user_name: string, phone_number: string, plan?: string) {
    const userRepo = AppDataSource.getRepository(User);
    const pendingRepo = AppDataSource.getRepository(PendingUser);

    const existingEmail = await userRepo.findOne({ where: { email } });
    if (existingEmail) throw new Error("User already exists with this email");

    const existingUserName = await userRepo.findOne({ where: { user_name } });
    if (existingUserName) throw new Error("User already exists with this username");

    const hashed = await bcrypt.hash(password, 10);
    const otp = generateOTP();
    const selectedPlan = plan || "Free";

    // Save or update pending registration
    let pendingUser = await pendingRepo.findOne({ where: { email } });
    if (pendingUser) {
        pendingUser.user_name = user_name;
        pendingUser.password = hashed;
        pendingUser.phone_number = phone_number;
        pendingUser.plan = selectedPlan;
        pendingUser.otp = otp;
        pendingUser.expires_at = new Date(Date.now() + 5 * 60000);
    } else {
        pendingUser = pendingRepo.create({
            email,
            user_name,
            password: hashed,
            phone_number,
            plan: selectedPlan,
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

    // Find the 'organizer' role (fallback to 'user' if not found)
    const roleRepo = AppDataSource.getRepository(UserRole);
    let assignedRole = await roleRepo.findOne({ where: [{ name: 'organizer' }, { name: 'Organizer' }] });
    if (!assignedRole) {
        assignedRole = await roleRepo.findOne({ where: [{ name: 'user' }, { name: 'User' }] });
    }

    const selectedPlan = (pendingUser.plan || "Free").trim();
    const isFreePlan = selectedPlan.toLowerCase() === "free";

    // Free plan organizers start in ACTIVE state (state 1) so they can log in immediately.
    const initialStatus = isFreePlan ? 1 : 1; // Set to active (1) for web registrations

    // @ts-ignore
    const user = userRepo.create({
        email: pendingUser.email,
        password: pendingUser.password,
        user_name: pendingUser.user_name,
        phone_number: pendingUser.phone_number,
        plan: selectedPlan,
        roleId: assignedRole ? assignedRole.id : undefined,
        state: initialStatus,
        is_verified: true
    });
    await userRepo.save(user);

    // Delete pending registration
    await pendingRepo.delete({ email });

    return {
        message: isFreePlan
            ? "Your organizer account has been created and activated successfully! You can now log in."
            : "Your account has been created successfully. You can now log in.",
        pendingApproval: false
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

    // Only Active accounts (state === 1) may log in. New registrations start
    // inactive and require manual admin approval.
    if (user.state !== 1) {
        const adminEmail = process.env.ADMIN_CONTACT_EMAIL || "admin@atbsports.com";
        const adminPhone = process.env.ADMIN_CONTACT_PHONE || "N/A";
        throw new Error(
            `Your account is awaiting admin approval. Please contact the administrator. Email: ${adminEmail} | Phone: ${adminPhone}`
        );
    }

    console.log(`[Login] Successful authentication for user ID: ${user.id}`);

    const permRepo = AppDataSource.getRepository(Permission);
    const permissionRow = await permRepo.findOne({ where: { roleId: user.roleId || 0 } });
    const permissions = resolvePermissions(user, permissionRow);

    const { planRestrictionService } = require("../plans/planRestriction.service");
    const planDetails = await planRestrictionService.getUserPlanInfo(user);

    const token = generateToken({
        id: user.id,
        email: user.email,
        user_name: user.user_name,
        role: user.userRole?.name || 'user',
        roleId: user.roleId,
        plan: user.plan || 'Free',
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
            plan: user.plan || 'Free',
            planDetails,
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
        const permissionRow = await permRepo.findOne({ where: { roleId: user.roleId || 0 } });
        const permissions = resolvePermissions(user, permissionRow);

        const { planRestrictionService } = require("../plans/planRestriction.service");
        const planDetails = await planRestrictionService.getUserPlanInfo(user);

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
                plan: user.plan || 'Free',
                planDetails,
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

