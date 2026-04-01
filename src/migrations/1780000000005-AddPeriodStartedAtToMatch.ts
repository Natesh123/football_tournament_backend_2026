import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPeriodStartedAtToMatch1780000000005 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`match\` ADD \`periodStartedAt\` datetime NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`match\` DROP COLUMN \`periodStartedAt\``);
    }
}
