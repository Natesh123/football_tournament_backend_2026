import { AppDataSource } from "../../config/data-source";
import { Tournament } from "./tournament.entity";
import { TournamentFormat } from "./tournament-format.entity";
import { FormatStage } from "./format-stage.entity";
import { Group } from "./group.entity";
import { GroupTeam } from "./group-team.entity";
import { Match } from "../matches/match.entity";
import { MatchSource } from "../matches/match-source.entity";
import { Bracket } from "../brackets/bracket.entity";

export class TournamentEngineService {
    private tournamentRepo = AppDataSource.getRepository(Tournament);
    private formatRepo = AppDataSource.getRepository(TournamentFormat);
    private stageRepo = AppDataSource.getRepository(FormatStage);
    private groupRepo = AppDataSource.getRepository(Group);
    private groupTeamRepo = AppDataSource.getRepository(GroupTeam);
    private matchRepo = AppDataSource.getRepository(Match);
    private matchSourceRepo = AppDataSource.getRepository(MatchSource);
    private bracketRepo = AppDataSource.getRepository(Bracket);

    async generateStructure(tournamentId: string) {
        const tournament = await this.tournamentRepo.findOne({
            where: { id: parseInt(tournamentId) },
            relations: ["format", "format.group_settings", "format.knockout_settings", "teamRegistrations", "teamRegistrations.team"]
        });

        if (!tournament || !tournament.format) {
            throw new Error("Tournament or format not found");
        }

        const { formatType } = tournament.format as any; // Cast for now

        // Switch based on enum format type
        if (tournament.format.format_type === "groups") {
            await this.generateGroupsPhase(tournament);
        } else if (tournament.format.format_type === "groups_knockout") {
            await this.generateGroupsPhase(tournament);
            await this.generateKnockoutPhase(tournament);
        } else if (tournament.format.format_type === "knockout") {
            await this.generateKnockoutPhase(tournament);
        }

        return this.getStructure(tournamentId);
    }

    private async generateGroupsPhase(tournament: Tournament) {
        const settings = tournament.format?.group_settings;
        if (!settings) throw new Error("Group settings missing");

        // Create Stage
        const stage = this.stageRepo.create({
            format: tournament.format,
            stage_order: 1,
            stage_type: "group",
            stage_name: "Group Stage",
            teams_count: settings.total_teams
        });
        await this.stageRepo.save(stage);

        // Create Groups
        const numGroups = settings.groups_count;
        const groups: Group[] = [];
        for (let i = 0; i < numGroups; i++) {
            const groupName = `Group ${String.fromCharCode(65 + i)}`; // A, B, C...
            const group = this.groupRepo.create({
                tournament: tournament,
                stage: stage,
                group_name: groupName
            });
            groups.push(await this.groupRepo.save(group));
        }

        // Assign Teams (Basic Round Robin distribution)
        const teams = tournament.teamRegistrations.map(tr => tr.team);
        // Shuffle teams for randomness
        teams.sort(() => Math.random() - 0.5);

        for (let i = 0; i < teams.length; i++) {
            const group = groups[i % numGroups];
            const groupTeam = this.groupTeamRepo.create({
                group: group,
                team: teams[i],
                played: 0, wins: 0, draws: 0, losses: 0,
                goals_for: 0, goals_against: 0, goal_difference: 0, points: 0, position: 0
            });
            await this.groupTeamRepo.save(groupTeam);
        }

        // Generate Round Robin Matches
        for (const group of groups) {
            const groupTeams = await this.groupTeamRepo.find({ where: { group: { id: group.id } }, relations: ["team"] });
            for (let i = 0; i < groupTeams.length; i++) {
                for (let j = i + 1; j < groupTeams.length; j++) {
                    const match = this.matchRepo.create({
                        tournament: tournament,
                        stage: stage,
                        group: group,
                        homeTeam: groupTeams[i].team,
                        awayTeam: groupTeams[j].team,
                        startTime: new Date() // Placeholder
                    });
                    await this.matchRepo.save(match);
                }
            }
        }
    }

    private async generateKnockoutPhase(tournament: Tournament) {
        const settings = tournament.format?.knockout_settings;
        if (!settings) throw new Error("Knockout settings missing");

        const stageOrder = tournament.format!.format_type === "groups_knockout" ? 2 : 1;

        // Create Stage
        const stage = this.stageRepo.create({
            format: tournament.format,
            stage_order: stageOrder,
            stage_type: "knockout",
            stage_name: "Knockout Stage",
            teams_count: settings.qualified_teams
        });
        await this.stageRepo.save(stage);

        // Math for brackets
        const numTeams = settings.qualified_teams;
        const roundsLog = Math.log2(numTeams);
        if (!Number.isInteger(roundsLog)) throw new Error("Number of knockout teams must be a power of 2");

        // Initialize Bracket Data Layer
        const bracketData: any = { rounds: [] };

        let matchCounter = 1;
        let previousRoundMatches: Match[] = [];

        // Loop from initial round (e.g. 16->8) down to final (2->1)
        for (let round = 1; round <= roundsLog; round++) {
            const teamsInRound = numTeams / Math.pow(2, round - 1);
            const matchesInRound = teamsInRound / 2;
            const roundName = this.getRoundName(teamsInRound);

            const currentRoundMatches: Match[] = [];
            const bracketRoundMatches: number[] = [];

            for (let m = 0; m < matchesInRound; m++) {
                const match = this.matchRepo.create({
                    tournament: tournament,
                    stage: stage,
                    startTime: new Date(),
                    round: round,
                    bracketPosition: matchCounter
                });
                await this.matchRepo.save(match);
                currentRoundMatches.push(match);
                bracketRoundMatches.push(matchCounter);

                // Sources
                if (round === 1) {
                    // First round of knockout gets sources from Groups or is TBD (TBD for Teams if pure knockout)
                    if (tournament.format!.format_type === "groups_knockout") {
                        const source1 = this.matchSourceRepo.create({
                            match: match, side: "home", source_type: "group_rank", source_value: "TBD" // Needs complex seeding logic
                        });
                        const source2 = this.matchSourceRepo.create({
                            match: match, side: "away", source_type: "group_rank", source_value: "TBD"
                        });
                        await this.matchSourceRepo.save([source1, source2]);
                    } else {
                        // Assign directly from registrations (simplified top down)
                        const team1 = tournament.teamRegistrations[(matchCounter - 1) * 2]?.team;
                        const team2 = tournament.teamRegistrations[(matchCounter - 1) * 2 + 1]?.team;

                        if (team1) {
                            match.homeTeam = team1;
                        }
                        if (team2) {
                            match.awayTeam = team2;
                        }
                        await this.matchRepo.save(match);
                    }
                } else {
                    // Subsequent rounds depend on winners of previous round
                    // E.g. semi-final 1 depends on quarter-final 1 and 2
                    const source1 = this.matchSourceRepo.create({
                        match: match, side: "home", source_type: "match_winner", source_value: previousRoundMatches[m * 2].id.toString()
                    });
                    const source2 = this.matchSourceRepo.create({
                        match: match, side: "away", source_type: "match_winner", source_value: previousRoundMatches[m * 2 + 1].id.toString()
                    });
                    await this.matchSourceRepo.save([source1, source2]);
                }
                matchCounter++;
            }

            bracketData.rounds.push({ name: roundName, matches: bracketRoundMatches });
            previousRoundMatches = currentRoundMatches;
        }

        const bracket = this.bracketRepo.create({
            tournament: tournament,
            stage: stage,
            structureData: bracketData
        });
        await this.bracketRepo.save(bracket);
    }

    private getRoundName(teamsCount: number): string {
        if (teamsCount === 2) return "Final";
        if (teamsCount === 4) return "Semi Final";
        if (teamsCount === 8) return "Quarter Final";
        return `Round of ${teamsCount}`;
    }

    async getStructure(tournamentId: string) {
        const tId = parseInt(tournamentId);
        const stages = await this.stageRepo.find({ where: { format: { tournament: { id: tId } } } });
        const groups = await this.groupRepo.find({ where: { tournament: { id: tId } }, relations: ["group_teams", "group_teams.team"] });
        const matches = await this.matchRepo.find({ where: { tournament: { id: tId } }, relations: ["homeTeam", "awayTeam", "group", "stage", "matchSources"] });
        const bracket = await this.bracketRepo.findOne({ where: { tournament: { id: tId } } });

        return { stages, groups, matches, bracket };
    }
}
