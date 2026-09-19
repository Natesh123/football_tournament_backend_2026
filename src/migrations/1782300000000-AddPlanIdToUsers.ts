import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Migration to add planId column to pending_users and users tables,
 * establishing a foreign key constraint to plans(id) and setting existing users to Starter (id=1).
 */
export class AddPlanIdToUsers1782300000000 implements MigrationInterface {
    name = "AddPlanIdToUsers1782300000000";

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add planId to pending_users
        const pendingHasPlanId = await queryRunner.hasColumn("pending_users", "planId");
        if (!pendingHasPlanId) {
            await queryRunner.query(`ALTER TABLE \`pending_users\` ADD COLUMN \`planId\` int NULL`);
        }

        // Add planId to users
        const usersHasPlanId = await queryRunner.hasColumn("users", "planId");
        if (!usersHasPlanId) {
            await queryRunner.query(`ALTER TABLE \`users\` ADD COLUMN \`planId\` int NULL`);
        }

        // Set existing users to Starter plan (id=1) if planId is null
        await queryRunner.query(`UPDATE \`users\` SET \`planId\` = 1 WHERE \`planId\` IS NULL`);

        // Add foreign key constraint if it doesn't exist
        try {
            await queryRunner.query(`
                ALTER TABLE \`users\`
                ADD CONSTRAINT \`FK_users_plans\`
                FOREIGN KEY (\`planId\`) REFERENCES \`plans\`(\`id\`)
                ON DELETE SET NULL ON UPDATE CASCADE
            `);
        } catch (e: any) {
            // Constraint might already exist, ignore duplicate constraint error
            console.log("FK_users_plans constraint notice:", e.message);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        try {
            await queryRunner.query(`ALTER TABLE \`users\` DROP FOREIGN KEY \`FK_users_plans\``);
        } catch (e) {}

        const usersHasPlanId = await queryRunner.hasColumn("users", "planId");
        if (usersHasPlanId) {
            await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`planId\``);
        }

        const pendingHasPlanId = await queryRunner.hasColumn("pending_users", "planId");
        if (pendingHasPlanId) {
            await queryRunner.query(`ALTER TABLE \`pending_users\` DROP COLUMN \`planId\``);
        }
    }
}
