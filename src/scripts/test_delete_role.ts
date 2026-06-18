import { AppDataSource } from "../config/data-source";
import * as settingsService from "../modules/settings/settings.service";

async function run() {
    await AppDataSource.initialize();
    try {
        console.log("Creating a test role...");
        const role = await settingsService.createRole("TestRoleToDelete");
        console.log("Created role:", role);
        
        console.log("Deleting role...");
        const result = await settingsService.deleteRole(role.id);
        console.log("Delete result:", result);
    } catch (e: any) {
        console.error("Error occurred:", e.message);
    } finally {
        await AppDataSource.destroy();
    }
}

run();
