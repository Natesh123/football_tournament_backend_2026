import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdatePrizePoolColumns1781000000000 implements MigrationInterface {
    name = 'UpdatePrizePoolColumns1781000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        const safeQuery = async (query: string) => {
            try {
                await queryRunner.query(query);
            } catch (err: any) {
                if (err.code === 'ER_BAD_FIELD_ERROR' || err.message.includes('Unknown column')) {
                    console.log(`[SafeQuery] Ignoring expected error for query: ${query.substring(0, 50)}...`);
                } else {
                    throw err;
                }
            }
        };

        await safeQuery(`ALTER TABLE \`tournament_prize_pool\` CHANGE \`first_place_percent\` \`first_place_amount\` decimal(10,2) NOT NULL DEFAULT '0'`);
        await safeQuery(`ALTER TABLE \`tournament_prize_pool\` CHANGE \`second_place_percent\` \`second_place_amount\` decimal(10,2) NOT NULL DEFAULT '0'`);
        await safeQuery(`ALTER TABLE \`tournament_prize_pool\` CHANGE \`third_place_percent\` \`third_place_amount\` decimal(10,2) NOT NULL DEFAULT '0'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`tournament_prize_pool\` CHANGE \`first_place_amount\` \`first_place_percent\` int NOT NULL DEFAULT '50'`);
        await queryRunner.query(`ALTER TABLE \`tournament_prize_pool\` CHANGE \`second_place_amount\` \`second_place_percent\` int NOT NULL DEFAULT '30'`);
        await queryRunner.query(`ALTER TABLE \`tournament_prize_pool\` CHANGE \`third_place_amount\` \`third_place_percent\` int NOT NULL DEFAULT '20'`);
    }
}
