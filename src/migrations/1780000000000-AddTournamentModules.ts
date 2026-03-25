import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTournamentModules1780000000000 implements MigrationInterface {
    name = 'AddTournamentModules1780000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`tournament\` ADD COLUMN IF NOT EXISTS \`auto_publish_results\` tinyint NOT NULL DEFAULT 0`).catch(() => {});
        
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS \`tournament_venues\` (\`id\` int NOT NULL AUTO_INCREMENT, \`primary_venue_name\` varchar(255) NOT NULL, \`venue_address\` text NULL, \`total_pitches\` int NOT NULL DEFAULT 1, \`field_type\` enum ('natural_grass', 'artificial_turf', 'indoor', 'futsal') NOT NULL DEFAULT 'natural_grass', \`multiple_venues_enabled\` tinyint NOT NULL DEFAULT 0, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`tournament_id\` int NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`tournament_venues\` ADD CONSTRAINT \`FK_venue_tournament\` FOREIGN KEY (\`tournament_id\`) REFERENCES \`tournament\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`).catch(() => {});

        await queryRunner.query(`CREATE TABLE IF NOT EXISTS \`tournament_finance\` (\`id\` int NOT NULL AUTO_INCREMENT, \`registration_fee\` decimal(10,2) NOT NULL DEFAULT '0.00', \`accepted_method\` enum ('bank_transfer', 'cash', 'online', 'upi') NOT NULL DEFAULT 'bank_transfer', \`payment_instructions\` text NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`tournament_id\` int NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`tournament_finance\` ADD CONSTRAINT \`FK_finance_tournament\` FOREIGN KEY (\`tournament_id\`) REFERENCES \`tournament\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`).catch(() => {});

        await queryRunner.query(`CREATE TABLE IF NOT EXISTS \`tournament_prize_pool\` (\`id\` int NOT NULL AUTO_INCREMENT, \`total_prize_money\` decimal(10,2) NOT NULL DEFAULT '0.00', \`first_place_percent\` int NOT NULL DEFAULT 50, \`second_place_percent\` int NOT NULL DEFAULT 30, \`third_place_percent\` int NOT NULL DEFAULT 20, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`tournament_id\` int NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`tournament_prize_pool\` ADD CONSTRAINT \`FK_prize_tournament\` FOREIGN KEY (\`tournament_id\`) REFERENCES \`tournament\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`).catch(() => {});

        await queryRunner.query(`CREATE TABLE IF NOT EXISTS \`tournament_presentation\` (\`id\` int NOT NULL AUTO_INCREMENT, \`brand_color\` varchar(7) NOT NULL DEFAULT '#FFC107', \`welcome_message\` text NULL, \`show_standings_widget\` tinyint NOT NULL DEFAULT 1, \`show_top_scorers\` tinyint NOT NULL DEFAULT 1, \`live_broadcast_enabled\` tinyint NOT NULL DEFAULT 0, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`tournament_id\` int NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`tournament_presentation\` ADD CONSTRAINT \`FK_presentation_tournament\` FOREIGN KEY (\`tournament_id\`) REFERENCES \`tournament\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`).catch(() => {});
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`tournament_presentation\` DROP FOREIGN KEY \`FK_presentation_tournament\``);
        await queryRunner.query(`DROP TABLE \`tournament_presentation\``);

        await queryRunner.query(`ALTER TABLE \`tournament_prize_pool\` DROP FOREIGN KEY \`FK_prize_tournament\``);
        await queryRunner.query(`DROP TABLE \`tournament_prize_pool\``);

        await queryRunner.query(`ALTER TABLE \`tournament_finance\` DROP FOREIGN KEY \`FK_finance_tournament\``);
        await queryRunner.query(`DROP TABLE \`tournament_finance\``);

        await queryRunner.query(`ALTER TABLE \`tournament_venues\` DROP FOREIGN KEY \`FK_venue_tournament\``);
        await queryRunner.query(`DROP TABLE \`tournament_venues\``);

        await queryRunner.query(`ALTER TABLE \`tournament\` DROP COLUMN \`auto_publish_results\``);
    }
}
