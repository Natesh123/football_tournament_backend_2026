import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAssistPlayerToEvents1781001000000 implements MigrationInterface {
    name = 'AddAssistPlayerToEvents1781001000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // We use a safe query to ensure it doesn't fail if the column somehow was already added.
        const table = await queryRunner.getTable("match_events");
        const hasColumn = table?.findColumnByName("assist_player_name");

        if (!hasColumn) {
            await queryRunner.query(`ALTER TABLE \`match_events\` ADD \`assist_player_name\` varchar(255) NULL`);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`match_events\` DROP COLUMN \`assist_player_name\``);
    }
}
