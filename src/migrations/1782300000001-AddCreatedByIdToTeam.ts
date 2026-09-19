import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCreatedByIdToTeam1782300000001 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        const hasColumn = await queryRunner.hasColumn("team", "createdById");
        if (!hasColumn) {
            await queryRunner.query(`ALTER TABLE \`team\` ADD COLUMN \`createdById\` int NULL;`);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const hasColumn = await queryRunner.hasColumn("team", "createdById");
        if (hasColumn) {
            await queryRunner.query(`ALTER TABLE \`team\` DROP COLUMN \`createdById\`;`);
        }
    }
}
