import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPitchesToVenues1780000000002 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`tournament_venues\` ADD COLUMN IF NOT EXISTS \`pitches\` json NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`tournament_venues\` DROP COLUMN IF EXISTS \`pitches\``);
    }
}
