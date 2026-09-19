import { MigrationInterface, QueryRunner } from "typeorm";

export class AddMatchBreaks1781700000000 implements MigrationInterface {
    name = 'AddMatchBreaks1781700000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Live-match break log: [{ type: 'break' | 'resume', minute, at }]
        await queryRunner.query(`ALTER TABLE \`match\` ADD \`breaks\` json NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`match\` DROP COLUMN \`breaks\``);
    }
}
