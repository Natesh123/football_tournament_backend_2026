import { AppDataSource } from "./src/config/data-source";
import { Plan } from "./src/modules/plans/plan.entity";

async function main() {
    await AppDataSource.initialize();
    const planRepo = AppDataSource.getRepository(Plan);
    const plans = await planRepo.find();
    console.log("PLANS IN DB:", JSON.stringify(plans, null, 2));
    await AppDataSource.destroy();
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
