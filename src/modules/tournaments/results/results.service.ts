import { AppDataSource } from "../../../config/data-source";
import { Tournament } from "../tournament.entity";
import { Group } from "../group.entity";

export class ResultsService {
    private tournamentRepo = AppDataSource.getRepository(Tournament);
    private groupRepo = AppDataSource.getRepository(Group);



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
}
