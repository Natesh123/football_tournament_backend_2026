import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Restores `ON DELETE SET NULL` on match.homeTeamId / match.awayTeamId → team(id).
 *
 * The original schema (MigrateUuidToIntIds) created these FKs with SET NULL, but
 * later auto-generated migrations silently recreated them as NO ACTION because the
 * Match entity's homeTeam/awayTeam relations declared no `onDelete` rule. As a
 * result, deleting any team that appears in a match failed with a foreign-key
 * constraint error, so the Teams page "Delete" action appeared to do nothing.
 *
 * The current constraint names have drifted across environments (e.g.
 * FK_match_home_team vs the hash-named FK_5caac...), so we look up whatever FK
 * currently constrains each column instead of hardcoding a name.
 */
export class RestoreMatchTeamOnDeleteSetNull1781900000000 implements MigrationInterface {
    name = "RestoreMatchTeamOnDeleteSetNull1781900000000";

    private async recreate(queryRunner: QueryRunner, column: string, fkName: string, onDelete: string) {
        const rows: Array<{ CONSTRAINT_NAME: string }> = await queryRunner.query(
            `SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'match'
               AND COLUMN_NAME = ? AND REFERENCED_TABLE_NAME = 'team'`,
            [column]
        );

        for (const { CONSTRAINT_NAME } of rows) {
            await queryRunner.query(`ALTER TABLE \`match\` DROP FOREIGN KEY \`${CONSTRAINT_NAME}\``);
        }

        await queryRunner.query(
            `ALTER TABLE \`match\` ADD CONSTRAINT \`${fkName}\`
             FOREIGN KEY (\`${column}\`) REFERENCES \`team\`(\`id\`)
             ON DELETE ${onDelete} ON UPDATE NO ACTION`
        );
    }

    public async up(queryRunner: QueryRunner): Promise<void> {
        await this.recreate(queryRunner, "homeTeamId", "FK_match_home_team", "SET NULL");
        await this.recreate(queryRunner, "awayTeamId", "FK_match_away_team", "SET NULL");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await this.recreate(queryRunner, "homeTeamId", "FK_match_home_team", "NO ACTION");
        await this.recreate(queryRunner, "awayTeamId", "FK_match_away_team", "NO ACTION");
    }
}
