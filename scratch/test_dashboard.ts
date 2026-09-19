import { AppDataSource } from '../src/config/data-source';
import { DashboardController } from '../src/modules/dashboard/dashboard.controller';

async function test() {
    try {
        await AppDataSource.initialize();
        console.log("DB connected!");

        const mockReq = {
            user: { id: 1, role: 'admin', email: 'admin@test.com' }
        };

        const createMockRes = (name: string) => ({
            status: (code: number) => {
                console.log(`[${name}] Status Code:`, code);
                return {
                    json: (data: any) => console.log(`[${name}] Error Response:`, data)
                };
            },
            json: (data: any) => console.log(`[${name}] Success Response keys:`, Object.keys(data), data.success ? 'OK' : data)
        });

        console.log("\n--- Testing getStats ---");
        await DashboardController.getStats(mockReq, createMockRes('getStats'));

        console.log("\n--- Testing getLiveMatches ---");
        await DashboardController.getLiveMatches(mockReq, createMockRes('getLiveMatches'));

        console.log("\n--- Testing getUpcomingMatches ---");
        await DashboardController.getUpcomingMatches(mockReq, createMockRes('getUpcomingMatches'));

        console.log("\n--- Testing getPastMatches ---");
        await DashboardController.getPastMatches(mockReq, createMockRes('getPastMatches'));

        console.log("\n--- Testing getTopScorers ---");
        await DashboardController.getTopScorers(mockReq, createMockRes('getTopScorers'));

        console.log("\n--- Testing getTopOrganizers ---");
        await DashboardController.getTopOrganizers(mockReq, createMockRes('getTopOrganizers'));

        process.exit(0);
    } catch (e) {
        console.error("Test error:", e);
        process.exit(1);
    }
}

test();
