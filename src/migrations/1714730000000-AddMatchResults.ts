import { MigrationInterface, QueryRunner } from "typeorm";

export class AddMatchResults1714730000000 implements MigrationInterface {
    name = 'AddMatchResults1714730000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`match\` ADD \`penaltyHome\` tinyint NULL`);
        await queryRunner.query(`ALTER TABLE \`match\` ADD \`penaltyAway\` tinyint NULL`);
        await queryRunner.query(`ALTER TABLE \`match\` ADD \`endPeriod\` enum ('ft', 'aet', 'pso') NOT NULL DEFAULT 'ft'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`match\` DROP COLUMN \`endPeriod\``);
        await queryRunner.query(`ALTER TABLE \`match\` DROP COLUMN \`penaltyAway\``);
        await queryRunner.query(`ALTER TABLE \`match\` DROP COLUMN \`penaltyHome\``);
    }
}
