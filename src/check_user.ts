
import { AppDataSource } from "./config/data-source";
import { User } from "./entities/user.entity";

async function main() {
    try {
        await AppDataSource.initialize();
        console.log("Database connected");

        const email = "stapcvs@gmail.com";
        const userRepo = AppDataSource.getRepository(User);
        const user = await userRepo.findOne({ where: { email } });

        if (user) {
            console.log("User found in USER table:");
            console.log("ID:", user.id);
            console.log("Email:", user.email);
            console.log("Username:", user.user_name);
        } else {
            console.log("User not found in USER table.");
        }

        const { PendingUser } = require("./entities/pending_user.entity");
        const pendingRepo = AppDataSource.getRepository(PendingUser);
        const pending = await pendingRepo.findOne({ where: { email } });

        if (pending) {
            console.log("\nUser found in PENDING table (Awaiting OTP):");
            console.log("Email:", pending.email);
            console.log("OTP:", pending.otp);
            console.log("Expires At:", pending.expires_at);
        } else {
            console.log("\nUser not found in PENDING table.");
        }

    } catch (err) {
        console.error("Error:", err);
    } finally {
        await AppDataSource.destroy();
    }
}

main();
