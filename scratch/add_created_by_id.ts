import { AppDataSource } from '../src/config/data-source';

async function fixDatabase() {
    try {
        await AppDataSource.initialize();
        console.log("DB connected!");

        // Add createdById column to team table if missing
        try {
            await AppDataSource.query("ALTER TABLE team ADD COLUMN createdById INT NULL;");
            console.log("Successfully added createdById to team table.");
        } catch (e: any) {
            if (e.message.includes("Duplicate column name")) {
                console.log("createdById column already exists in team table.");
            } else {
                console.error("Error adding createdById to team table:", e.message);
            }
        }

        process.exit(0);
    } catch (e) {
        console.error("Database connection error:", e);
        process.exit(1);
    }
}

fixDatabase();
