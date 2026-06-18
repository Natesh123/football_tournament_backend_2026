import { AppDataSource } from "../config/data-source";
import * as settingsService from "../modules/settings/settings.service";
import { User } from "../entities/user.entity";

async function run() {
    await AppDataSource.initialize();
    try {
        console.log("Creating a test role...");
        const role = await settingsService.createRole("RoleWithUser");
        console.log("Created role:", role.id);
        
        console.log("Creating a test user...");
        const userRepository = AppDataSource.getRepository(User);
        const user = userRepository.create({
            email: "testuser_" + Date.now() + "@example.com",
            user_name: "TestUser_" + Date.now(),
            phone_number: "1234567890",
            password: "hashedpassword",
            roleId: role.id,
            state: 1,
            is_verified: true
        });
        await userRepository.save(user);
        console.log("Created user with role ID:", user.roleId);

        console.log("Deleting role...");
        const result = await settingsService.deleteRole(role.id);
        console.log("Delete result:", result);
    } catch (e: any) {
        console.error("Error occurred:", e.message);
    } finally {
        await AppDataSource.destroy();
    }
}

run();
