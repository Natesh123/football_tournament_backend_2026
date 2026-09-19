import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTournamentReferees1781600000000 implements MigrationInterface {
    name = 'AddTournamentReferees1781600000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Tournament-level referee pool: [{ id, name, role, phone }]
        await queryRunner.query(`ALTER TABLE \`tournament\` ADD \`referees\` json NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`tournament\` DROP COLUMN \`referees\``);
    }
}
