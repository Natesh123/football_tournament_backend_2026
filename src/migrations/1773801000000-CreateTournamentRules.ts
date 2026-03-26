import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Migration: CreateTournamentRules
 *
 * Creates the `tournament_rules` table with:
 *  - One-to-one FK → tournament (CASCADE delete)
 *  - All match rule columns with sensible defaults
 *  - Unique constraint on tournament_id (one rules row per tournament)
 */
export class CreateTournamentRules1773801000000 implements MigrationInterface {
    name = "CreateTournamentRules1773801000000";

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS \`tournament_rules\` (
                \`id\`                    INT          NOT NULL AUTO_INCREMENT,
                \`tournament_id\`         INT          NOT NULL,
                \`governing_body\`        VARCHAR(255) NOT NULL DEFAULT 'FIFA',
                \`ball_size\`             TINYINT      NOT NULL DEFAULT 5,
                \`players_on_field\`      TINYINT      NOT NULL DEFAULT 11,
                \`min_players\`           TINYINT      NOT NULL DEFAULT 7,
                \`substitution_rules\`    TINYINT      NOT NULL DEFAULT 5,
                \`apply_offside_rule\`    TINYINT(1)   NOT NULL DEFAULT 1,
                \`extra_time_rules\`      ENUM(
                                            'no_extra_time',
                                            'golden_goal',
                                            'full_extra_time'
                                          )            NOT NULL DEFAULT 'no_extra_time',
                \`penalties_shootout\`    TINYINT(1)   NOT NULL DEFAULT 0,
                \`yellow_card_suspension\` TINYINT     NOT NULL DEFAULT 3,
                \`red_card_penalty\`      TINYINT      NOT NULL DEFAULT 1,
                \`goalkeeper_rules\`      ENUM(
                                            'standard_fifa',
                                            'rolling_keeper',
                                            'no_restriction'
                                          )            NOT NULL DEFAULT 'standard_fifa',
                \`created_at\`            DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updated_at\`            DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),

                PRIMARY KEY (\`id\`),
                UNIQUE INDEX \`UQ_tournament_rules_tournament_id\` (\`tournament_id\`),
                CONSTRAINT \`FK_tournament_rules_tournament\`
                    FOREIGN KEY (\`tournament_id\`)
                    REFERENCES \`tournament\` (\`id\`)
                    ON DELETE CASCADE
                    ON UPDATE NO ACTION
            ) ENGINE=InnoDB
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE \`tournament_rules\`
                DROP FOREIGN KEY \`FK_tournament_rules_tournament\`
        `);
        await queryRunner.query(`DROP TABLE \`tournament_rules\``);
    }
}
