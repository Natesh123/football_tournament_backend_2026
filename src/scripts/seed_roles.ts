import { AppDataSource } from "../config/data-source";
import { UserRole } from "../entities/role.entity";
import { Permission } from "../entities/permission.entity";

/**
 * Idempotently seeds the role + permission rows the multivendor model relies on.
 *
 * - `admin`     → full access to every module (the platform owner).
 * - `organizer` → manages only the tournaments they own (scoping is enforced
 *                 server-side by ownerId, not by module_access).
 * - `user`      → a freshly registered account, behaves like an organizer of
 *                 the tournaments they create.
 *
 * `admin` is seeded first so it tends to land on id = 1, the value the frontend
 * historically treats as "admin".
 */
const ROLES: { name: string; module_access: Record<string, boolean> }[] = [
    {
        name: "admin",
        module_access: {
            can_dashboard: true,
            can_tournaments: true,
            can_teams: true,
            can_settings: true,
        },
    },
    {
        name: "organizer",
        module_access: {
            can_dashboard: false,
            can_tournaments: true,
            can_teams: false,
            can_settings: false,
        },
    },
    {
        name: "user",
        module_access: {
            can_dashboard: false,
            can_tournaments: true,
            can_teams: false,
            can_settings: false,
        },
    },
];

async function seedRoles() {
    await AppDataSource.initialize();
    const roleRepo = AppDataSource.getRepository(UserRole);
    const permRepo = AppDataSource.getRepository(Permission);

    const existingRoles = await roleRepo.find();

    for (const def of ROLES) {
        // Match case-insensitively so we reuse pre-existing rows like
        // "Admin"/"Organizer" instead of creating lowercase duplicates.
        let role = existingRoles.find((r) => r.name.toLowerCase() === def.name.toLowerCase()) || null;
        if (!role) {
            role = await roleRepo.save(roleRepo.create({ name: def.name }));
            console.log(`Created role "${def.name}" (id=${role.id})`);
        } else {
            console.log(`Role "${def.name}" already exists (id=${role.id})`);
        }

        let perm = await permRepo.findOne({ where: { roleId: role.id } });
        if (!perm) {
            perm = permRepo.create({ roleId: role.id, module_access: def.module_access });
            await permRepo.save(perm);
            console.log(`  → seeded permissions for "${def.name}"`);
        } else {
            perm.module_access = def.module_access;
            await permRepo.save(perm);
            console.log(`  → updated permissions for "${def.name}"`);
        }
    }

    console.log("Role seeding complete.");
    await AppDataSource.destroy();
    process.exit(0);
}

seedRoles().catch(async (err) => {
    console.error("Role seeding failed:", err);
    process.exit(1);
});
