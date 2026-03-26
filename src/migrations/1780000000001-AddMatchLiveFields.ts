import { MigrationInterface, QueryRunner } from "typeorm";

export class AddMatchLiveFields1780000000001 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Drop columns safely if they somehow partially existed
        const table = await queryRunner.getTable("match");
        if (table && table.findColumnByName("live_minute")) {
            await queryRunner.query(`ALTER TABLE \`match\` DROP COLUMN \`live_minute\``);
        }
        if (table && table.findColumnByName("match_period")) {
            await queryRunner.query(`ALTER TABLE \`match\` DROP COLUMN \`match_period\``);
        }

        // Add columns using raw SQL to avoid any driver parsing ENUM issues
        await queryRunner.query(`ALTER TABLE \`match\` ADD \`live_minute\` tinyint NULL`);
        await queryRunner.query(`ALTER TABLE \`match\` ADD \`match_period\` enum('not_started', 'first_half', 'half_time', 'second_half', 'extra_time', 'penalties') NOT NULL DEFAULT 'not_started'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`match\` DROP COLUMN \`match_period\``);
        await queryRunner.query(`ALTER TABLE \`match\` DROP COLUMN \`live_minute\``);
    }
}
