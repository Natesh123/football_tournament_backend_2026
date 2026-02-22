// @ts-ignore
import bcrypt from "bcrypt";
import { AppDataSource } from "../../config/data-source";
import { User } from "../../entities/user.entity";
import { UserOtp } from "../../entities/otp.entity";
import { generateOTP } from "../../utils/otp.util";
import { generateToken, verifyToken } from "../../utils/jwt.util";
import { sendOTP } from "../../utils/email.util";
import { Permission } from "../../entities/permission.entity";

export async function registerUser(email: string, password: string, user_name: string, phone_number: string) {
    const userRepo = AppDataSource.getRepository(User);
    const otpRepo = AppDataSource.getRepository(UserOtp);

    const existingEmail = await userRepo.findOne({ where: { email } });
    if (existingEmail) throw new Error("User already exists (email)");

    const existingUserName = await userRepo.findOne({ where: { user_name } });
    if (existingUserName) throw new Error("User already exists (user_name)");

    const hashed = await bcrypt.hash(password, 10);

    // @ts-ignore
    const user = userRepo.create({ email, password: hashed, user_name, phone_number, state: 1 });
    await userRepo.save(user);

    const otp = generateOTP();

    await otpRepo.save({
        user_id: user.id,
        otp,
        expires_at: new Date(Date.now() + 5 * 60000)
    });

    // Send OTP via email
    await sendOTP(email, otp, "registration");

    return { message: "OTP sent to email" };
}

export async function verifyOtp(email: string, otp: string) {
    const userRepo = AppDataSource.getRepository(User);
    const otpRepo = AppDataSource.getRepository(UserOtp);

    const user = await userRepo.findOne({ where: { email } });
    if (!user) throw new Error("User not found");

    const otpRow = await otpRepo.findOne({
        where: {
            user_id: user.id,
            otp,
            is_used: false
        }
    });

    if (!otpRow) throw new Error("Invalid OTP");
    if (new Date() > otpRow.expires_at) throw new Error("OTP expired");

    // mark verified
    user.is_verified = true;
    await userRepo.save(user);

    const permRepo = AppDataSource.getRepository(Permission);
    const permissions = await permRepo.findOne({ where: { roleId: user.roleId || 0 } });

    const token = generateToken({
        id: user.id,
        email: user.email,
        user_name: user.user_name,
        role: user.userRole?.name || 'user',
        permissions
    });

    return {
        message: "OTP verified",
        token,
        user: {
            id: user.id,
            email: user.email,
            user_name: user.user_name,
            role: user.userRole?.name || 'user',
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
                permissions
            }
        };
    } catch (err) {
        throw new Error("Invalid token");
    }
}

export async function resendOtpService(email: string) {
    const userRepo = AppDataSource.getRepository(User);
    const otpRepo = AppDataSource.getRepository(UserOtp);

    const user = await userRepo.findOne({ where: { email } });
    if (!user) throw new Error("User not found");

    // Generate new OTP
    const otp = generateOTP();

    // Save new OTP
    await otpRepo.save({
        user_id: user.id,
        otp,
        expires_at: new Date(Date.now() + 5 * 60000)
    });

    // Send OTP via email
    const otpType = user.is_verified ? "login" : "registration";
    await sendOTP(email, otp, otpType);

    return { message: "OTP resent successfully" };
}

