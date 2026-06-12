import { AppDataSource } from "../config/data-source";
import { User } from "../entities/user.entity";
import { UserRole } from "../entities/role.entity";

/**
 * Assigns a role to an existing user.
 *
 *   npm run promote -- <email> <admin|organizer|user>
 *
 * The role must already exist (run `npm run seed:roles` first).
 */
async function promoteUser() {
    const [email, roleName] = process.argv.slice(2);

    if (!email || !roleName) {
        console.error("Usage: npm run promote -- <email> <admin|organizer|user>");
        process.exit(1);
    }

    await AppDataSource.initialize();
    const userRepo = AppDataSource.getRepository(User);
    const roleRepo = AppDataSource.getRepository(UserRole);

    // Case-insensitive match so it works regardless of how roles were seeded
    // (e.g. existing "Admin"/"Organizer"/"Player" rows).
    const role = (await roleRepo.find()).find(
        (r) => r.name.toLowerCase() === roleName.toLowerCase()
    );
    if (!role) {
        console.error(`Role "${roleName}" not found. Run "npm run seed:roles" first.`);
        await AppDataSource.destroy();
        process.exit(1);
    }

    const user = await userRepo.findOne({ where: { email: email.trim() } });
    if (!user) {
        console.error(`User with email "${email}" not found.`);
        await AppDataSource.destroy();
        process.exit(1);
    }

    user.roleId = role.id;
    await userRepo.save(user);

    console.log(`User "${email}" is now "${roleName}" (roleId=${role.id}).`);
    await AppDataSource.destroy();
    process.exit(0);
}

promoteUser().catch((err) => {
    console.error("Promotion failed:", err);
    process.exit(1);
});
