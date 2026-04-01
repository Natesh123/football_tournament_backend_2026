import { MigrationInterface, QueryRunner } from "typeorm";

export class AddLiveStreamLink1780000000003 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`tournament_presentation\` ADD COLUMN IF NOT EXISTS \`live_stream_link\` varchar(255) NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`tournament_presentation\` DROP COLUMN IF EXISTS \`live_stream_link\``);
    }
}
