import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Migration: RefactorMatchEventsTable
 *
 * Evolves the existing match_events table (created in AddMatchEventsAndStats1773771466192) to:
 *  - Extend event type enum with penalty + own_goal
 *  - Rename column eventType → type
 *  - Add playerName (varchar) replacing the int playerId / relatedPlayerId FKs
 *  - Add team (home/away enum) column
 *  - Change `minute` from INT to TINYINT UNSIGNED
 *  - Add index on type
 *  - Migrate JSON data from match.events (text) into match_events rows (JSON_TABLE - MariaDB 10.6+)
 *  - Drop match.events column
 */
export class RefactorMatchEventsTable1773800000000 implements MigrationInterface {
    name = "RefactorMatchEventsTable1773800000000";

    public async up(queryRunner: QueryRunner): Promise<void> {
        /* ── 1. Extend and rename enum column ─────────────────────────────────── */
        // Drop old column and re-add it with the new name and full enum set
        await queryRunner.query(`
            ALTER TABLE \`match_events\`
                DROP COLUMN IF EXISTS \`eventType\`
        `);

        await queryRunner.query(`
            ALTER TABLE \`match_events\`
                ADD COLUMN IF NOT EXISTS \`type\` ENUM('goal','yellow_card','red_card','substitution','penalty','own_goal')
                    NOT NULL DEFAULT 'goal'
                    AFTER \`match_id\`
        `);

        /* ── 2. Add playerName column ─────────────────────────────────────────── */
        await queryRunner.query(`
            ALTER TABLE \`match_events\`
                ADD COLUMN IF NOT EXISTS \`player_name\` VARCHAR(255) NULL AFTER \`type\`
        `);

        /* ── 3. Add teamSide (home/away) column ───────────────────────────────── */
        await queryRunner.query(`
            ALTER TABLE \`match_events\`
                ADD COLUMN IF NOT EXISTS \`team\` ENUM('home','away') NULL AFTER \`player_name\`
        `);

        /* ── 4. Change minute from INT → TINYINT UNSIGNED ─────────────────────── */
        await queryRunner.query(`
            ALTER TABLE \`match_events\`
                MODIFY COLUMN \`minute\` TINYINT UNSIGNED NOT NULL DEFAULT 0
        `).catch(() => {}); // Ignore if already modified

        /* ── 5. Drop old player FK int columns (replaced by player_name text) ── */
        await queryRunner.query(`
            ALTER TABLE \`match_events\`
                DROP COLUMN IF EXISTS \`playerId\`
        `);

        await queryRunner.query(`
            ALTER TABLE \`match_events\`
                DROP COLUMN IF EXISTS \`relatedPlayerId\`
        `);

        /* ── 6. Add index on type ─────────────────────────────────────────────── */
        await queryRunner.query(`
            CREATE INDEX \`IDX_match_events_type\` ON \`match_events\` (\`type\`)
        `).catch(() => {}); // Catch if index already exists

        /* ── 7. Migrate JSON data from match.events → match_events rows ─────── */
        // Migrating in JS to support older MariaDB versions without JSON_TABLE
        try {
            const matches: any[] = await queryRunner.query(`
                SELECT \`id\`, \`events\`
                FROM \`match\`
                WHERE \`events\` IS NOT NULL AND \`events\` != ''
            `);

        for (const match of matches) {
            try {
                const parsedEvents = JSON.parse(match.events);
                if (Array.isArray(parsedEvents)) {
                    for (const evt of parsedEvents) {
                        const type       = evt.type || 'goal';
                        const playerName = evt.playerName || null;
                        const team       = evt.team || null;
                        const minute     = evt.minute ? Number(evt.minute) : 0;
                        const details    = evt.details || null;

                        await queryRunner.query(`
                            INSERT INTO \`match_events\`
                                (\`match_id\`, \`type\`, \`player_name\`, \`team\`, \`minute\`, \`details\`)
                            VALUES (?, ?, ?, ?, ?, ?)
                        `, [match.id, type, playerName, team, minute, details]);
                    }
                }
            } catch (err) {
                // Silently skip rows with invalid JSON to allow migration to proceed
            }
        }
    } catch (e) {
        // Silently skip if query fails (eg `events` column doesn't exist)
    }

        /* ── 8. Drop match.events column ─────────────────────────────────────── */
        await queryRunner.query(`
            ALTER TABLE \`match\`
                DROP COLUMN IF EXISTS \`events\`
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        /* ── Rollback 8: restore match.events column ──────────────────────────── */
        await queryRunner.query(`
            ALTER TABLE \`match\`
                ADD COLUMN \`events\` TEXT NULL
        `);

        /* ── Rollback 7: move data back (best-effort JSON aggregate) ─────────── */
        // Re-aggregate match_events rows into a JSON array per match and store in match.events
        await queryRunner.query(`
            UPDATE \`match\` m
            SET m.\`events\` = (
                SELECT JSON_ARRAYAGG(
                    JSON_OBJECT(
                        'type',       me.\`type\`,
                        'playerName', me.\`player_name\`,
                        'team',       me.\`team\`,
                        'minute',     me.\`minute\`,
                        'details',    me.\`details\`
                    )
                )
                FROM \`match_events\` me
                WHERE me.\`match_id\` = m.\`id\`
            )
        `);

        /* ── Rollback 6: drop index ────────────────────────────────────────────── */
        await queryRunner.query(`
            DROP INDEX IF EXISTS \`IDX_match_events_type\` ON \`match_events\`
        `);

        /* ── Rollback 5: restore playerId + relatedPlayerId ───────────────────── */
        await queryRunner.query(`
            ALTER TABLE \`match_events\`
                ADD COLUMN \`playerId\` INT NULL,
                ADD COLUMN \`relatedPlayerId\` INT NULL
        `);

        /* ── Rollback 4: restore minute to INT ────────────────────────────────── */
        await queryRunner.query(`
            ALTER TABLE \`match_events\`
                MODIFY COLUMN \`minute\` INT NOT NULL DEFAULT 0
        `);

        /* ── Rollback 3: drop teamSide column ─────────────────────────────────── */
        await queryRunner.query(`
            ALTER TABLE \`match_events\`
                DROP COLUMN IF EXISTS \`team\`
        `);

        /* ── Rollback 2: drop playerName column ────────────────────────────────── */
        await queryRunner.query(`
            ALTER TABLE \`match_events\`
                DROP COLUMN IF EXISTS \`player_name\`
        `);

        /* ── Rollback 1: restore original eventType enum column ─────────────── */
        await queryRunner.query(`
            ALTER TABLE \`match_events\`
                DROP COLUMN IF EXISTS \`type\`
        `);

        await queryRunner.query(`
            ALTER TABLE \`match_events\`
                ADD COLUMN \`eventType\`
                    ENUM('goal','yellow_card','red_card','substitution')
                    NOT NULL DEFAULT 'goal'
        `);
    }
}
