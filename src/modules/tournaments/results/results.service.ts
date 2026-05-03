import { AppDataSource } from "../../../config/data-source";
import { Tournament } from "../tournament.entity";
import { Group } from "../group.entity";
import { Match, MatchStatus } from "../../matches/match.entity";
import { MatchEvent } from "../../matches/match-event.entity";

export class ResultsService {
    private tournamentRepo = AppDataSource.getRepository(Tournament);
    private groupRepo = AppDataSource.getRepository(Group);
    private matchRepo = AppDataSource.getRepository(Match);
    private matchEventRepo = AppDataSource.getRepository(MatchEvent);

    async getStandings(tournamentId: number): Promise<any[]> {
        const groups = await this.groupRepo.find({
            where: { tournament: { id: tournamentId } },
            relations: ["group_teams", "group_teams.team"],
            order: {
                group_name: "ASC"
            }
        });

        const standings: any[] = [];

        for (const group of groups) {
            const sortedTeams = group.group_teams.sort((a, b) => {
                if (a.points !== b.points) return b.points - a.points;
                if (a.goal_difference !== b.goal_difference) return b.goal_difference - a.goal_difference;
                return b.goals_for - a.goals_for;
            });

            sortedTeams.forEach((groupTeam, index) => {
                standings.push({
                    group_name: group.group_name,
                    position: index + 1,
                    team_name: groupTeam.team.name,
                    played: groupTeam.played,
                    wins: groupTeam.wins,
                    draws: groupTeam.draws,
                    losses: groupTeam.losses,
                    goals_for: groupTeam.goals_for,
                    goals_against: groupTeam.goals_against,
                    goal_difference: groupTeam.goal_difference,
                    points: groupTeam.points
                });
            });
        }

        return standings;
    }

    async getResults(tournamentId: number): Promise<any[]> {
        const matches = await this.matchRepo.find({
            where: { tournament: { id: tournamentId }, status: MatchStatus.COMPLETED },
            relations: ["homeTeam", "awayTeam", "stage", "matchEvents"]
        });

        const result: any[] = [];
        for (const m of matches) {
            let winner = null;
            if (m.homeScore > m.awayScore) winner = m.homeTeam;
            else if (m.homeScore < m.awayScore) winner = m.awayTeam;
            else if (m.endPeriod === "pso") {
                if ((m.penaltyHome ?? 0) > (m.penaltyAway ?? 0)) winner = m.homeTeam;
                else if ((m.penaltyHome ?? 0) < (m.penaltyAway ?? 0)) winner = m.awayTeam;
            }

            result.push({
                id: m.id,
                stage: m.stage ? m.stage.stage_name : "General",
                homeTeam: m.homeTeam,
                awayTeam: m.awayTeam,
                homeScore: m.homeScore,
                awayScore: m.awayScore,
                penaltyHome: m.penaltyHome,
                penaltyAway: m.penaltyAway,
                matchPeriod: m.endPeriod,
                winner: winner,
                goals: (m.matchEvents || []).filter((e: any) => e.type === "goal" || e.type === "penalty")
            });
        }
        
        // Group by stage
        const grouped = result.reduce((acc: any, curr: any) => {
            const st = curr.stage;
            if (!acc[st]) acc[st] = [];
            acc[st].push(curr);
            return acc;
        }, {});

        return Object.keys(grouped).map(key => ({
            stage: key,
            matches: grouped[key]
        }));
    }

    async getTopPerformance(tournamentId: number): Promise<any> {
        const queryBuilder = this.matchEventRepo.createQueryBuilder("event")
            .innerJoin("event.match", "match")
            .leftJoinAndSelect("event.team", "team")
            .where("match.tournamentId = :tournamentId", { tournamentId })
            .andWhere("event.playerName IS NOT NULL")
            .andWhere("event.playerName != ''")
            .select([
                "event.playerName as playerName",
                "team.name as teamName",
                "team.id as teamId",
                "event.type as type",
                "COUNT(event.id) as count"
            ])
            .groupBy("event.playerName")
            .addGroupBy("team.id")
            .addGroupBy("event.type");

        const rawResults = await queryBuilder.getRawMany();

        const topScorers = rawResults.filter(r => r.type === "goal" || r.type === "penalty").sort((a, b) => b.count - a.count).slice(0, 10).map(r => ({ playerName: r.playerName, teamName: r.teamName, count: parseInt(r.count, 10) }));
        const yellowCards = rawResults.filter(r => r.type === "yellow_card").sort((a, b) => b.count - a.count).slice(0, 10).map(r => ({ playerName: r.playerName, teamName: r.teamName, count: parseInt(r.count, 10) }));
        const redCards = rawResults.filter(r => r.type === "red_card").sort((a, b) => b.count - a.count).slice(0, 10).map(r => ({ playerName: r.playerName, teamName: r.teamName, count: parseInt(r.count, 10) }));

        // Infer clean sheets from matches per team instead of player_name since players don't have clean sheet events
        const teamMatches = await this.matchRepo.find({
            where: { tournament: { id: tournamentId }, status: MatchStatus.COMPLETED },
            relations: ["homeTeam", "awayTeam"]
        });

        const cleanSheetCounts: Record<string, { teamName: string, count: number }> = {};
        for (const m of teamMatches) {
            if (m.homeTeam && m.awayScore === 0) {
                if (!cleanSheetCounts[m.homeTeam.id]) cleanSheetCounts[m.homeTeam.id] = { teamName: m.homeTeam.name, count: 0 };
                cleanSheetCounts[m.homeTeam.id].count++;
            }
            if (m.awayTeam && m.homeScore === 0) {
                if (!cleanSheetCounts[m.awayTeam.id]) cleanSheetCounts[m.awayTeam.id] = { teamName: m.awayTeam.name, count: 0 };
                cleanSheetCounts[m.awayTeam.id].count++;
            }
        }

        const cleanSheets = Object.values(cleanSheetCounts).sort((a, b) => b.count - a.count).slice(0, 10);

        return {
            topScorers,
            yellowCards,
            redCards,
            cleanSheets
        };
    }
}
