const { AppDataSource } = require('../src/config/data-source');
const { Tournament } = require('../src/modules/tournaments/tournament.entity');
const { User } = require('../src/entities/user.entity');

async function test() {
    try {
        await AppDataSource.initialize();
        console.log("DB connected!");
        const tournamentRepo = AppDataSource.getRepository(Tournament);
        
        try {
            console.log("Testing orgQuery with string 'users'...");
            const q1 = tournamentRepo
                .createQueryBuilder("t")
                .select("u.user_name", "name")
                .addSelect("u.email", "email")
                .addSelect("COUNT(t.id)", "tournamentsCount")
                .innerJoin("users", "u", "u.id = t.ownerId");
            const res1 = await q1.groupBy("u.id").getRawMany();
            console.log("q1 success:", res1);
        } catch (e) {
            console.error("q1 failed:", e.message);
        }

        try {
            console.log("Testing orgQuery with User entity...");
            const q2 = tournamentRepo
                .createQueryBuilder("t")
                .select("u.user_name", "name")
                .addSelect("u.email", "email")
                .addSelect("COUNT(t.id)", "tournamentsCount")
                .innerJoin(User, "u", "u.id = t.ownerId");
            const res2 = await q2.groupBy("u.id").getRawMany();
            console.log("q2 success:", res2);
        } catch (e) {
            console.error("q2 failed:", e.message);
        }

        process.exit(0);
    } catch (e) {
        console.error("DB init error:", e);
        process.exit(1);
    }
}

test();
