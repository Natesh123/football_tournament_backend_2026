import { AppDataSource } from "../config/data-source";
import { Team, TeamType } from "../modules/teams/team.entity";
import { TeamMember, TeamMemberRole } from "../modules/teams/team-member.entity";
import { Match, MatchStatus } from "../modules/matches/match.entity";

async function seed() {
    console.log("Initializing database connection...");
    await AppDataSource.initialize();

    const teamRepo = AppDataSource.getRepository(Team);
    const memberRepo = AppDataSource.getRepository(TeamMember);
    const matchRepo = AppDataSource.getRepository(Match);

    // 1. Ensure some teams exist
    let teams = await teamRepo.find();
    if (teams.length === 0) {
        console.log("No teams found. Creating dummy teams...");
        const teamNames = ["Neon Strikers", "Golden Eagles", "Shadow Panthers", "Crimson Wolves"];
        for (const name of teamNames) {
            const newTeam = new Team();
            newTeam.name = name;
            newTeam.shortName = name.substring(0, 3).toUpperCase();
            newTeam.teamType = TeamType.CLUB;
            newTeam.city = "Metropolis";
            await teamRepo.save(newTeam);
        }
        teams = await teamRepo.find();
    }

    // 2. Add players to teams if they don't have any
    for (const team of teams) {
        const members = await memberRepo.find({ where: { team: { id: team.id } } });
        if (members.length === 0) {
            console.log(`Adding dummy players for team: ${team.name}`);
            const playerNames = ["John Doe", "Alex Smith", "Michael Johnson", "David Brown", "Chris Davis", "James Wilson", "Daniel Moore", "Matthew Taylor", "Anthony Anderson", "Mark Thomas", "Steven Jackson", "Paul White", "Andrew Harris", "Kenneth Martin", "George Thompson"];
            for (let i = 0; i < playerNames.length; i++) {
                const member = new TeamMember();
                member.name = playerNames[i];
                member.team = team;
                member.role = i === 0 ? TeamMemberRole.CAPTAIN : TeamMemberRole.PLAYER;
                member.position = i === 0 ? "GK" : "Midfielder";
                member.jerseyNumber = i + 1;
                await memberRepo.save(member);
            }
        }
    }

    // 3. Update matches with live and completed data
    const matches = await matchRepo.find({ relations: ["homeTeam", "awayTeam"] });
    if (matches.length > 0) {
        console.log("Updating some matches with 'live' and 'completed' dummy data...");

        let liveCount = 0;
        let completedCount = 0;

        for (const match of matches) {
            if (match.status === MatchStatus.SCHEDULED) {
                if (liveCount < 2) {
                    console.log(`Setting match ${match.id} to LIVE...`);
                    match.status = MatchStatus.LIVE;
                    match.homeScore = 2;
                    match.awayScore = 1;
                    match.events = JSON.stringify([
                        { id: "1", type: "goal", minute: 15, team: "home", teamId: match.homeTeam?.id?.toString(), playerName: "John Doe", details: "Header" },
                        { id: "2", type: "yellow_card", minute: 30, team: "away", teamId: match.awayTeam?.id?.toString(), playerName: "Alex Smith", details: "Foul" },
                        { id: "3", type: "goal", minute: 45, team: "home", teamId: match.homeTeam?.id?.toString(), playerName: "Michael Johnson", details: "Penalty" },
                        { id: "4", type: "goal", minute: 60, team: "away", teamId: match.awayTeam?.id?.toString(), playerName: "Chris Davis", details: "Long shot" },
                        { id: "5", type: "substitution", minute: 70, team: "home", teamId: match.homeTeam?.id?.toString(), playerName: "Paul White", details: "John Doe" }
                    ]);
                    await matchRepo.save(match);
                    liveCount++;
                } else if (completedCount < 2) {
                    console.log(`Setting match ${match.id} to COMPLETED...`);
                    match.status = MatchStatus.COMPLETED;
                    match.homeScore = 0;
                    match.awayScore = 3;
                    match.events = JSON.stringify([
                        { id: "6", type: "goal", minute: 20, team: "away", teamId: match.awayTeam?.id?.toString(), playerName: "Alex Smith", details: "Tap in" },
                        { id: "7", type: "goal", minute: 50, team: "away", teamId: match.awayTeam?.id?.toString(), playerName: "David Brown", details: "Free kick" },
                        { id: "8", type: "goal", minute: 85, team: "away", teamId: match.awayTeam?.id?.toString(), playerName: "James Wilson", details: "Header" }
                    ]);
                    await matchRepo.save(match);
                    completedCount++;
                }
            } else if (match.status === MatchStatus.LIVE) {
                liveCount++; // Already live
            } else if (match.status === MatchStatus.COMPLETED) {
                completedCount++; // Already completed
            }
        }
    } else {
        console.log("No matches found to update.");
    }

    console.log("Seeding complete!");
    process.exit(0);
}

seed().catch((err) => {
    console.error("Error during seeding:", err);
    process.exit(1);
});
