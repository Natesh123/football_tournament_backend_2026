import { AppDataSource } from "./src/config/data-source";

async function cleanup() {
    await AppDataSource.initialize();

    console.log("Disabling foreign key checks...");
    await AppDataSource.query("SET FOREIGN_KEY_CHECKS = 0;");

    const tablesToDrop = [
        "format_stages",
        "format_knockout_settings",
        "format_group_settings",
        "tournament_tiebreakers",
        "tournament_format",
        "tournament_formats",
        "competition_format"
    ];

    for (const table of tablesToDrop) {
        try {
            await AppDataSource.query(`DROP TABLE IF EXISTS \`${table}\``);
            console.log(`Dropped table: ${table}`);
        } catch (e: any) {
            console.log(`Failed to drop ${table}: ${e.message}`);
        }
    }

    console.log("Cleaning up migration history...");
    await AppDataSource.query(`
        DELETE FROM migrations 
        WHERE name LIKE '%Format%' OR name LIKE '%Tiebreaker%'
    `);

    console.log("Re-enabling foreign key checks...");
    await AppDataSource.query("SET FOREIGN_KEY_CHECKS = 1;");

    console.log("Cleanup complete!");
    process.exit(0);
}

cleanup().catch(console.error);
