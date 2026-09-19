import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Creates the `plans` table backing the subscription-plan module.
 * Idempotent so it is safe to run against environments that were rebuilt via
 * `synchronize` (where the table may already exist).
 */
export class CreatePlansTable1782000000000 implements MigrationInterface {
    name = "CreatePlansTable1782000000000";

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS \`plans\` (
                \`id\` int NOT NULL AUTO_INCREMENT,
                \`name\` varchar(255) NOT NULL,
                \`code\` varchar(255) NOT NULL,
                \`description\` text NULL,
                \`monthlyPrice\` decimal(10,2) NOT NULL DEFAULT '0.00',
                \`yearlyPrice\` decimal(10,2) NULL,
                \`maxTournaments\` int NOT NULL DEFAULT 0,
                \`maxTeams\` int NOT NULL DEFAULT 0,
                \`maxPlayers\` int NOT NULL DEFAULT 0,
                \`maxStaff\` int NOT NULL DEFAULT 0,
                \`maxGrounds\` int NOT NULL DEFAULT 0,
                \`maxReferees\` int NOT NULL DEFAULT 0,
                \`maxVendors\` int NOT NULL DEFAULT 0,
                \`storageLimitMb\` int NOT NULL DEFAULT 0,
                \`trialDays\` int NOT NULL DEFAULT 0,
                \`features\` json NULL,
                \`displayOrder\` int NOT NULL DEFAULT 0,
                \`isPopular\` tinyint NOT NULL DEFAULT 0,
                \`landingVisible\` tinyint NOT NULL DEFAULT 1,
                \`status\` enum ('active', 'inactive') NOT NULL DEFAULT 'active',
                \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                PRIMARY KEY (\`id\`),
                UNIQUE INDEX \`UQ_plans_code\` (\`code\`)
            ) ENGINE=InnoDB
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("DROP TABLE IF EXISTS `plans`");
    }
}
