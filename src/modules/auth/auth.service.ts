// @ts-ignore
import bcrypt from "bcrypt";
import { AppDataSource } from "../../config/data-source";
import { User } from "../../entities/user.entity";
import { UserOtp } from "../../entities/otp.entity";
import { generateOTP } from "../../utils/otp.util";
import { generateToken } from "../../utils/jwt.util";
import { sendOTPEmail } from "../../utils/email.util";

export async function registerUser(email: string, password: string) {
    const userRepo = AppDataSource.getRepository(User);
    const otpRepo = AppDataSource.getRepository(UserOtp);

    const existing = await userRepo.findOne({ where: { email } });
    if (existing) throw new Error("User already exists");

    const hashed = await bcrypt.hash(password, 10);

    const user = userRepo.create({ email, password: hashed });
    await userRepo.save(user);

    const otp = generateOTP();

    await otpRepo.save({
        user_id: user.id,
        otp,
        expires_at: new Date(Date.now() + 5 * 60000)
    });

    // Send OTP via email
    await sendOTPEmail(email, otp, "registration");

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
        role: user.role
    });

    return { message: "OTP verified", token };
}

export async function loginUser(email: string, password: string) {
    const userRepo = AppDataSource.getRepository(User);
    const otpRepo = AppDataSource.getRepository(UserOtp);

    const user = await userRepo.findOne({ where: { email } });
    if (!user) throw new Error("User not found");

    const match = await bcrypt.compare(password, user.password);
    if (!match) throw new Error("Invalid password");

    if (!user.is_verified) throw new Error("User not verified");

    const otp = generateOTP();
    await otpRepo.save({
        user_id: user.id,
        otp,
        expires_at: new Date(Date.now() + 5 * 60000)
    });

    // Send OTP via email
    await sendOTPEmail(email, otp, "login");

    return { message: "OTP sent for login" };
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
    await sendOTPEmail(email, otp, otpType);

    return { message: "OTP resent successfully" };
}

