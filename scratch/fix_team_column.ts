import { AppDataSource } from '../src/config/data-source';

async function checkColumns() {
    try {
        await AppDataSource.initialize();
        const columns = await AppDataSource.query("DESCRIBE team;");
        console.log("Team table columns:", columns.map((c: any) => c.Field));
        process.exit(0);
    } catch (e) {
        console.error("Error describing team table:", e);
        process.exit(1);
    }
}

checkColumns();
