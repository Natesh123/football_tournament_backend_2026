import { AppDataSource } from "../config/data-source";
import { Plan } from "../modules/plans/plan.entity";

const DEFAULT_PLANS: Partial<Plan>[] = [
    {
        name: "Free",
        code: "FREE",
        description: "Starter plan for small local tournaments and individual organizers.",
        monthlyPrice: 0,
        yearlyPrice: 0,
        maxTournaments: 1,
        maxTeams: 8,
        maxPlayers: 100,
        maxStaff: 1,
        allowOnlineRegistration: false,
        allowPayment: false,
        reportsLevel: "Basic",
        allowCustomBranding: false,
        displayOrder: 1,
        isPopular: false,
        landingVisible: true,
        status: "active",
        features: ["1 Tournament limit", "8 Teams limit", "100 Players limit", "1 Staff member", "Basic Reports"]
    },
    {
        name: "Basic",
        code: "BASIC",
        description: "Ideal for growing clubs and regular tournament organizers.",
        monthlyPrice: 29,
        yearlyPrice: 290,
        maxTournaments: 5,
        maxTeams: 30,
        maxPlayers: 500,
        maxStaff: 5,
        allowOnlineRegistration: true,
        allowPayment: true,
        reportsLevel: "Advanced",
        allowCustomBranding: false,
        displayOrder: 2,
        isPopular: true,
        landingVisible: true,
        status: "active",
        features: ["5 Tournaments limit", "30 Teams limit", "500 Players limit", "5 Staff members", "Online Registration", "Online Payment Collection", "Advanced Reports"]
    },
    {
        name: "Premium",
        code: "PREMIUM",
        description: "Full suite for large leagues, federations, and sports organizations.",
        monthlyPrice: 99,
        yearlyPrice: 990,
        maxTournaments: -1, // Unlimited
        maxTeams: -1, // Unlimited
        maxPlayers: -1, // Unlimited
        maxStaff: 20,
        allowOnlineRegistration: true,
        allowPayment: true,
        reportsLevel: "Advanced",
        allowCustomBranding: true,
        displayOrder: 3,
        isPopular: false,
        landingVisible: true,
        status: "active",
        features: ["Unlimited Tournaments", "Unlimited Teams", "Unlimited Players", "20 Staff members", "Online Registration", "Online Payment Collection", "Advanced Reports", "Custom Branding"]
    }
];

export async function seedPlans() {
    console.log("Initializing database connection for plan seeding...");
    if (!AppDataSource.isInitialized) {
        await AppDataSource.initialize();
    }

    // Ensure columns exist on MySQL plans table if created prior to feature addition
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    
    const newColumns = [
        { name: "allowOnlineRegistration", type: "tinyint NOT NULL DEFAULT 0" },
        { name: "allowPayment", type: "tinyint NOT NULL DEFAULT 0" },
        { name: "reportsLevel", type: "varchar(255) NOT NULL DEFAULT 'Basic'" },
        { name: "allowCustomBranding", type: "tinyint NOT NULL DEFAULT 0" },
    ];

    for (const col of newColumns) {
        try {
            await queryRunner.query(`ALTER TABLE \`plans\` ADD COLUMN \`${col.name}\` ${col.type}`);
            console.log(`Added column ${col.name} to plans table.`);
        } catch (e: any) {
            // Ignore error if column already exists (ER_DUP_FIELDNAME)
        }
    }
    await queryRunner.release();

    const planRepo = AppDataSource.getRepository(Plan);

    for (const planDef of DEFAULT_PLANS) {
        let plan = await planRepo.findOne({
            where: [{ code: planDef.code }, { name: planDef.name }]
        });

        if (plan) {
            console.log(`Updating existing plan: ${plan.name} (${plan.code})`);
            Object.assign(plan, planDef);
        } else {
            console.log(`Creating new plan: ${planDef.name} (${planDef.code})`);
            plan = planRepo.create(planDef);
        }
        await planRepo.save(plan);
    }

    console.log("✅ Subscription Plans successfully seeded/updated!");
}

if (require.main === module) {
    seedPlans()
        .then(async () => {
            if (AppDataSource.isInitialized) {
                await AppDataSource.destroy();
            }
            process.exit(0);
        })
        .catch(async (err) => {
            console.error("❌ Failed to seed plans:", err);
            if (AppDataSource.isInitialized) {
                await AppDataSource.destroy();
            }
            process.exit(1);
        });
}
