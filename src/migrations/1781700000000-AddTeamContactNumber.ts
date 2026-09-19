import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTeamContactNumber1781700000000 implements MigrationInterface {
    name = 'AddTeamContactNumber1781700000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`team\` ADD \`contactNumber\` varchar(255) NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`team\` DROP COLUMN \`contactNumber\``);
    }
}
