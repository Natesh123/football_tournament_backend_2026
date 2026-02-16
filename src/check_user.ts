
import { AppDataSource } from "./config/data-source";
import { User } from "./entities/user.entity";

async function main() {
    try {
        await AppDataSource.initialize();
        console.log("Database connected");

        const email = "svigneshwaran673@gmail.com";
        const userRepo = AppDataSource.getRepository(User);
        const user = await userRepo.findOne({ where: { email } });

        if (user) {
            console.log("User found:");
            console.log("ID:", user.id);
            console.log("Email:", user.email);
            console.log("Username:", user.user_name);
            console.log("Phone:", user.phone_number);
        } else {
            console.log("User not found with email:", email);
        }

    } catch (err) {
        console.error("Error:", err);
    } finally {
        await AppDataSource.destroy();
    }
}

main();
