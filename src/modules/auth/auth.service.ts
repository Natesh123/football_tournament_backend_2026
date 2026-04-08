// @ts-ignore
import bcrypt from "bcrypt";
import { AppDataSource } from "../../config/data-source";
import { User } from "../../entities/user.entity";
import { UserOtp } from "../../entities/otp.entity";
import { PendingUser } from "../../entities/pending_user.entity";
import { generateOTP } from "../../utils/otp.util";
import { generateToken, verifyToken } from "../../utils/jwt.util";
import { sendOTP } from "../../utils/email.util";
import { Permission } from "../../entities/permission.entity";

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

    // Create the actual user
    // @ts-ignore
    const user = userRepo.create({
        email: pendingUser.email,
        password: pendingUser.password,
        user_name: pendingUser.user_name,
        phone_number: pendingUser.phone_number,
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
            role: user.userRole?.name || 'user',
            roleId: user.roleId,
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
        throw new Error("Invalid password");
    }
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
        message: "Login successful",
        token,
        user: {
            id: user.id,
            email: user.email,
            user_name: user.user_name,
            role: user.userRole?.name || 'user',
            roleId: user.roleId,
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
        const permissions = await permRepo.findOne({ where: { roleId: user.roleId || 0 } });

        return {
            valid: true,
            user: {
                id: user.id,
                email: user.email,
                user_name: user.user_name,
                role: user.userRole?.name || 'user',
                roleId: user.roleId,
                permissions
            }
        };
    } catch (err) {
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

