import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdatePrizePoolColumns1781000000000 implements MigrationInterface {
    name = 'UpdatePrizePoolColumns1781000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable("tournament_prize_pool");
        if (!table) return;

        if (table.findColumnByName("first_place_percent")) {
            await queryRunner.query(`ALTER TABLE \`tournament_prize_pool\` CHANGE \`first_place_percent\` \`first_place_amount\` decimal(10,2) NOT NULL DEFAULT '0'`);
        }
        if (table.findColumnByName("second_place_percent")) {
            await queryRunner.query(`ALTER TABLE \`tournament_prize_pool\` CHANGE \`second_place_percent\` \`second_place_amount\` decimal(10,2) NOT NULL DEFAULT '0'`);
        }
        if (table.findColumnByName("third_place_percent")) {
            await queryRunner.query(`ALTER TABLE \`tournament_prize_pool\` CHANGE \`third_place_percent\` \`third_place_amount\` decimal(10,2) NOT NULL DEFAULT '0'`);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable("tournament_prize_pool");
        if (!table) return;

        if (table.findColumnByName("first_place_amount")) {
            await queryRunner.query(`ALTER TABLE \`tournament_prize_pool\` CHANGE \`first_place_amount\` \`first_place_percent\` int NOT NULL DEFAULT '50'`);
        }
        if (table.findColumnByName("second_place_amount")) {
            await queryRunner.query(`ALTER TABLE \`tournament_prize_pool\` CHANGE \`second_place_amount\` \`second_place_percent\` int NOT NULL DEFAULT '30'`);
        }
        if (table.findColumnByName("third_place_amount")) {
            await queryRunner.query(`ALTER TABLE \`tournament_prize_pool\` CHANGE \`third_place_amount\` \`third_place_percent\` int NOT NULL DEFAULT '20'`);
        }
    }
}
