import { AppDataSource } from "../../config/data-source";
import { Tournament, TournamentStatus } from "../tournaments/tournament.entity";
import { TournamentPresentation } from "../tournaments/presentation/presentation.entity";
import { GroupTeam } from "../tournaments/group-team.entity";
import { Match } from "../matches/match.entity";
import { MatchEvent, MatchEventType } from "../matches/match-event.entity";
import { TeamMember } from "../teams/team-member.entity";

export const PublicController = {
    async getPortalData(req: any, res: any) {
        try {
            const tournamentId = parseInt(req.params.id);
            if (isNaN(tournamentId)) {
                return res.status(400).json({ success: false, message: "Invalid tournament ID" });
            }

            const tournamentRepo = AppDataSource.getRepository(Tournament);
            const presentationRepo = AppDataSource.getRepository(TournamentPresentation);
            const groupTeamRepo = AppDataSource.getRepository(GroupTeam);
            const matchRepo = AppDataSource.getRepository(Match);
            const matchEventRepo = AppDataSource.getRepository(MatchEvent);
            const memberRepo = AppDataSource.getRepository(TeamMember);

            const tournament = await tournamentRepo.findOne({
                where: { id: tournamentId },
                relations: ["format", "organizer"] // Grab format and organizer if needed
            });

            if (!tournament) {
                return res.status(404).json({ success: false, message: "Tournament not found" });
            }

            const presentation = await presentationRepo.findOne({
                where: { tournament: { id: tournamentId } }
            });

            // Default presentation logic to avoid nulls/mismatches with Admin defaults
            const portalSettings = {
                brandColor: presentation?.brandColor || "#FFC107",
                welcomeMessage: presentation?.welcomeMessage !== undefined ? presentation.welcomeMessage : `Welcome to ${tournament.name}`,
                showStandings: presentation ? Boolean(presentation.showStandingsWidget) : true,
                showTopScorers: presentation ? Boolean(presentation.showTopScorers) : true,
                showLiveMatches: presentation ? Boolean(presentation.liveBroadcastEnabled) : false,
                showRecentResults: presentation ? Boolean(presentation.showRecentResults) : true,
                liveStreamLink: presentation?.liveStreamLink || ""
            };

            // Fetch Standings
            let standings: any[] = [];
            if (portalSettings.showStandings) {
                const groupTeams = await groupTeamRepo.find({
                    where: { group: { tournament: { id: tournamentId } } },
                    relations: ["team", "group"],
                    order: {
                        group: { id: "ASC" },
                        points: "DESC",
                        goal_difference: "DESC",
                        goals_for: "DESC"
                    }
                });

                // Map the standings, grouping by group name if you have multiple groups
                standings = await Promise.all(groupTeams.map(async gt => {
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
                        teamId: gt.team?.id,
                        teamName: gt.team?.name,
                        teamLogo: gt.team?.logoUrl,
                        played: gt.played,
                        won: gt.wins,
                        drawn: gt.draws,
                        lost: gt.losses,
                        goalsFor: gt.goals_for,
                        goalsAgainst: gt.goals_against,
                        goalDifference: gt.goal_difference,
                        points: gt.points,
                        groupName: gt.group?.group_name,
                        form: form
                    };
                }));
            }

            // Fetch Live Matches & Completed Matches
            let liveMatches: any[] = [];
            let completedMatches: any[] = [];
            if (portalSettings.showLiveMatches) {
                const recentMatches = await matchRepo.find({
                    where: [
                        { tournament: { id: tournamentId }, status: 'live' as any },
                        { tournament: { id: tournamentId }, status: 'completed' as any }
                    ],
                    relations: ["homeTeam", "awayTeam"],
                    order: { startTime: "DESC" },
                    take: 20 // Limit to avoid massive payload
                });
                liveMatches = recentMatches.filter(m => m.status === 'live');
                completedMatches = recentMatches.filter(m => m.status === 'completed');
            }

            // Fetch Top Scorers (aggregate match events)
            let topScorers: any[] = [];
            if (portalSettings.showTopScorers) {
                // Find all GOAL events recursively assigned to matches in this tournament
                const goalEvents = await matchEventRepo.createQueryBuilder("event")
                    .innerJoin("event.match", "match")
                    .innerJoin("match.tournament", "tournament")
                    .leftJoinAndSelect("event.team", "team")
                    .where("tournament.id = :tournamentId", { tournamentId })
                    .andWhere("event.type = :type", { type: MatchEventType.GOAL })
                    .getMany();

                const scorerMap = new Map<string, any>();
                goalEvents.forEach(evt => {
                    if (evt.playerName) {
                        const pname = evt.playerName;
                        if (!scorerMap.has(pname)) {
                            scorerMap.set(pname, {
                                playerName: pname,
                                playerPhoto: '',
                                teamName: evt.team?.name || "Unknown",
                                teamLogo: evt.team?.logoUrl || "",
                                goals: 0
                            });
                        }
                        scorerMap.get(pname).goals += 1;
                    }
                });

                topScorers = Array.from(scorerMap.values())
                    .sort((a, b) => b.goals - a.goals)
                    .slice(0, 5); // top 5
            }

            res.json({
                success: true,
                data: {
                    tournament: {
                        id: tournament.id,
                        name: tournament.name,
                        description: tournament.description,
                        logo: tournament.logo,
                        status: tournament.status,
                        visibility: tournament.visibility
                    },
                    presentation: portalSettings,
                    standings,
                    liveMatches: liveMatches.map(m => ({
                        id: m.id,
                        homeTeamName: m.homeTeam?.name,
                        homeTeamLogo: m.homeTeam?.logoUrl,
                        awayTeamName: m.awayTeam?.name,
                        awayTeamLogo: m.awayTeam?.logoUrl,
                        homeScore: m.homeScore,
                        awayScore: m.awayScore,
                        minute: m.live_minute,
                        status: m.status
                    })),
                    completedMatches: completedMatches.map(m => ({
                        id: m.id,
                        homeTeamName: m.homeTeam?.name,
                        homeTeamLogo: m.homeTeam?.logoUrl,
                        awayTeamName: m.awayTeam?.name,
                        awayTeamLogo: m.awayTeam?.logoUrl,
                        homeScore: m.homeScore,
                        awayScore: m.awayScore,
                        status: m.status,
                        startTime: m.startTime
                    })),
                    topScorers
                }
            });

        } catch (error: any) {
            console.error("Portal Data Error:", error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    async getLatestTournamentId(req: any, res: any) {
        try {
            const tournamentRepo = AppDataSource.getRepository(Tournament);

            // Priority 1: Registration Open or In Progress
            let latest = await tournamentRepo.findOne({
                where: [
                    { visibility: 'public', status: TournamentStatus.REGISTRATION_OPEN },
                    { visibility: 'public', status: TournamentStatus.IN_PROGRESS }
                ],
                order: { startDate: 'DESC' }
            });

            // Priority 2: Fallback to any public tournament
            if (!latest) {
                latest = await tournamentRepo.findOne({
                    where: { visibility: 'public' },
                    order: { startDate: 'DESC' }
                });
            }

            if (!latest) {
                return res.status(404).json({ success: false, message: "No public tournaments found" });
            }

            res.json({ success: true, id: latest.id });
        } catch (error: any) {
            console.error("Latest Tournament Error:", error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    async getMatchData(req: any, res: any) {
        try {
            const matchId = parseInt(req.params.id);
            if (isNaN(matchId)) {
                return res.status(400).json({ success: false, message: "Invalid match ID" });
            }

            const matchRepo = AppDataSource.getRepository(Match);
            const presentationRepo = AppDataSource.getRepository(TournamentPresentation);
            const matchEventRepo = AppDataSource.getRepository(MatchEvent);

            const match = await matchRepo.findOne({
                where: { id: matchId },
                relations: ["tournament", "homeTeam", "awayTeam"]
            });

            if (!match) {
                return res.status(404).json({ success: false, message: "Match not found" });
            }

            const presentation = await presentationRepo.findOne({
                where: { tournament: { id: match.tournament.id } }
            });

            const brandColor = presentation?.brandColor || "#FFC107";

            // Fetch match events organized by minute descending
            const matchEvents = await matchEventRepo.find({
                where: { match: { id: matchId } },
                relations: ["team"],
                order: { minute: "DESC", id: "DESC" }
            });

            res.json({
                success: true,
                data: {
                    match: {
                        id: match.id,
                        tournamentName: match.tournament.name,
                        homeTeamName: match.homeTeam?.name || 'TBD',
                        homeTeamLogo: match.homeTeam?.logoUrl,
                        awayTeamName: match.awayTeam?.name || 'TBD',
                        awayTeamLogo: match.awayTeam?.logoUrl,
                        homeScore: match.homeScore,
                        awayScore: match.awayScore,
                        status: match.status,
                        minute: match.live_minute,
                        period: match.match_period
                    },
                    presentation: {
                        brandColor
                    },
                    events: matchEvents.map(evt => ({
                        id: evt.id,
                        minute: evt.minute,
                        type: evt.type,
                        teamSide: evt.teamSide,
                        teamName: evt.team?.name,
                        playerName: evt.playerName,
                        details: evt.details
                    }))
                }
            });

        } catch (error: any) {
            console.error("Match Data Error:", error);
            res.status(500).json({ success: false, message: error.message });
        }
    }
};
