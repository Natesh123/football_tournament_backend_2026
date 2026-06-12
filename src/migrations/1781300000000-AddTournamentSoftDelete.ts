import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTournamentSoftDelete1781300000000 implements MigrationInterface {
    name = 'AddTournamentSoftDelete1781300000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`tournament\` ADD \`deletedAt\` datetime(6) NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`tournament\` DROP COLUMN \`deletedAt\``);
    }
}
