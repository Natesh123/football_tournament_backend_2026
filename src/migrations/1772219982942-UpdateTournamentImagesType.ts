import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateTournamentImagesType1772219982942 implements MigrationInterface {
    name = 'UpdateTournamentImagesType1772219982942'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`tournament\` CHANGE \`logo\` \`logo\` longtext NULL`);
        await queryRunner.query(`ALTER TABLE \`tournament\` CHANGE \`coverImage\` \`coverImage\` longtext NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`tournament\` CHANGE \`coverImage\` \`coverImage\` text NULL`);
        await queryRunner.query(`ALTER TABLE \`tournament\` CHANGE \`logo\` \`logo\` text NULL`);
    }

}
