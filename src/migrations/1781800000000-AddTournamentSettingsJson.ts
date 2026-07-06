import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Adds a generic `settings` JSON column to store wizard settings that have no
 * dedicated table — currently the schedule timing (match/half/break durations,
 * play days, time slots) and the wizard's completed-tab progress.
 */
export class AddTournamentSettingsJson1781800000000 implements MigrationInterface {
    name = 'AddTournamentSettingsJson1781800000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`tournament\` ADD \`settings\` json NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`tournament\` DROP COLUMN \`settings\``);
    }
}
