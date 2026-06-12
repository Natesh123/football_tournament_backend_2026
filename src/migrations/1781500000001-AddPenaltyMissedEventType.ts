import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPenaltyMissedEventType1781500000001 implements MigrationInterface {
    name = 'AddPenaltyMissedEventType1781500000001';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add 'penalty_missed' to the match_events.type enum (a missed penalty
        // is recorded for the timeline but never increments the score).
        await queryRunner.query(
            `ALTER TABLE \`match_events\` MODIFY \`type\` ENUM(` +
            `'goal','yellow_card','red_card','substitution','penalty','penalty_missed',` +
            `'own_goal','corner','foul','offside','free_kick'` +
            `) NOT NULL DEFAULT 'goal'`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE \`match_events\` MODIFY \`type\` ENUM(` +
            `'goal','yellow_card','red_card','substitution','penalty',` +
            `'own_goal','corner','foul','offside','free_kick'` +
            `) NOT NULL DEFAULT 'goal'`
        );
    }
}
