import { MigrationInterface, QueryRunner } from "typeorm";

export class AddShowRecentResults1780000000007 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`tournament_presentation\` ADD COLUMN IF NOT EXISTS \`show_recent_results\` tinyint NOT NULL DEFAULT 1`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`tournament_presentation\` DROP COLUMN IF EXISTS \`show_recent_results\``);
    }
}
