// @ts-ignore
import bcrypt from "bcrypt";
import { AppDataSource } from "../../config/data-source";
import { User } from "../../entities/user.entity";
import { UserOtp } from "../../entities/otp.entity";
import { generateOTP } from "../../utils/otp.util";
import { generateToken, verifyToken } from "../../utils/jwt.util";
import { sendOTP } from "../../utils/email.util";

export async function registerUser(email: string, password: string, user_name: string, phone_number: string) {
    const userRepo = AppDataSource.getRepository(User);
    const otpRepo = AppDataSource.getRepository(UserOtp);

    const existingEmail = await userRepo.findOne({ where: { email } });
    if (existingEmail) throw new Error("User already exists (email)");

    const existingUserName = await userRepo.findOne({ where: { user_name } });
    if (existingUserName) throw new Error("User already exists (user_name)");

    const hashed = await bcrypt.hash(password, 10);

    const user = userRepo.create({ email, password: hashed, user_name, phone_number });
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

    // mark otp used
    otpRow.is_used = true;
    await otpRepo.save(otpRow);

    const token = generateToken({
        id: user.id,
        email: user.email,
        user_name: user.user_name,
        role: user.role
    });

    return {
        message: "OTP verified",
        token,
        user: {
            id: user.id,
            email: user.email,
            user_name: user.user_name,
            role: user.role
        }
    };
}

export async function loginUser(email: string, password: string) {
    const userRepo = AppDataSource.getRepository(User);
    const cleanEmail = email.trim();
    console.log(`[Login] Attempting login for email: '${cleanEmail}' (Original: '${email}')`);

    const user = await userRepo.findOne({ where: { email: cleanEmail } });
    if (!user) {
        console.log(`[Login] User not found for email: '${cleanEmail}'`);
        throw new Error("User not found");
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) throw new Error("Invalid password");

    if (!user.is_verified) throw new Error("User not verified");

    const token = generateToken({
        id: user.id,
        email: user.email,
        user_name: user.user_name,
        role: user.role
    });

    return {
        message: "Login successful",
        token,
        user: {
            id: user.id,
            email: user.email,
            user_name: user.user_name,
            role: user.role
        }
    };
}

export async function validateTokenService(token: string) {
    try {
        const decoded = verifyToken(token) as any;
        const userRepo = AppDataSource.getRepository(User);
        const user = await userRepo.findOne({ where: { id: decoded.id } });

        if (!user) throw new Error("User not found");

        return {
            valid: true,
            user: {
                id: user.id,
                email: user.email,
                user_name: user.user_name,
                role: user.role
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

