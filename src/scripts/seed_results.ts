import { AppDataSource } from "../config/data-source";
import { Match, MatchStatus } from "../modules/matches/match.entity";
import { MatchEvent, MatchEventType, MatchEventTeamSide } from "../modules/matches/match-event.entity";
import { Tournament } from "../modules/tournaments/tournament.entity";

async function seedResults() {
    await AppDataSource.initialize();
    console.log("Data Source initialized.");

    const matchRepo = AppDataSource.getRepository(Match);
    const eventRepo = AppDataSource.getRepository(MatchEvent);

    // Find a tournament that has matches
    const tournament = await AppDataSource.getRepository(Tournament).findOne({
        order: { id: "DESC" }
    });

    if (!tournament) {
        console.log("No tournaments found.");
        process.exit(1);
    }

    const matches = await matchRepo.find({
        where: { tournament: { id: tournament.id } },
        relations: ["homeTeam", "awayTeam", "stage", "group"],
        take: 3
    });

    if (matches.length === 0) {
        console.log("No matches found for tournament ID:", tournament.id);
        process.exit(1);
    }

    console.log(`Seeding results for ${matches.length} matches...`);

    // Match 1: Regular win for Home Team
    if (matches[0] && matches[0].homeTeam && matches[0].awayTeam) {
        matches[0].status = MatchStatus.COMPLETED;
        matches[0].homeScore = 2;
        matches[0].awayScore = 0;
        matches[0].endPeriod = "ft";
        await matchRepo.save(matches[0]);

        await eventRepo.save([
            eventRepo.create({
                match: matches[0],
                type: MatchEventType.GOAL,
                minute: 12,
                playerName: "Lionel Messi",
                teamSide: MatchEventTeamSide.HOME,
                team: matches[0].homeTeam
            }),
            eventRepo.create({
                match: matches[0],
                type: MatchEventType.GOAL,
                minute: 67,
                playerName: "Andres Iniesta",
                teamSide: MatchEventTeamSide.HOME,
                team: matches[0].homeTeam
            })
        ]);
        console.log("Seeded Match 1 (Regular Win)");
    }

    // Match 2: Penalty Shootout Win for Away Team
    if (matches[1] && matches[1].homeTeam && matches[1].awayTeam) {
        matches[1].status = MatchStatus.COMPLETED;
        matches[1].homeScore = 1;
        matches[1].awayScore = 1;
        matches[1].endPeriod = "pso";
        matches[1].penaltyHome = 3;
        matches[1].penaltyAway = 4;
        await matchRepo.save(matches[1]);

        await eventRepo.save([
            eventRepo.create({
                match: matches[1],
                type: MatchEventType.GOAL,
                minute: 45,
                playerName: "Marcus Rashford",
                teamSide: MatchEventTeamSide.HOME,
                team: matches[1].homeTeam
            }),
            eventRepo.create({
                match: matches[1],
                type: MatchEventType.GOAL,
                minute: 89,
                playerName: "Kevin De Bruyne",
                teamSide: MatchEventTeamSide.AWAY,
                team: matches[1].awayTeam
            })
        ]);
        console.log("Seeded Match 2 (PSO Win)");
    }

    // Match 3: High scoring Extra Time match
    if (matches[2] && matches[2].homeTeam && matches[2].awayTeam) {
        matches[2].status = MatchStatus.COMPLETED;
        matches[2].homeScore = 3;
        matches[2].awayScore = 2;
        matches[2].endPeriod = "aet";
        await matchRepo.save(matches[2]);

        await eventRepo.save([
            eventRepo.create({
                match: matches[2],
                type: MatchEventType.GOAL,
                minute: 10,
                playerName: "Vinicius Jr",
                teamSide: MatchEventTeamSide.HOME,
                team: matches[2].homeTeam
            }),
            eventRepo.create({
                match: matches[2],
                type: MatchEventType.GOAL,
                minute: 90,
                playerName: "Erling Haaland",
                teamSide: MatchEventTeamSide.AWAY,
                team: matches[2].awayTeam
            }),
            eventRepo.create({
                match: matches[2],
                type: MatchEventType.GOAL,
                minute: 105,
                playerName: "Jude Bellingham",
                teamSide: MatchEventTeamSide.HOME,
                team: matches[2].homeTeam
            })
        ]);
        console.log("Seeded Match 3 (AET Win)");
    }

    console.log("Seeding complete! Check your frontend.");
    process.exit(0);
}

seedResults().catch(err => {
    console.error("Error seeding results:", err);
    process.exit(1);
});
