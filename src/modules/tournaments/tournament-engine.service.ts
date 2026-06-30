import { AppDataSource } from "../../config/data-source";
import { Team } from "../teams/team.entity";
import { Tournament } from "./tournament.entity";
import { TournamentFormat } from "./tournament-format.entity";
import { FormatStage } from "./format-stage.entity";
import { Group } from "./group.entity";
import { GroupTeam } from "./group-team.entity";
import { Match } from "../matches/match.entity";
import { MatchSource } from "../matches/match-source.entity";
import { Bracket } from "../brackets/bracket.entity";
import { TournamentVenue } from "./venues/venue.entity";

export class TournamentEngineService {
    private tournamentRepo = AppDataSource.getRepository(Tournament);
    private formatRepo = AppDataSource.getRepository(TournamentFormat);
    private stageRepo = AppDataSource.getRepository(FormatStage);
    private groupRepo = AppDataSource.getRepository(Group);
    private groupTeamRepo = AppDataSource.getRepository(GroupTeam);
    private matchRepo = AppDataSource.getRepository(Match);
    private matchSourceRepo = AppDataSource.getRepository(MatchSource);
    private bracketRepo = AppDataSource.getRepository(Bracket);
    private venueRepo = AppDataSource.getRepository(TournamentVenue);

    async generateStructure(tournamentId: string, scheduleConfig?: any) {
        const tournament = await this.tournamentRepo.findOne({
            where: { id: parseInt(tournamentId) },
            relations: ["format", "format.group_settings", "format.knockout_settings", "teamRegistrations", "teamRegistrations.team"]
        });

        if (!tournament || !tournament.format) {
            throw new Error("Tournament or format not found");
        }

        // Generate with whatever is approved (minimum two to form a match). The
        // bracket is built in full; slots without a team yet stay TBD and fill in
        // as more teams are approved and the structure is regenerated, or as
        // earlier matches are completed.
        const approvedTeams = tournament.teamRegistrations.filter(tr => tr.status === 'approved');
        if (approvedTeams.length < 2) {
            throw new Error(`Need at least 2 approved teams before generating the structure. Currently have ${approvedTeams.length}.`);
        }

        // Matches are played at the tournament venue — validate it exists before
        // touching the existing structure when auto-scheduling is requested
        if (scheduleConfig && scheduleConfig.startDate) {
            const venueNames = await this.getVenueAssignmentNames(tournamentId);
            if (venueNames.length === 0) {
                throw new Error("Venue details are required to schedule matches. Please add the tournament venue first.");
            }
        }

        // Clean slate: delete all existing structure for this tournament
        await this.purgeExistingStructure(parseInt(tournamentId));

        if (tournament.format.format_data && Array.isArray(tournament.format.format_data) && tournament.format.format_data.length > 0) {
            // Intelligent Custom Generator based on visual board
            await this.generateFromFormatData(tournament, tournament.format.format_data);
        } else {
            // Legacy Switch based on enum format type
            if (tournament.format.format_type === "groups") {
                await this.generateGroupsPhase(tournament);
            } else if (tournament.format.format_type === "groups_knockout") {
                await this.generateGroupsPhase(tournament);
                await this.generateKnockoutPhase(tournament);
            } else if (tournament.format.format_type === "knockout") {
                await this.generateKnockoutPhase(tournament);
            }
        }

        if (scheduleConfig && scheduleConfig.startDate) {
            await this.applyAutoSchedule(tournamentId, scheduleConfig);
        }

        return this.getStructure(tournamentId);
    }

    private async purgeExistingStructure(tournamentId: number) {
        // Delete all matches, groups, and stages associated with the tournament
        // Matches have dependencies on MatchSource and GroupTeam (via cascading or manually)

        // Find existing matches
        const matches = await this.matchRepo.find({ where: { tournament: { id: tournamentId } } });
        if (matches.length > 0) {
            const matchIds = matches.map(m => m.id);
            
            // Delete match sources first to avoid relation issues if DB cascade isn't perfect
            await this.matchSourceRepo.createQueryBuilder()
                .delete()
                .where("match_id IN (:...ids)", { ids: matchIds })
                .execute();

            await this.matchRepo.delete(matchIds);
        }

        const groups = await this.groupRepo.find({ where: { tournament: { id: tournamentId } } });
        if (groups.length > 0) {
            const groupIds = groups.map(g => g.id);
            for (const groupId of groupIds) {
                await this.groupTeamRepo.delete({ group: { id: groupId } });
            }
            await this.groupRepo.delete(groupIds);
        }

        // Stages belong to the tournament's format — delete them directly.
        await AppDataSource.query(`DELETE FROM format_stages WHERE format_id IN (SELECT id FROM tournament_formats WHERE tournament_id = ?)`, [tournamentId]);
    }

    private async generateFromFormatData(tournament: Tournament, formatData: any[]) {
        const teamsMap = new Map<string, Team>();
        for (const reg of tournament.teamRegistrations) {
            if (reg.team && reg.status === 'approved') teamsMap.set(reg.team.name, reg.team);
        }

        // Track which teams are explicitly assigned
        const explicitlyAssigned = new Set<string>();
        for (const phase of formatData) {
            if (phase.kind === 'group' && phase.groups) {
                for (const group of phase.groups) {
                    for (const slot of group.slots) {
                        if (slot.label !== 'EMPTY SLOT') explicitlyAssigned.add(slot.label);
                    }
                }
            } else if (phase.kind === 'knockout' && phase.rounds && phase.rounds.length > 0) {
                for (const match of phase.rounds[0].matches) {
                    if (match.home !== 'EMPTY SLOT') explicitlyAssigned.add(match.home);
                    if (match.away !== 'EMPTY SLOT') explicitlyAssigned.add(match.away);
                }
            }
        }

        let unassignedTeams = Array.from(teamsMap.values()).filter(t => !explicitlyAssigned.has(t.name));
        unassignedTeams.sort(() => Math.random() - 0.5);

        let stageOrder = 1;
        for (const phase of formatData) {
            const isGroup = phase.kind === 'group';

            // Create Stage
            const stage = this.stageRepo.create({
                format: tournament.format,
                stage_order: stageOrder++,
                stage_type: isGroup ? "group" : "knockout",
                stage_name: phase.name || (isGroup ? "Group Stage" : "Knockout Stage"),
                // Bracket size = slots in the first knockout round (matches * 2); used
                // to derive round names/labels (QF/SF/F). Groups don't need it.
                teams_count: isGroup ? 0 : ((phase.rounds?.[0]?.matches?.length || 0) * 2)
            });
            await this.stageRepo.save(stage);

            if (isGroup && phase.groups) {
                for (const groupData of phase.groups) {
                    const group = this.groupRepo.create({
                        tournament: tournament,
                        stage: stage,
                        group_name: groupData.name
                    });
                    const savedGroup = await this.groupRepo.save(group);

                    // Map slots to actual teams
                    const assignedTeams: Team[] = [];
                    for (const slot of groupData.slots) {
                        let team = teamsMap.get(slot.label);
                        if (!team && slot.label === 'EMPTY SLOT' && unassignedTeams.length > 0) {
                            team = unassignedTeams.pop();
                            if (team) slot.label = team.name;
                        }
                        if (team) {
                            assignedTeams.push(team);
                            const groupTeam = this.groupTeamRepo.create({
                                group: savedGroup,
                                team: team,
                                played: 0, wins: 0, draws: 0, losses: 0,
                                goals_for: 0, goals_against: 0, goal_difference: 0, points: 0, position: 0
                            });
                            await this.groupTeamRepo.save(groupTeam);
                        }
                    }

                    // Generate Round Robin Matches for assigned teams
                    for (let i = 0; i < assignedTeams.length; i++) {
                        for (let j = i + 1; j < assignedTeams.length; j++) {
                            const match = this.matchRepo.create({
                                tournament: tournament,
                                stage: stage,
                                group: savedGroup,
                                homeTeam: assignedTeams[i],
                                awayTeam: assignedTeams[j],
                                startTime: new Date() // Will be overwritten by Auto Schedule
                            });
                            await this.matchRepo.save(match);
                        }
                    }
                }
            } else if (!isGroup && phase.rounds) {
                // Knockout logic based closely on UI rounds. The visual board encodes
                // each later-round slot as "Winner Match <id>" referencing an earlier
                // round's match id (e.g. "Winner Match M1" -> round-data match "m1").
                // We turn those references into match_winner sources so that completing
                // a match auto-advances the winner into the next round (see finishMatch
                // in match.controller). Without these links the bracket never fills.
                const matchIdMap = new Map<string, Match>();
                const refMatchId = (label?: string): string | null => {
                    if (!label || label === 'EMPTY SLOT') return null;
                    const tokens = label.match(/m\s*\d+/gi);
                    if (!tokens || tokens.length === 0) return null;
                    return tokens[tokens.length - 1].replace(/\s+/g, "").toLowerCase();
                };

                let roundIdx = 1;
                for (const roundData of phase.rounds) {
                    let matchCounter = 1;
                    for (const matchData of roundData.matches) {
                        const match = this.matchRepo.create({
                            tournament: tournament,
                            stage: stage,
                            round: roundIdx,
                            bracketPosition: matchCounter++,
                            startTime: new Date()
                        });

                        const homeLabel = matchData.home;
                        let homeTeam = teamsMap.get(homeLabel);
                        if (!homeTeam && homeLabel === 'EMPTY SLOT' && unassignedTeams.length > 0) {
                            homeTeam = unassignedTeams.pop();
                            if (homeTeam) matchData.home = homeTeam.name;
                        }
                        if (homeTeam) match.homeTeam = homeTeam;

                        const awayLabel = matchData.away;
                        let awayTeam = teamsMap.get(awayLabel);
                        if (!awayTeam && awayLabel === 'EMPTY SLOT' && unassignedTeams.length > 0) {
                            awayTeam = unassignedTeams.pop();
                            if (awayTeam) matchData.away = awayTeam.name;
                        }
                        if (awayTeam) match.awayTeam = awayTeam;

                        await this.matchRepo.save(match);
                        if (matchData.id) matchIdMap.set(String(matchData.id).toLowerCase(), match);

                        // Wire each still-empty slot to the winner of the earlier match
                        // it references, so finishMatch can propagate the winner forward.
                        const sources: MatchSource[] = [];
                        if (!match.homeTeam) {
                            const feeder = matchIdMap.get(refMatchId(homeLabel) ?? "");
                            if (feeder) sources.push(this.matchSourceRepo.create({
                                match, side: "home", source_type: "match_winner", source_value: feeder.id.toString()
                            }));
                        }
                        if (!match.awayTeam) {
                            const feeder = matchIdMap.get(refMatchId(awayLabel) ?? "");
                            if (feeder) sources.push(this.matchSourceRepo.create({
                                match, side: "away", source_type: "match_winner", source_value: feeder.id.toString()
                            }));
                        }
                        if (sources.length > 0) await this.matchSourceRepo.save(sources);
                    }
                    roundIdx++;
                }
            }
        }

        // Save the updated format configuration with dynamically assigned teams
        if (tournament.format) {
            tournament.format.format_data = formatData;
            await this.formatRepo.save(tournament.format);
        }
    }

    // Venue names matches can be assigned to: the primary venue, or one entry per
    // managed pitch when multiple pitches are enabled. Empty if no venue is set up.
    private async getVenueAssignmentNames(tournamentId: string): Promise<string[]> {
        const venue = await this.venueRepo.findOne({
            where: { tournament: { id: parseInt(tournamentId) } }
        });
        const primary = venue?.primaryVenueName?.trim();
        if (!primary) return [];

        if (venue!.multipleVenuesEnabled && Array.isArray(venue!.pitches) && venue!.pitches.length > 0) {
            const pitchNames = venue!.pitches
                .map(p => p?.name?.trim())
                .filter((n): n is string => !!n)
                .map(n => `${primary} - ${n}`);
            if (pitchNames.length > 0) return pitchNames;
        }
        return [primary];
    }

    private async applyAutoSchedule(tournamentId: string, config: any) {
        const matches = await this.matchRepo.find({
            where: { tournament: { id: parseInt(tournamentId) } },
            relations: ["stage", "group"],
            order: {
                stage: { stage_order: "ASC" },
                round: "ASC",
                group: { group_name: "ASC" },
                id: "ASC"
            }
        });

        if (matches.length === 0) {
            console.log("[AutoSchedule] No matches found for tournament", tournamentId);
            return;
        }

        console.log(`[AutoSchedule] Found ${matches.length} matches. Starting config:`, config);

        // Assign each match to one of the tournament's venues/pitches
        const venueNames = await this.getVenueAssignmentNames(tournamentId);
        if (venueNames.length === 0) {
            throw new Error("Venue details are required to schedule matches. Please add the tournament venue first.");
        }
        let venueIdx = 0;

        // Pre-fill every generated match with the break duration and referees that
        // were already configured on the Schedule step.
        const tournament = await this.tournamentRepo.findOneBy({ id: parseInt(tournamentId) });
        const refNames: string[] = (Array.isArray(tournament?.referees) ? tournament!.referees : [])
            .map((r: any) => r?.name?.trim())
            .filter((n: any): n is string => !!n);
        const assignedReferees = refNames.length > 0 ? {
            main: refNames[0] || '',
            assistant1: refNames[1] || '',
            assistant2: refNames[2] || '',
            fourthOfficial: refNames[3] || ''
        } : null;
        const breakDuration = Number(config.breakTime) > 0 ? Number(config.breakTime) : null;

        let currentDate = new Date(config.startDate);
        const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
        const allowedDays = (config.matchDays && Object.values(config.matchDays).some(v => v))
            ? config.matchDays
            : { 'MON': true, 'TUE': true, 'WED': true, 'THU': true, 'FRI': true, 'SAT': true, 'SUN': true };
        const timeSlots = (config.timeSlots || "18:00").split(',').map((s: string) => s.trim()).filter((s: string) => s);
        if (timeSlots.length === 0) timeSlots.push("18:00");

        let currentSlotIdx = 0;

        for (const match of matches) {
            let assigned = false;
            let loopCounter = 0;
            // Find next valid day and time
            while (!assigned && loopCounter < 1000) {
                loopCounter++;
                const dayStr = dayNames[currentDate.getDay()];
                if (allowedDays[dayStr]) {
                    if (currentSlotIdx < timeSlots.length) {
                        const timeStr = timeSlots[currentSlotIdx];
                        const [hh, mm] = timeStr.split(':').map(Number);

                        const matchTime = new Date(currentDate);
                        matchTime.setHours(hh || 12, mm || 0, 0, 0);

                        match.startTime = matchTime;
                        match.venue = venueNames[venueIdx % venueNames.length];
                        venueIdx++;
                        assigned = true;
                        console.log(`[AutoSchedule] Assigned Match ${match.id} to ${matchTime.toISOString()} (${dayStr}) at ${match.venue}`);

                        currentSlotIdx++;
                    }
                }

                if (!assigned) {
                    // Move to next day
                    currentDate.setDate(currentDate.getDate() + 1);
                    currentSlotIdx = 0;
                }
            }
            if (!assigned) console.log(`[AutoSchedule] Failed to assign match ${match.id}`);

            // Carry the configured break duration and referee assignment onto each match.
            if (breakDuration !== null) match.breakDuration = breakDuration;
            if (assignedReferees) {
                match.referees = assignedReferees;
                match.matchReferees = assignedReferees.main;
            }
            await this.matchRepo.save(match);
        }
        console.log("[AutoSchedule] Completed auto-scheduling.");
    }
    private async generateGroupsPhase(tournament: Tournament) {
        let settings = tournament.format?.group_settings;
        if (!settings) {
            console.log("[TournamentEngine] Group settings missing, creating defaults...");
            const regCount = tournament.teamRegistrations?.length || 8;
            settings = {
                total_teams: regCount,
                groups_count: Math.max(1, Math.ceil(regCount / 4)),
                teams_per_group: 4,
                advancing_teams: 2
            } as any;
        }

        // Create Stage
        const stage = this.stageRepo.create({
            format: tournament.format!,
            stage_order: 1,
            stage_type: "group",
            stage_name: "Group Stage",
            teams_count: settings!.total_teams
        });
        await this.stageRepo.save(stage);

        // Create Groups
        const numGroups = settings!.groups_count;
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

        // Assign Teams (Basic Round Robin distribution) — only approved registrations
        const teams = tournament.teamRegistrations
            .filter(tr => tr.status === 'approved')
            .map(tr => tr.team);
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
        let settings = tournament.format?.knockout_settings;
        if (!settings) {
            console.log("[TournamentEngine] Knockout settings missing, creating defaults...");
            const regCount = tournament.teamRegistrations?.length || 0;
            // Find largest power of 2 <= regCount
            let qTeams = regCount > 0 ? Math.pow(2, Math.floor(Math.log2(regCount))) : 2;
            if (qTeams < 2) qTeams = 2; // minimum
            
            settings = {
                qualified_teams: qTeams,
                seeding_type: "random",
                third_place_match: false
            } as any;
        }

        const stageOrder = tournament.format!.format_type === "groups_knockout" ? 2 : 1;

        // Create Stage
        const stage = this.stageRepo.create({
            format: tournament.format!,
            stage_order: stageOrder,
            stage_type: "knockout",
            stage_name: "Knockout Stage",
            teams_count: settings!.qualified_teams
        });
        await this.stageRepo.save(stage);

        // Math for brackets
        const numTeams = settings!.qualified_teams;
        const roundsLog = Math.log2(numTeams);
        if (!Number.isInteger(roundsLog)) throw new Error("Number of knockout teams must be a power of 2");

        // Approved registrations (used for pure-knockout direct seeding)
        const approvedRegs = (tournament.teamRegistrations || []).filter(tr => tr.status === 'approved');

        // For groups_knockout, capture the group names (sorted) so round-1 slots can be
        // seeded as "<groupName>#<rank>" and later resolved from final group standings.
        let groupSeeds: string[] = [];
        if (tournament.format!.format_type === "groups_knockout") {
            const grps = await this.groupRepo.find({
                where: { tournament: { id: tournament.id } },
                relations: ["stage"]
            });
            groupSeeds = grps
                .filter(g => g.stage?.stage_type === "group")
                .map(g => g.group_name)
                .sort((a, b) => a.localeCompare(b));
        }

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
                    // First round of knockout gets sources from Groups or direct teams (pure knockout)
                    if (tournament.format!.format_type === "groups_knockout") {
                        // Standard cross-group seeding: winner of group m vs runner-up of the
                        // next group, keeping a group's winner and runner-up apart in round 1.
                        const numGroups = groupSeeds.length || 1;
                        const homeGroup = groupSeeds[m % numGroups];
                        const awayGroup = groupSeeds[(m + 1) % numGroups];
                        const source1 = this.matchSourceRepo.create({
                            match: match, side: "home", source_type: "group_rank",
                            source_value: homeGroup ? `${homeGroup}#1` : "TBD"
                        });
                        const source2 = this.matchSourceRepo.create({
                            match: match, side: "away", source_type: "group_rank",
                            source_value: awayGroup ? `${awayGroup}#2` : "TBD"
                        });
                        await this.matchSourceRepo.save([source1, source2]);
                    } else {
                        // Assign directly from approved registrations (simplified top down)
                        const team1 = approvedRegs[(matchCounter - 1) * 2]?.team;
                        const team2 = approvedRegs[(matchCounter - 1) * 2 + 1]?.team;

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

        const mappedMatches = matches.map(match => {
            if (match.stage?.stage_type === "knockout") {
                // Show every knockout match, even with no teams yet, so the full
                // bracket is visible up front. Empty slots are labelled TBD (or
                // "Winner of <match>" when they feed off an earlier result).
                const m: any = { ...match };

                const slotLabel = (side: "home" | "away"): string => {
                    const src = match.matchSources?.find(s => s.side === side && s.source_type === "match_winner");
                    if (src) {
                        const prevMatch = matches.find(pm => pm.id.toString() === src.source_value);
                        if (prevMatch) {
                            const abbr = this.getRoundAbbr(prevMatch);
                            return `Winner of ${abbr}${prevMatch.bracketPosition || ''}`;
                        }
                    }
                    return "TBD";
                };

                if (!m.homeTeam) m.homeTeam = { label: slotLabel("home"), slot: match.bracketPosition };
                if (!m.awayTeam) m.awayTeam = { label: slotLabel("away"), slot: match.bracketPosition };

                return m;
            }
            return match;
        }).filter(m => m !== null);

        return { stages, groups, matches: mappedMatches, bracket };
    }

    private getRoundAbbr(match: Match): string {
        const teamsCount = match.stage?.teams_count || 16;
        const currentTeams = teamsCount / Math.pow(2, (match.round || 1) - 1);
        if (currentTeams === 2) return "F";
        if (currentTeams === 4) return "SF";
        if (currentTeams === 8) return "QF";
        return `R${currentTeams}-`;
    }
}
