import { AppDataSource } from "../../config/data-source";
import { Tournament, TournamentStatus } from "../tournaments/tournament.entity";
import { Team } from "../teams/team.entity";
import { TeamMember, TeamMemberRole } from "../teams/team-member.entity";
import { Match, MatchStatus } from "../matches/match.entity";
import { MatchEvent, MatchEventType } from "../matches/match-event.entity";
import { Between } from "typeorm";

export const DashboardController = {
    /* ─── Platform Stats ─────────────────────────────────────────────── */
    async getStats(req: any, res: any) {
        try {
            const tournamentRepo = AppDataSource.getRepository(Tournament);
            const teamRepo = AppDataSource.getRepository(Team);
            const memberRepo = AppDataSource.getRepository(TeamMember);
            const matchRepo = AppDataSource.getRepository(Match);

            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            const todayEnd = new Date();
            todayEnd.setHours(23, 59, 59, 999);

            const [
                totalTournaments,
                finishedTournaments,
                liveTournaments,
                totalTeams,
                totalPlayers,
                liveMatches,
                todayUpcomingMatches,
                todayFinishedMatches,
            ] = await Promise.all([
                tournamentRepo.count(),
                tournamentRepo.count({ where: { status: TournamentStatus.COMPLETED } }),
                tournamentRepo.count({ where: { status: TournamentStatus.IN_PROGRESS } }),
                teamRepo.count(),
                memberRepo.count({ where: { role: TeamMemberRole.PLAYER } }),
                matchRepo.count({ where: { status: MatchStatus.LIVE } }),
                matchRepo.count({
                    where: { status: MatchStatus.SCHEDULED, startTime: Between(todayStart, todayEnd) },
                }),
                matchRepo.count({
                    where: { status: MatchStatus.COMPLETED, startTime: Between(todayStart, todayEnd) },
                }),
            ]);

            res.json({
                success: true,
                data: {
                    totalTournaments,
                    finishedTournaments,
                    liveTournaments,
                    totalTeams,
                    totalPlayers,
                    liveMatches,
                    todayUpcomingMatches,
                    todayFinishedMatches,
                },
            });
        } catch (error: any) {
            console.error("[Dashboard] Error fetching stats:", error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /* ─── Live Matches ──────────────────────────────────────────────── */
    async getLiveMatches(req: any, res: any) {
        try {
            const matchRepo = AppDataSource.getRepository(Match);
            const query = matchRepo
                .createQueryBuilder("match")
                .leftJoinAndSelect("match.homeTeam", "homeTeam")
                .leftJoinAndSelect("match.awayTeam", "awayTeam")
                .leftJoinAndSelect("match.tournament", "tournament")
                .leftJoinAndSelect("match.stage", "stage")
                .where("match.status = :status", { status: MatchStatus.LIVE });

            const userRole = req.user?.role?.toLowerCase() || '';
            if (userRole === 'admin') {
                // Admin sees all matches
            } else if (userRole === 'organizer') {
                query.andWhere("tournament.ownerId = :userId", { userId: req.user.id });
            } else {
                query.andWhere("tournament.visibility = :visibility", { visibility: 'public' });
            }

            const matches = await query
                .orderBy("match.startTime", "ASC")
                .take(6)
                .getMany();

            // Attach recent goal events for each live match
            const eventRepo = AppDataSource.getRepository(MatchEvent);
            const enriched = await Promise.all(matches.map(async (m) => {
                const goals = await eventRepo.find({
                    where: { match: { id: m.id }, type: MatchEventType.GOAL },
                    order: { minute: "ASC" },
                });
                return {
                    id: m.id,
                    homeTeam: m.homeTeam?.name ?? "TBD",
                    awayTeam: m.awayTeam?.name ?? "TBD",
                    homeScore: m.homeScore,
                    awayScore: m.awayScore,
                    liveMinute: m.live_minute ?? 0,
                    period: m.match_period,
                    tournament: m.tournament?.name ?? "",
                    tournamentId: m.tournament?.id,
                    stage: m.stage?.stage_type ?? "",
                    venue: m.venue ?? "",
                    startTime: m.startTime,
                    goalScorers: goals.map(g => `${g.playerName ?? "?"} (${g.minute}')`),
                };
            }));

            res.json({ success: true, data: enriched });
        } catch (error: any) {
            console.error("[Dashboard] Error fetching live matches:", error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /* ─── Upcoming Matches (next 10) ─────────────────────────────────── */
    async getUpcomingMatches(req: any, res: any) {
        try {
            const matchRepo = AppDataSource.getRepository(Match);
            const now = new Date();

            const query = matchRepo
                .createQueryBuilder("match")
                .leftJoinAndSelect("match.homeTeam", "homeTeam")
                .leftJoinAndSelect("match.awayTeam", "awayTeam")
                .leftJoinAndSelect("match.tournament", "tournament")
                .where("match.status = :status", { status: MatchStatus.SCHEDULED })
                .andWhere("match.startTime >= :now", { now });

            const userRole = req.user?.role?.toLowerCase() || '';
            if (userRole === 'admin') {
                // Admin sees all matches
            } else if (userRole === 'organizer') {
                query.andWhere("tournament.ownerId = :userId", { userId: req.user.id });
            } else {
                query.andWhere("tournament.visibility = :visibility", { visibility: 'public' });
            }

            const matches = await query
                .orderBy("match.startTime", "ASC")
                .take(10)
                .getMany();

            // Group by date
            const groupsMap = new Map<string, any[]>();
            for (const m of matches) {
                const d = new Date(m.startTime);
                const dateKey = d.toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short" }).toUpperCase();
                if (!groupsMap.has(dateKey)) groupsMap.set(dateKey, []);
                groupsMap.get(dateKey)!.push({
                    id: m.id,
                    date: dateKey,
                    time: d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
                    homeTeam: m.homeTeam?.name ?? "TBD",
                    awayTeam: m.awayTeam?.name ?? "TBD",
                    venue: m.venue ?? "",
                    tournament: m.tournament?.name ?? "",
                    tournamentId: m.tournament?.id,
                    startTime: m.startTime,
                });
            }

            const grouped = Array.from(groupsMap.entries()).map(([date, matches]) => ({ date, matches }));
            res.json({ success: true, data: grouped });
        } catch (error: any) {
            console.error("[Dashboard] Error fetching upcoming matches:", error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /* ─── Past Matches (last 10) ─────────────────────────────────────── */
    async getPastMatches(req: any, res: any) {
        try {
            const matchRepo = AppDataSource.getRepository(Match);

            const query = matchRepo
                .createQueryBuilder("match")
                .leftJoinAndSelect("match.homeTeam", "homeTeam")
                .leftJoinAndSelect("match.awayTeam", "awayTeam")
                .leftJoinAndSelect("match.tournament", "tournament")
                .where("match.status = :status", { status: MatchStatus.COMPLETED });

            const userRole = req.user?.role?.toLowerCase() || '';
            if (userRole === 'admin') {
                // Admin sees all matches
            } else if (userRole === 'organizer') {
                query.andWhere("tournament.ownerId = :userId", { userId: req.user.id });
            } else {
                query.andWhere("tournament.visibility = :visibility", { visibility: 'public' });
            }

            const matches = await query
                .orderBy("match.startTime", "DESC")
                .take(10)
                .getMany();

            const groupsMap = new Map<string, any[]>();
            for (const m of matches) {
                const d = new Date(m.startTime);
                const dateKey = d.toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short" }).toUpperCase();
                if (!groupsMap.has(dateKey)) groupsMap.set(dateKey, []);

                let winner = "Draw";
                if (m.homeScore > m.awayScore) winner = m.homeTeam?.name ?? "Home";
                else if (m.awayScore > m.homeScore) winner = m.awayTeam?.name ?? "Away";

                groupsMap.get(dateKey)!.push({
                    id: m.id,
                    date: dateKey,
                    homeTeam: m.homeTeam?.name ?? "TBD",
                    awayTeam: m.awayTeam?.name ?? "TBD",
                    score: `${m.homeScore} - ${m.awayScore}`,
                    status: "FT",
                    venue: m.venue ?? "",
                    winner,
                    tournament: m.tournament?.name ?? "",
                    tournamentId: m.tournament?.id,
                });
            }

            const grouped = Array.from(groupsMap.entries()).map(([date, matches]) => ({ date, matches }));
            res.json({ success: true, data: grouped });
        } catch (error: any) {
            console.error("[Dashboard] Error fetching past matches:", error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /* ─── Top Scorers ─────────────────────────────────────────────────── */
    async getTopScorers(req: any, res: any) {
        try {
            const eventRepo = AppDataSource.getRepository(MatchEvent);

            // Count goals per player_name + team
            const scorers = await eventRepo
                .createQueryBuilder("ev")
                .select("ev.player_name", "playerName")
                .addSelect("t.name", "teamName")
                .addSelect("COUNT(ev.id)", "goals")
                .leftJoin("ev.team", "t")
                .where("ev.type = :type", { type: MatchEventType.GOAL })
                .andWhere("ev.player_name IS NOT NULL")
                .groupBy("ev.player_name")
                .addGroupBy("t.id")
                .orderBy("goals", "DESC")
                .limit(10)
                .getRawMany();

            res.json({
                success: true,
                data: scorers.map((s, i) => ({
                    rank: i + 1,
                    name: s.playerName,
                    team: s.teamName ?? "—",
                    goals: Number(s.goals),
                })),
            });
        } catch (error: any) {
            console.error("[Dashboard] Error fetching top scorers:", error);
            res.status(500).json({ success: false, message: error.message });
        }
    },
};
