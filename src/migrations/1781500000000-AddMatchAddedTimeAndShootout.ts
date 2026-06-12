import { MigrationInterface, QueryRunner } from "typeorm";

export class AddMatchAddedTimeAndShootout1781500000000 implements MigrationInterface {
    name = 'AddMatchAddedTimeAndShootout1781500000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Referee added/stoppage time (minutes) for the current live period
        await queryRunner.query(`ALTER TABLE \`match\` ADD \`addedMinutes\` tinyint UNSIGNED NULL`);
        // Penalty shootout kick log (kept out of match_events so it never alters the score)
        await queryRunner.query(`ALTER TABLE \`match\` ADD \`penaltyShootout\` json NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`match\` DROP COLUMN \`penaltyShootout\``);
        await queryRunner.query(`ALTER TABLE \`match\` DROP COLUMN \`addedMinutes\``);
    }
}
