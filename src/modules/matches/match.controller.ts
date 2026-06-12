import { Request, Response } from "express";
import { AppDataSource } from "../../config/data-source";
import { Match, MatchStatus } from "./match.entity";
import { emitMatchUpdate } from "../../socket";
import { TeamMember } from "../teams/team-member.entity";

import { GroupTeam } from "../tournaments/group-team.entity";
import { Group } from "../tournaments/group.entity";
import { Team } from "../teams/team.entity";
import { MatchSource } from "./match-source.entity";
import { MatchEvent, MatchEventType } from "./match-event.entity";

/**
 * Determines the winning team of a completed match, honouring penalty
 * shootouts. Returns undefined for a genuine draw (no progression).
 */
function resolveWinner(match: Match): Team | undefined {
    const r = match.result; // PSO-aware getter on the Match entity
    if (r === "home") return match.homeTeam ?? undefined;
    if (r === "away") return match.awayTeam ?? undefined;
    return undefined;
}

/**
 * Applies (sign = +1) or reverts (sign = -1) the score effect of a scoring
 * event. GOAL/PENALTY credit the event's own side; OWN_GOAL credits the
 * opposite side. Scores are clamped at 0.
 */
function applyScoreDelta(
    match: Match,
    ev: { type: MatchEventType; teamSide?: string | null; team?: { id: number } | null },
    sign: number
): void {
    const isHome = ev.teamSide === "home" || (!!ev.team && !!match.homeTeam && ev.team.id === match.homeTeam.id);
    const isAway = ev.teamSide === "away" || (!!ev.team && !!match.awayTeam && ev.team.id === match.awayTeam.id);
    const credit = (side: "home" | "away") => {
        if (side === "home") match.homeScore = Math.max(0, (match.homeScore || 0) + sign);
        else match.awayScore = Math.max(0, (match.awayScore || 0) + sign);
    };
    if (ev.type === MatchEventType.GOAL || ev.type === MatchEventType.PENALTY) {
        if (isHome) credit("home");
        else if (isAway) credit("away");
    } else if (ev.type === MatchEventType.OWN_GOAL) {
        if (isHome) credit("away");
        else if (isAway) credit("home");
    }
}

/**
 * Once every group-stage match of a tournament is complete, resolves any
 * pending knockout slots seeded as "<groupName>#<rank>" into the actual
 * qualifying team from the final group standings. Idempotent.
 */
async function resolveGroupQualifiers(tournamentId: number): Promise<void> {
    const matchRepo = AppDataSource.getRepository(Match);
    const matchSourceRepo = AppDataSource.getRepository(MatchSource);
    const groupRepo = AppDataSource.getRepository(Group);
    const groupTeamRepo = AppDataSource.getRepository(GroupTeam);

    // Only resolve once the entire group stage is complete.
    const groupMatches = await matchRepo.find({
        where: { tournament: { id: tournamentId }, stage: { stage_type: "group" } },
        relations: ["stage"]
    });
    if (groupMatches.length === 0) return;
    if (groupMatches.some(m => m.status !== MatchStatus.COMPLETED)) return;

    const sources = await matchSourceRepo.find({
        where: { source_type: "group_rank" },
        relations: ["match", "match.tournament"]
    });
    const pending = sources.filter(s =>
        s.match?.tournament?.id === tournamentId &&
        s.source_value &&
        s.source_value !== "TBD"
    );
    if (pending.length === 0) return;

    const groups = await groupRepo.find({ where: { tournament: { id: tournamentId } } });

    for (const source of pending) {
        const [groupName, rankStr] = source.source_value.split("#");
        const rank = parseInt(rankStr, 10);
        if (!groupName || !Number.isInteger(rank) || rank < 1) continue;

        const group = groups.find(g => g.group_name === groupName);
        if (!group) continue;

        const standings = await groupTeamRepo.find({
            where: { group: { id: group.id } },
            relations: ["team"],
            order: { position: "ASC" }
        });
        const qualifier = standings[rank - 1]?.team;
        if (!qualifier) continue;

        const target = await matchRepo.findOne({ where: { id: source.match.id } });
        if (!target) continue;
        if (source.side === "home") target.homeTeam = qualifier;
        else if (source.side === "away") target.awayTeam = qualifier;
        await matchRepo.save(target);
    }
}

const formatMatch = (m: Match) => ({ 
    ...m, 
    result: m.result,
    matchEvents: m.matchEvents || [],
    matchSources: m.matchSources || []
});

/**
 * Recalculates group standings from scratch for a given group by replaying
 * all completed matches. This is idempotent — safe to call after any result update.
 */
async function recalculateGroupStandings(groupId: number): Promise<void> {
    const matchRepo = AppDataSource.getRepository(Match);
    const groupTeamRepo = AppDataSource.getRepository(GroupTeam);

    // Reset all standings in this group to zero
    const standings = await groupTeamRepo.find({
        where: { group: { id: groupId } },
        relations: ["team"]
    });

    for (const s of standings) {
        s.played = 0; s.wins = 0; s.draws = 0; s.losses = 0;
        s.goals_for = 0; s.goals_against = 0; s.goal_difference = 0; s.points = 0;
    }

    // Replay all completed matches in this group
    const completedMatches = await matchRepo.find({
        where: { group: { id: groupId }, status: MatchStatus.COMPLETED },
        relations: ["homeTeam", "awayTeam"]
    });

    for (const m of completedMatches) {
        const homeS = standings.find(s => s.team?.id === m.homeTeam?.id);
        const awayS = standings.find(s => s.team?.id === m.awayTeam?.id);
        if (!homeS || !awayS) continue;

        const hs = m.homeScore ?? 0;
        const as_ = m.awayScore ?? 0;

        homeS.played++; awayS.played++;
        homeS.goals_for += hs; homeS.goals_against += as_;
        awayS.goals_for += as_; awayS.goals_against += hs;
        homeS.goal_difference = homeS.goals_for - homeS.goals_against;
        awayS.goal_difference = awayS.goals_for - awayS.goals_against;

        if (hs > as_) {
            homeS.wins++; awayS.losses++;
            homeS.points += 3;
        } else if (as_ > hs) {
            awayS.wins++; homeS.losses++;
            awayS.points += 3;
        } else {
            homeS.draws++; awayS.draws++;
            homeS.points += 1; awayS.points += 1;
        }
    }

    // Update positions after sorting
    standings.sort((a, b) =>
        b.points - a.points ||
        b.goal_difference - a.goal_difference ||
        b.goals_for - a.goals_for
    );
    standings.forEach((s, i) => { s.position = i + 1; });

    await groupTeamRepo.save(standings);
}

/**
 * Helper to finalize a match: recalculate standings and handle knockout progression.
 */
async function finishMatch(match: Match): Promise<void> {
    const matchRepo = AppDataSource.getRepository(Match);
    const matchSourceRepo = AppDataSource.getRepository(MatchSource);

    // 1. Recalculate group standings if applicable
    if (match.group && match.homeTeam && match.awayTeam) {
        await recalculateGroupStandings(match.group.id);
    }

    // 1b. If a group match finished, try to promote qualifiers into the knockout bracket
    if (match.group) {
        const tId = match.tournament?.id
            ?? (await matchRepo.findOne({ where: { id: match.id }, relations: ["tournament"] }))?.tournament?.id;
        if (tId) await resolveGroupQualifiers(tId);
    }

    // 2. Handle knockout progression if applicable
    // We fetch relations again if they might be missing
    const fullMatch = await matchRepo.findOne({
        where: { id: match.id },
        relations: ["group", "stage", "homeTeam", "awayTeam"]
    });

    if (fullMatch && fullMatch.stage && fullMatch.stage.stage_type === "knockout") {
        const pendingSources = await matchSourceRepo.find({
            where: { source_type: "match_winner", source_value: fullMatch.id.toString() },
            relations: ["match"]
        });

        const winner = resolveWinner(fullMatch);
        if (winner) {
            for (const source of pendingSources) {
                const targetMatch = await matchRepo.findOne({ where: { id: source.match.id } });
                if (targetMatch) {
                    if (source.side === "home") targetMatch.homeTeam = winner;
                    if (source.side === "away") targetMatch.awayTeam = winner;
                    await matchRepo.save(targetMatch);
                }
            }
        }
    }
}

export const MatchController = {
    async getAll(req: Request, res: Response) {
        try {
            const { status, tournamentId, stageType, groupId } = req.query;
            const matchRepo = AppDataSource.getRepository(Match);
            const query = matchRepo.createQueryBuilder("match")
                .leftJoinAndSelect("match.homeTeam", "homeTeam")
                .leftJoinAndSelect("match.awayTeam", "awayTeam")
                .leftJoinAndSelect("match.stage", "stage")
                .leftJoinAndSelect("match.group", "group")
                .leftJoinAndSelect("match.tournament", "tournament");

            if (status) {
                query.andWhere("match.status = :status", { status });
            }
            if (tournamentId) {
                query.andWhere("match.tournament.id = :tournamentId", { tournamentId });
            }
            if (stageType) {
                query.andWhere("stage.stage_type = :stageType", { stageType });
            }
            if (groupId) {
                query.andWhere("group.id = :groupId", { groupId });
            }

            const matches = await query.orderBy("match.startTime", "ASC").getMany();

            if (status === 'scheduled') {
                // Group by YYYY-MM-DD
                const groupedMap = new Map<string, Match[]>();
                for (const match of matches) {
                    if (match.startTime) {
                        const dateObj = new Date(match.startTime);
                        const dateStr = dateObj.toISOString().split('T')[0];
                        
                        if (!groupedMap.has(dateStr)) {
                            groupedMap.set(dateStr, []);
                        }
                        groupedMap.get(dateStr)!.push(match);
                    }
                }

                // Sort dates ASC
                const sortedDates = Array.from(groupedMap.keys()).sort();
                
                const groupedArray = sortedDates.map(date => ({
                    date,
                    matches: groupedMap.get(date)!.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()).map(formatMatch)
                }));

                return res.json({ success: true, data: groupedArray });
            }

            return res.json({ success: true, data: matches.map(formatMatch) });
        } catch (error: any) {
            return res.status(500).json({ success: false, message: error.message });
        }
    },

    async getMatchById(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const matchRepo = AppDataSource.getRepository(Match);
            const match = await matchRepo.findOne({
                where: { id: Number(id) },
                relations: ["homeTeam", "awayTeam", "group", "stage", "tournament", "tournament.rules", "tournament.format", "matchEvents", "matchEvents.team"]
            });
            if (!match) return res.status(404).json({ success: false, message: "Match not found" });
            res.json({ success: true, data: formatMatch(match) });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    async updateResult(req: any, res: any) {
        try {
            const { id } = req.params;
            const { homeScore, awayScore, penaltyHome, penaltyAway, matchPeriod } = req.body;

            if (homeScore === undefined || awayScore === undefined) {
                return res.status(400).json({ success: false, message: "homeScore and awayScore are required" });
            }

            if (matchPeriod === "pso" && (penaltyHome === undefined || penaltyAway === undefined)) {
                return res.status(400).json({ success: false, message: "penaltyHome and penaltyAway are required for PSO" });
            }

            const matchRepo = AppDataSource.getRepository(Match);
            const matchSourceRepo = AppDataSource.getRepository(MatchSource);

            const match = await matchRepo.findOne({
                where: { id },
                relations: ["homeTeam", "awayTeam", "group", "stage", "tournament", "tournament.rules"]
            });

            if (!match) return res.status(404).json({ success: false, message: "Match not found" });

            match.homeScore = homeScore;
            match.awayScore = awayScore;
            match.penaltyHome = penaltyHome;
            match.penaltyAway = penaltyAway;
            match.endPeriod = matchPeriod || "ft";
            match.status = MatchStatus.COMPLETED;
            await matchRepo.save(match);

            // Idempotent: recalculate standings and propagate knockout winner
            await finishMatch(match);

            emitMatchUpdate(id.toString(), formatMatch(match));
            res.json({ success: true, data: formatMatch(match) });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    async updateMatch(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const updateData = req.body;

            const matchRepo = AppDataSource.getRepository(Match);
            const match = await matchRepo.findOne({
                where: { id: Number(id) },
                relations: ["homeTeam", "awayTeam", "group", "stage", "tournament", "tournament.rules"]
            });

            if (!match) {
                return res.status(404).json({ success: false, message: "Match not found" });
            }

            // Update only allowed generic properties
            if (updateData.startTime !== undefined) match.startTime = new Date(updateData.startTime);
            if (updateData.venue !== undefined) match.venue = updateData.venue;
            if (updateData.status !== undefined) {
                // If transitioning to live, set initial period and start time
                if (updateData.status === MatchStatus.LIVE && match.status === MatchStatus.SCHEDULED) {
                    match.match_period = "first_half" as any;
                    match.live_minute = 0;
                    match.periodStartedAt = new Date();
                }
                match.status = updateData.status;
            }
            if (updateData.matchReferees !== undefined) match.matchReferees = updateData.matchReferees;
            if (updateData.breakDuration !== undefined) match.breakDuration = updateData.breakDuration;

            // New Pre-Match metadata
            if (updateData.referees !== undefined) match.referees = updateData.referees;
            if (updateData.homeLineup !== undefined) match.homeLineup = updateData.homeLineup;
            if (updateData.awayLineup !== undefined) match.awayLineup = updateData.awayLineup;

            await matchRepo.save(match);

            // Finish logic must run after save: it re-queries the DB for completed
            // matches, so the new status has to be persisted first
            if (updateData.status === MatchStatus.COMPLETED) {
                await finishMatch(match);
            }

            res.status(200).json({ success: true, data: formatMatch(match), message: "Match updated successfully" });
            emitMatchUpdate(id.toString(), formatMatch(match));
        } catch (error: any) {
            console.error("Error updating match:", error);
            res.status(500).json({ success: false, message: "Internal server error" });
        }
    },

    async updateSchedule(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { venue, matchTime, startTime, breakDuration, matchReferees, referees, status } = req.body;

            const matchRepo = AppDataSource.getRepository(Match);
            const match = await matchRepo.findOne({ 
                where: { id: Number(id) },
                relations: ["homeTeam", "awayTeam", "group", "stage", "tournament", "tournament.rules"]
            });

            if (!match) return res.status(404).json({ success: false, message: "Match not found" });

            // A scheduled match must keep a venue — reject attempts to clear it
            if (venue !== undefined) {
                if (venue === null || String(venue).trim() === '') {
                    return res.status(400).json({ success: false, message: "Venue is required to schedule a match. Please select a venue." });
                }
                match.venue = String(venue).trim();
            }
            if (matchTime !== undefined && matchTime !== null && matchTime !== '') {
                const parsed = new Date(matchTime);
                if (!isNaN(parsed.getTime())) {
                    match.startTime = parsed;
                }
            } else if (startTime !== undefined && startTime !== null && startTime !== '') {
                const parsed = new Date(startTime);
                if (!isNaN(parsed.getTime())) {
                    match.startTime = parsed;
                }
            }
            if (breakDuration !== undefined) match.breakDuration = breakDuration;
            if (matchReferees !== undefined) match.matchReferees = matchReferees;
            if (referees !== undefined) match.referees = referees;
            
            if (status !== undefined) match.status = status;

            await matchRepo.save(match);

            const result = formatMatch(match);
            emitMatchUpdate(id.toString(), result);
            res.json({ success: true, data: result });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    async getMatchLineups(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const match = await AppDataSource.getRepository(Match).findOne({
                where: { id: Number(id) },
                relations: ["homeTeam", "awayTeam"]
            });

            if (!match) {
                return res.status(404).json({ success: false, message: "Match not found" });
            }

            res.status(200).json({
                success: true,
                data: {
                    homeTeam: match.homeTeam,
                    awayTeam: match.awayTeam,
                    homeLineup: match.homeLineup || null,
                    awayLineup: match.awayLineup || null
                }
            });
        } catch (error) {
            console.error("Error fetching match lineups:", error);
            res.status(500).json({ success: false, message: "Internal server error" });
        }
    },

    async getMatchH2H(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const matchRepo = AppDataSource.getRepository(Match);

            const match = await matchRepo.findOne({
                where: { id: Number(id) },
                relations: ["homeTeam", "awayTeam", "group", "tournament"]
            });

            if (!match || !match.homeTeam || !match.awayTeam) {
                return res.status(404).json({ success: false, message: "Match or teams not found" });
            }

            const homeTeamId = match.homeTeam.id;
            const awayTeamId = match.awayTeam.id;
            const tournamentId = match.tournament?.id;

            // Find previous matches between these two teams
            const previousMatches = await matchRepo.find({
                where: [
                    { homeTeam: { id: homeTeamId }, awayTeam: { id: awayTeamId }, status: "completed" as any },
                    { homeTeam: { id: awayTeamId }, awayTeam: { id: homeTeamId }, status: "completed" as any }
                ],
                order: { startTime: "DESC" },
                take: 5,
                relations: ["homeTeam", "awayTeam", "tournament"]
            });

            // Get recent form (last 5 matches) for Home Team - FILTERED BY TOURNAMENT
            const homeRecent = await matchRepo.find({
                where: [
                    { homeTeam: { id: homeTeamId }, status: "completed" as any, tournament: { id: tournamentId } },
                    { awayTeam: { id: homeTeamId }, status: "completed" as any, tournament: { id: tournamentId } }
                ],
                order: { startTime: "DESC" },
                take: 5,
                relations: ["homeTeam", "awayTeam"]
            });

            const homeForm = homeRecent.map(m => {
                if (m.homeScore === m.awayScore) return 'D';
                if (m.homeTeam?.id === homeTeamId) {
                    return m.homeScore > m.awayScore ? 'W' : 'L';
                } else {
                    return m.awayScore > m.homeScore ? 'W' : 'L';
                }
            });

            // Get recent form (last 5 matches) for Away Team - FILTERED BY TOURNAMENT
            const awayRecent = await matchRepo.find({
                where: [
                    { homeTeam: { id: awayTeamId }, status: "completed" as any, tournament: { id: tournamentId } },
                    { awayTeam: { id: awayTeamId }, status: "completed" as any, tournament: { id: tournamentId } }
                ],
                order: { startTime: "DESC" },
                take: 5,
                relations: ["homeTeam", "awayTeam"]
            });

            const awayForm = awayRecent.map(m => {
                if (m.homeScore === m.awayScore) return 'D';
                if (m.homeTeam?.id === awayTeamId) {
                    return m.homeScore > m.awayScore ? 'W' : 'L';
                } else {
                    return m.awayScore > m.homeScore ? 'W' : 'L';
                }
            });

            // Group Result / Standings
            let groupStandings = null;
            if (match.group) {
                const groupTeamRepo = AppDataSource.getRepository(GroupTeam);
                const teamsInGroup = await groupTeamRepo.find({
                    where: { group: { id: match.group.id } },
                    relations: ["team"],
                    order: {
                        points: "DESC",
                        goal_difference: "DESC",
                        goals_for: "DESC"
                    }
                });

                // Calculate form for each team in the group
                const standingsWithForm = await Promise.all(teamsInGroup.map(async (gt, index) => {
                    const teamId = gt.team?.id;
                    const recent = await matchRepo.find({
                        where: [
                            { homeTeam: { id: teamId }, status: "completed" as any, tournament: { id: tournamentId } },
                            { awayTeam: { id: teamId }, status: "completed" as any, tournament: { id: tournamentId } }
                        ],
                        order: { startTime: "DESC" },
                        take: 5,
                        relations: ["homeTeam", "awayTeam"]
                    });

                    const form = recent.map(m => {
                        if (m.homeScore === m.awayScore) return 'D';
                        if (m.homeTeam?.id === teamId) {
                            return m.homeScore > m.awayScore ? 'W' : 'L';
                        } else {
                            return m.awayScore > m.homeScore ? 'W' : 'L';
                        }
                    });

                    return {
                        position: index + 1,
                        teamId: gt.team?.id,
                        teamName: gt.team?.name,
                        teamLogo: gt.team?.logoUrl,
                        played: gt.played,
                        wins: gt.wins,
                        draws: gt.draws,
                        losses: gt.losses,
                        goalsFor: gt.goals_for,
                        goalsAgainst: gt.goals_against,
                        goalDifference: gt.goal_difference,
                        points: gt.points,
                        form: form
                    };
                }));

                groupStandings = {
                    groupName: match.group.group_name,
                    standings: standingsWithForm
                };
            }

            res.status(200).json({
                success: true,
                data: {
                    previousEncounters: previousMatches,
                    homeTeamForm: homeForm,
                    awayTeamForm: awayForm,
                    groupStandings: groupStandings
                }
            });
        } catch (error) {
            console.error("Error fetching match H2H:", error);
            res.status(500).json({ success: false, message: "Internal server error" });
        }
    },

    async getMatchEvents(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const eventRepo = AppDataSource.getRepository(MatchEvent);
            const events = await eventRepo.find({
                where: { match: { id: Number(id) } },
                relations: ["team"],
                order: { minute: "ASC" }
            });
            res.json({ success: true, data: events });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    async getMatchStats(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const matchRepo = AppDataSource.getRepository(Match);
            const eventRepo = AppDataSource.getRepository(MatchEvent);

            const match = await matchRepo.findOne({
                where: { id: Number(id) },
                relations: ["homeTeam", "awayTeam"]
            });
            if (!match) return res.status(404).json({ success: false, message: "Match not found" });

            const events = await eventRepo.find({
                where: { match: { id: Number(id) } },
                relations: ["team"]
            });

            // Aggregate stats by team side from events
            const stats: Record<string, { home: number; away: number }> = {
                goals:        { home: 0, away: 0 },
                yellowCards:  { home: 0, away: 0 },
                redCards:     { home: 0, away: 0 },
                corners:      { home: 0, away: 0 },
                offsides:     { home: 0, away: 0 },
                fouls:        { home: 0, away: 0 },
                freeKicks:    { home: 0, away: 0 },
                substitutions:{ home: 0, away: 0 },
                penalties:    { home: 0, away: 0 },
            };

            for (const ev of events) {
                // Determine side: prefer teamSide field, fallback to team FK match
                let side: "home" | "away" | null = null;
                if (ev.teamSide === "home") side = "home";
                else if (ev.teamSide === "away") side = "away";
                else if (ev.team) {
                    if (match.homeTeam && ev.team.id === match.homeTeam.id) side = "home";
                    else if (match.awayTeam && ev.team.id === match.awayTeam.id) side = "away";
                }
                if (!side) continue;

                switch (ev.type) {
                    case MatchEventType.GOAL:     stats.goals[side]++;        break;
                    case MatchEventType.OWN_GOAL: {
                        // own goal credits the opposite side
                        const oppSide = side === "home" ? "away" : "home";
                        stats.goals[oppSide]++;
                        break;
                    }
                    case MatchEventType.YELLOW_CARD: stats.yellowCards[side]++; break;
                    case MatchEventType.RED_CARD:    stats.redCards[side]++;    break;
                    case MatchEventType.CORNER:      stats.corners[side]++;     break;
                    case MatchEventType.OFFSIDE:     stats.offsides[side]++;    break;
                    case MatchEventType.FOUL:        stats.fouls[side]++;       break;
                    case MatchEventType.FREE_KICK:   stats.freeKicks[side]++;   break;
                    case MatchEventType.SUBSTITUTION: stats.substitutions[side]++; break;
                    case MatchEventType.PENALTY:     stats.penalties[side]++;   break;
                }
            }

            res.json({
                success: true,
                data: {
                    homeTeam: match.homeTeam?.name ?? "Home",
                    awayTeam: match.awayTeam?.name ?? "Away",
                    stats
                }
            });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    async addMatchEvent(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const eventData = req.body;

            const matchRepo = AppDataSource.getRepository(Match);
            const match = await matchRepo.findOne({ where: { id: Number(id) }, relations: ["homeTeam", "awayTeam"] });
            if (!match) return res.status(404).json({ success: false, message: "Match not found" });

            const eventRepo = AppDataSource.getRepository(MatchEvent);
            
            // Map frontend fields (team, teamId) to entity fields (teamSide, team relation)
            const { team, teamId, ...otherData } = eventData;
            
            const newEvent = eventRepo.create({
                ...otherData,
                teamSide: team as any, // 'home' or 'away'
                team: teamId ? { id: Number(teamId) } as any : undefined,
                match: { id: match.id } as any
            }) as any;
            
            const savedEvent = await eventRepo.save(newEvent);

            if (savedEvent.type === MatchEventType.GOAL) {
                if (team === 'home') {
                    match.homeScore = (match.homeScore || 0) + 1;
                } else if (team === 'away') {
                    match.awayScore = (match.awayScore || 0) + 1;
                }
                await matchRepo.save(match);
            } else if (savedEvent.type === MatchEventType.OWN_GOAL) {
                if (team === 'home') {
                    match.awayScore = (match.awayScore || 0) + 1;
                } else if (team === 'away') {
                    match.homeScore = (match.homeScore || 0) + 1;
                }
                await matchRepo.save(match);
            } else if (savedEvent.type === MatchEventType.SUBSTITUTION && savedEvent.assistPlayerName) {
                let lineupObj = null;
                try {
                    lineupObj = team === 'home' ? 
                        (typeof match.homeLineup === 'string' ? JSON.parse(match.homeLineup) : match.homeLineup) : 
                        (typeof match.awayLineup === 'string' ? JSON.parse(match.awayLineup) : match.awayLineup);
                } catch(e) {}

                if (lineupObj && lineupObj.starting && lineupObj.subs) {
                    const teamMemberRepo = AppDataSource.getRepository(TeamMember);
                    const playerOut = await teamMemberRepo.findOne({ where: { name: savedEvent.playerName, team: { id: Number(teamId) } } });
                    const playerIn = await teamMemberRepo.findOne({ where: { name: savedEvent.assistPlayerName, team: { id: Number(teamId) } } });

                    const outIdx = lineupObj.starting.findIndex((el: any) => 
                        (el.name === savedEvent.playerName) || 
                        (playerOut && (el?.toString() === playerOut.id?.toString()))
                    );

                    const inIdx = lineupObj.subs.findIndex((el: any) => 
                        (el.name === savedEvent.assistPlayerName) || 
                        (playerIn && (el?.toString() === playerIn.id?.toString()))
                    );

                    if (outIdx !== -1 && inIdx !== -1) {
                         const outObj = lineupObj.starting[outIdx];
                         const inObj = lineupObj.subs[inIdx];

                         lineupObj.starting.splice(outIdx, 1);
                         lineupObj.subs.splice(inIdx, 1);

                         lineupObj.starting.push(inObj);
                         lineupObj.subs.push(outObj);
                        
                        if (team === 'home') match.homeLineup = lineupObj;
                        if (team === 'away') match.awayLineup = lineupObj;
                        
                        await matchRepo.save(match);
                    }
                }
            }

            res.status(201).json({ success: true, data: savedEvent });
            emitMatchUpdate(id.toString(), { event: savedEvent, type: 'event_added' });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    async updateMatchEvent(req: Request, res: Response) {
        try {
            const { id, eventId } = req.params;
            const updateData = req.body;
            const eventRepo = AppDataSource.getRepository(MatchEvent);
            const matchRepo = AppDataSource.getRepository(Match);

            const event = await eventRepo.findOne({ where: { id: Number(eventId) }, relations: ["team"] });
            if (!event) return res.status(404).json({ success: false, message: "Event not found" });

            const match = await matchRepo.findOne({ where: { id: Number(id) }, relations: ["homeTeam", "awayTeam"] });

            // Snapshot the old scoring effect so it can be reverted after the edit
            const oldSnapshot = { type: event.type, teamSide: event.teamSide, team: event.team };

            const { team, teamId, ...otherData } = updateData;

            if (team) event.teamSide = team as any;
            if (teamId) event.team = { id: Number(teamId) } as any;

            Object.assign(event, otherData);
            await eventRepo.save(event);

            // Re-sync the match score: revert the old effect, then apply the new one
            if (match) {
                applyScoreDelta(match, oldSnapshot, -1);
                applyScoreDelta(match, { type: event.type, teamSide: event.teamSide, team: event.team }, +1);
                await matchRepo.save(match);
                emitMatchUpdate(id.toString(), formatMatch(match));
            }

            res.json({ success: true, data: event });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    async deleteMatchEvent(req: Request, res: Response) {
        try {
            const { id, eventId } = req.params;
            const eventRepo = AppDataSource.getRepository(MatchEvent);
            const matchRepo = AppDataSource.getRepository(Match);

            const event = await eventRepo.findOne({ 
                where: { id: Number(eventId) }, 
                relations: ["team"] 
            });
            if (!event) return res.status(404).json({ success: false, message: "Event not found" });

            const match = await matchRepo.findOne({ 
                where: { id: Number(id) }, 
                relations: ["homeTeam", "awayTeam"] 
            });

            // If it was a goal, decrement the score
            if (match && event.type === MatchEventType.GOAL) {
                const isHomeGoal = (event.team && match.homeTeam && event.team.id === match.homeTeam.id) || (event.teamSide === 'home');
                const isAwayGoal = (event.team && match.awayTeam && event.team.id === match.awayTeam.id) || (event.teamSide === 'away');

                if (isHomeGoal) {
                    match.homeScore = Math.max(0, (match.homeScore || 0) - 1);
                } else if (isAwayGoal) {
                    match.awayScore = Math.max(0, (match.awayScore || 0) - 1);
                }
                await matchRepo.save(match);
            } else if (match && event.type === MatchEventType.OWN_GOAL) {
                const isHomeGoal = (event.team && match.homeTeam && event.team.id === match.homeTeam.id) || (event.teamSide === 'home');
                const isAwayGoal = (event.team && match.awayTeam && event.team.id === match.awayTeam.id) || (event.teamSide === 'away');

                if (isHomeGoal) {
                    match.awayScore = Math.max(0, (match.awayScore || 0) - 1);
                } else if (isAwayGoal) {
                    match.homeScore = Math.max(0, (match.homeScore || 0) - 1);
                }
                await matchRepo.save(match);
            }

            await eventRepo.remove(event);
            res.json({ success: true, message: "Event deleted successfully" });
            emitMatchUpdate(id.toString(), { type: 'event_deleted', eventId });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    async endMatch(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const matchRepo = AppDataSource.getRepository(Match);
            const matchSourceRepo = AppDataSource.getRepository(MatchSource);

            const match = await matchRepo.findOne({ 
                where: { id: Number(id) },
                relations: ["homeTeam", "awayTeam", "group", "stage", "tournament", "tournament.rules"]
            });
            if (!match) return res.status(404).json({ success: false, message: "Match not found" });

            match.status = MatchStatus.COMPLETED;
            await matchRepo.save(match);

            // Recalculate group standings from scratch after ending the match
            if (match.group && match.homeTeam && match.awayTeam) {
                await recalculateGroupStandings(match.group.id);
            }

            // If a group match ended, try to promote qualifiers into the knockout bracket
            if (match.group && match.tournament) {
                await resolveGroupQualifiers(match.tournament.id);
            }

            // Propagate winner to knockout next round (PSO-aware; no advance on a true draw)
            if (match.stage && match.stage.stage_type === "knockout") {
                const pendingSources = await matchSourceRepo.find({
                    where: { source_type: "match_winner", source_value: match.id.toString() },
                    relations: ["match"]
                });
                const winner = resolveWinner(match);
                if (winner) {
                    for (const source of pendingSources) {
                        const targetMatch = await matchRepo.findOne({ where: { id: source.match.id } });
                        if (targetMatch) {
                            if (source.side === "home") targetMatch.homeTeam = winner;
                            if (source.side === "away") targetMatch.awayTeam = winner;
                            await matchRepo.save(targetMatch);
                        }
                    }
                }
            }

            res.json({ success: true, data: formatMatch(match), message: "Match ended successfully" });
            emitMatchUpdate(id.toString(), formatMatch(match));
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    async updateLiveState(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { homeScore, awayScore, live_minute, match_period, addedMinutes, penaltyShootout } = req.body;

            const matchRepo = AppDataSource.getRepository(Match);
            const match = await matchRepo.findOne({
                where: { id: Number(id) },
                relations: ["homeTeam", "awayTeam", "group", "stage", "tournament", "tournament.rules"]
            });

            if (!match) {
                return res.status(404).json({ success: false, message: "Match not found" });
            }

            if (match.status !== MatchStatus.LIVE) {
                return res.status(400).json({ success: false, message: "Match is not live" });
            }

            if (homeScore !== undefined) match.homeScore = Number(homeScore);
            if (awayScore !== undefined) match.awayScore = Number(awayScore);
            if (live_minute !== undefined) match.live_minute = Number(live_minute);
            if (match_period !== undefined) {
                match.match_period = match_period;
                match.periodStartedAt = new Date();
            }

            // Referee added/stoppage time (null/0 clears it)
            if (addedMinutes !== undefined) {
                match.addedMinutes = addedMinutes === null ? undefined : Number(addedMinutes);
            }

            // Penalty shootout: store the kick log and recompute the tally from it
            if (penaltyShootout !== undefined) {
                const kicks: any[] = Array.isArray(penaltyShootout?.kicks) ? penaltyShootout.kicks : [];
                match.penaltyShootout = { kicks };
                match.penaltyHome = kicks.filter(k => k.team === "home" && k.scored).length;
                match.penaltyAway = kicks.filter(k => k.team === "away" && k.scored).length;
                match.endPeriod = "pso";
            }

            await matchRepo.save(match);

            if (match) {
                emitMatchUpdate(id.toString(), formatMatch(match));
            }
            return res.json({ success: true, data: match ? formatMatch(match) : null });
        } catch (error: any) {
            return res.status(500).json({ success: false, message: error.message });
        }
    }
};
