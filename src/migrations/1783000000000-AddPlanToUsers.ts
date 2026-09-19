import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPlanToUsers1783000000000 implements MigrationInterface {
    name = "AddPlanToUsers1783000000000";

    public async up(queryRunner: QueryRunner): Promise<void> {
        const hasUserPlan = await queryRunner.hasColumn("users", "plan");
        if (!hasUserPlan) {
            await queryRunner.query(`ALTER TABLE \`users\` ADD COLUMN \`plan\` varchar(255) NULL DEFAULT 'Free'`);
        }

        const hasPendingUserPlan = await queryRunner.hasColumn("pending_users", "plan");
        if (!hasPendingUserPlan) {
            await queryRunner.query(`ALTER TABLE \`pending_users\` ADD COLUMN \`plan\` varchar(255) NULL DEFAULT 'Free'`);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const hasUserPlan = await queryRunner.hasColumn("users", "plan");
        if (hasUserPlan) {
            await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`plan\``);
        }

        const hasPendingUserPlan = await queryRunner.hasColumn("pending_users", "plan");
        if (hasPendingUserPlan) {
            await queryRunner.query(`ALTER TABLE \`pending_users\` DROP COLUMN \`plan\``);
        }
    }
}
