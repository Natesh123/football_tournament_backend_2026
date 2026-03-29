import { Request, Response } from "express";
import { AppDataSource } from "../../config/data-source";
import { Match, MatchStatus } from "./match.entity";
import { GroupTeam } from "../tournaments/group-team.entity";
import { MatchSource } from "./match-source.entity";
import { MatchEvent, MatchEventType } from "./match-event.entity";

const formatMatch = (m: Match) => ({ ...m, result: m.result });

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
                relations: ["homeTeam", "awayTeam", "group", "stage", "tournament"]
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
            const { homeScore, awayScore } = req.body;

            const matchRepo = AppDataSource.getRepository(Match);
            const groupTeamRepo = AppDataSource.getRepository(GroupTeam);
            const matchSourceRepo = AppDataSource.getRepository(MatchSource);

            const match = await matchRepo.findOne({
                where: { id },
                relations: ["homeTeam", "awayTeam", "group", "stage", "tournament"]
            });

            if (!match) return res.status(404).json({ success: false, message: "Match not found" });

            match.homeScore = homeScore;
            match.awayScore = awayScore;
            match.status = "completed" as any;
            await matchRepo.save(match);

            // If group match, update standings
            if (match.group && match.homeTeam && match.awayTeam) {
                const homeStanding = await groupTeamRepo.findOne({ where: { group: { id: match.group.id }, team: { id: match.homeTeam.id } } });
                const awayStanding = await groupTeamRepo.findOne({ where: { group: { id: match.group.id }, team: { id: match.awayTeam.id } } });

                if (homeStanding && awayStanding) {
                    // Remove logic for reversing old scores omitted for simplicity in this initial MVP
                    homeStanding.played += 1;
                    awayStanding.played += 1;
                    homeStanding.goals_for += homeScore;
                    homeStanding.goals_against += awayScore;
                    homeStanding.goal_difference += (homeScore - awayScore);
                    awayStanding.goals_for += awayScore;
                    awayStanding.goals_against += homeScore;
                    awayStanding.goal_difference += (awayScore - homeScore);

                    if (homeScore > awayScore) {
                        homeStanding.wins += 1;
                        awayStanding.losses += 1;
                        homeStanding.points += 3;
                    } else if (awayScore > homeScore) {
                        awayStanding.wins += 1;
                        homeStanding.losses += 1;
                        awayStanding.points += 3;
                    } else {
                        homeStanding.draws += 1;
                        awayStanding.draws += 1;
                        homeStanding.points += 1;
                        awayStanding.points += 1;
                    }

                    await groupTeamRepo.save([homeStanding, awayStanding]);
                }
            }

            // If knockout match, propagate winner
            if (match.stage && match.stage.stage_type === "knockout") {
                const pendingSources = await matchSourceRepo.find({
                    where: { source_type: "match_winner", source_value: match.id.toString() },
                    relations: ["match"]
                });

                const winner = homeScore > awayScore ? match.homeTeam : match.awayTeam;
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
                relations: ["homeTeam", "awayTeam", "group", "stage", "tournament"]
            });

            if (!match) {
                return res.status(404).json({ success: false, message: "Match not found" });
            }

            // Update only allowed generic properties
            if (updateData.startTime !== undefined) match.startTime = new Date(updateData.startTime);
            if (updateData.venue !== undefined) match.venue = updateData.venue;
            if (updateData.status !== undefined) match.status = updateData.status;
            if (updateData.matchReferees !== undefined) match.matchReferees = updateData.matchReferees;
            if (updateData.breakDuration !== undefined) match.breakDuration = updateData.breakDuration;

            // New Pre-Match metadata
            if (updateData.referees !== undefined) match.referees = updateData.referees;
            if (updateData.homeLineup !== undefined) match.homeLineup = updateData.homeLineup;
            if (updateData.awayLineup !== undefined) match.awayLineup = updateData.awayLineup;

            await matchRepo.save(match);

            res.status(200).json({ success: true, data: formatMatch(match), message: "Match updated successfully" });
        } catch (error: any) {
            console.error("Error updating match:", error);
            res.status(500).json({ success: false, message: "Internal server error" });
        }
    },

    async updateSchedule(req: Request, res: Response) {
        try {
            const { id } = req.params;
            // Note: `events` field removed — events are now stored in match_events table
            const { venue, matchTime, breakDuration, matchReferees } = req.body;

            const matchRepo = AppDataSource.getRepository(Match);
            const match = await matchRepo.findOne({ 
                where: { id: Number(id) },
                relations: ["homeTeam", "awayTeam", "group", "stage", "tournament"]
            });

            if (!match) return res.status(404).json({ success: false, message: "Match not found" });

            if (venue !== undefined) match.venue = venue;
            if (matchTime !== undefined) match.startTime = new Date(matchTime);
            if (breakDuration !== undefined) match.breakDuration = breakDuration;
            if (matchReferees !== undefined) match.matchReferees = matchReferees;

            await matchRepo.save(match);

            res.json({ success: true, data: formatMatch(match) });
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
                relations: ["homeTeam", "awayTeam", "group"]
            });

            if (!match || !match.homeTeam || !match.awayTeam) {
                return res.status(404).json({ success: false, message: "Match or teams not found" });
            }

            const homeTeamId = match.homeTeam.id;
            const awayTeamId = match.awayTeam.id;

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

            // Get recent form (last 5 matches) for Home Team
            const homeRecent = await matchRepo.find({
                where: [
                    { homeTeam: { id: homeTeamId }, status: "completed" as any },
                    { awayTeam: { id: homeTeamId }, status: "completed" as any }
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

            // Get recent form (last 5 matches) for Away Team
            const awayRecent = await matchRepo.find({
                where: [
                    { homeTeam: { id: awayTeamId }, status: "completed" as any },
                    { awayTeam: { id: awayTeamId }, status: "completed" as any }
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
                groupStandings = {
                    groupName: match.group.group_name,
                    standings: teamsInGroup.map((gt, index) => ({
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
                        points: gt.points
                    }))
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
            const match = await matchRepo.findOne({
                where: { id: Number(id) },
                select: ["id", "stats"]
            });
            if (!match) return res.status(404).json({ success: false, message: "Match not found" });
            res.json({ success: true, data: match.stats || {} });
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
            const newEvent = eventRepo.create({
                ...eventData,
                match: { id: match.id } as any
            }) as unknown as MatchEvent;

            const savedEvent = await eventRepo.save(newEvent);

            // If it's a goal, optionally update the score directly
            if (savedEvent.type === MatchEventType.GOAL && savedEvent.team) {
                if (match.homeTeam && savedEvent.team.id === match.homeTeam.id) {
                    match.homeScore += 1;
                } else if (match.awayTeam && savedEvent.team.id === match.awayTeam.id) {
                    match.awayScore += 1;
                }
                await matchRepo.save(match);
            }

            res.status(201).json({ success: true, data: savedEvent });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    async updateMatchEvent(req: Request, res: Response) {
        try {
            const { eventId } = req.params;
            const updateData = req.body;
            const eventRepo = AppDataSource.getRepository(MatchEvent);
            
            const event = await eventRepo.findOne({ where: { id: Number(eventId) } });
            if (!event) return res.status(404).json({ success: false, message: "Event not found" });

            // Note: If updating a goal to a non-goal or changing the team, 
            // the match score would need complex recalculation. 
            // For now, we update simple fields.
            Object.assign(event, updateData);
            await eventRepo.save(event);

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
            if (match && event.type === MatchEventType.GOAL && event.team) {
                if (match.homeTeam && event.team.id === match.homeTeam.id) {
                    match.homeScore = Math.max(0, match.homeScore - 1);
                } else if (match.awayTeam && event.team.id === match.awayTeam.id) {
                    match.awayScore = Math.max(0, match.awayScore - 1);
                }
                await matchRepo.save(match);
            }

            await eventRepo.remove(event);
            res.json({ success: true, message: "Event deleted successfully" });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    async endMatch(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const matchRepo = AppDataSource.getRepository(Match);

            const match = await matchRepo.findOne({ 
                where: { id: Number(id) },
                relations: ["homeTeam", "awayTeam", "group", "stage", "tournament"]
            });
            if (!match) return res.status(404).json({ success: false, message: "Match not found" });

            match.status = MatchStatus.COMPLETED;
            await matchRepo.save(match);

            // Could also trigger updateResult logic here, simplified for now
            res.json({ success: true, data: formatMatch(match), message: "Match ended successfully" });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    async updateLiveState(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { homeScore, awayScore, live_minute, match_period } = req.body;

            const matchRepo = AppDataSource.getRepository(Match);
            const match = await matchRepo.findOne({ 
                where: { id: Number(id) },
                relations: ["homeTeam", "awayTeam", "group", "stage", "tournament"]
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
            if (match_period !== undefined) match.match_period = match_period;

            await matchRepo.save(match);

            return res.json({ success: true, data: formatMatch(match) });
        } catch (error: any) {
            return res.status(500).json({ success: false, message: error.message });
        }
    }
};
