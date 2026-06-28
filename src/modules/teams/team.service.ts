import { ILike, Not } from "typeorm";
import { AppDataSource } from "../../config/data-source";
import { Team } from "./team.entity";
import { Match, MatchStatus } from "../matches/match.entity";
import { isAdminUser } from "../auth/auth.middleware";

export class TeamService {
    private teamRepository = AppDataSource.getRepository(Team);
    private matchRepository = AppDataSource.getRepository(Match);

    /**
     * Lists teams.
     * - The Teams page (default): admins see the full shared registry; non-admins
     *   (organizers) only see teams registered in tournaments they own.
     * - The tournament registration picker passes `includeAllPool` so organizers
     *   can still register any team from the shared global pool into their own
     *   tournament.
     */
    async getAll(search?: string, user?: any, includeAllPool = false) {
        const qb = this.teamRepository.createQueryBuilder("team");

        if (search) {
            qb.andWhere("team.name LIKE :search", { search: `%${search}%` });
        }

        if (!includeAllPool && user && !isAdminUser(user)) {
            qb.innerJoin("team.tournamentRegistrations", "reg")
                .innerJoin("reg.tournament", "tr")
                .andWhere("tr.ownerId = :uid", { uid: user.id })
                .distinct(true);
        }

        return qb.orderBy("team.createdAt", "DESC").getMany();
    }

    async getById(id: string) {
        return this.teamRepository.findOne({
            where: { id: parseInt(id) }
        });
    }

    async create(data: Partial<Team>) {
        await this.assertUniqueName(data.name);
        const team = this.teamRepository.create(data);
        return this.teamRepository.save(team);
    }

    /** Throw a 409 if another team already uses this name (case-insensitive). */
    private async assertUniqueName(name?: string, excludeId?: number) {
        const trimmed = name?.trim();
        if (!trimmed) return;
        const where: any = { name: ILike(trimmed) };
        if (excludeId) where.id = Not(excludeId);
        const existing = await this.teamRepository.findOne({ where });
        if (existing) {
            const err: any = new Error("A team with this name already exists.");
            err.status = 409;
            throw err;
        }
    }

    async updateLogoUrl(id: string, logoUrl: string) {
        await this.teamRepository.update(id, { logoUrl });
    }

    async update(id: string, data: Partial<Team>) {
        await this.assertUniqueName(data.name, parseInt(id));
        await this.teamRepository.update(parseInt(id), data);
        return this.getById(id);
    }

    async delete(id: string) {
        return this.teamRepository.delete(parseInt(id));
    }

    /** Aggregate a team's match record across all tournaments. */
    async getStats(id: string) {
        const teamId = parseInt(id);

        const matches = await this.matchRepository.find({
            where: [
                { homeTeam: { id: teamId } },
                { awayTeam: { id: teamId } },
            ],
            relations: ["homeTeam", "awayTeam", "tournament"],
            order: { startTime: "DESC" },
        });

        let wins = 0, draws = 0, losses = 0;
        let goalsScored = 0, goalsConceded = 0, cleanSheets = 0;
        const recentMatches: any[] = [];

        const completed = matches.filter(m => m.status === MatchStatus.COMPLETED);
        for (const m of completed) {
            const isHome = m.homeTeam?.id === teamId;
            const teamScore = isHome ? m.homeScore : m.awayScore;
            const oppScore = isHome ? m.awayScore : m.homeScore;
            const opponent = (isHome ? m.awayTeam?.name : m.homeTeam?.name) ?? "Unknown";

            goalsScored += teamScore;
            goalsConceded += oppScore;
            if (oppScore === 0) cleanSheets++;

            let result: "W" | "D" | "L";
            if (teamScore > oppScore) { wins++; result = "W"; }
            else if (teamScore < oppScore) { losses++; result = "L"; }
            else { draws++; result = "D"; }

            recentMatches.push({
                id: m.id,
                opponent,
                score: `${teamScore} - ${oppScore}`,
                result,
                date: m.startTime,
                tournament: m.tournament?.name ?? "",
            });
        }

        const upcomingMatches = matches
            .filter(m => m.status !== MatchStatus.COMPLETED)
            .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
            .map(m => {
                const isHome = m.homeTeam?.id === teamId;
                return {
                    id: m.id,
                    opponent: (isHome ? m.awayTeam?.name : m.homeTeam?.name) ?? "TBD",
                    date: m.startTime,
                    venue: m.venue ?? "",
                    status: m.status,
                    tournament: m.tournament?.name ?? "",
                };
            });

        const totalMatches = completed.length;
        const winPercentage = totalMatches ? Math.round((wins / totalMatches) * 100) : 0;

        return {
            totalMatches,
            wins,
            draws,
            losses,
            goalsScored,
            goalsConceded,
            cleanSheets,
            winPercentage,
            recentMatches: recentMatches.slice(0, 10),
            upcomingMatches: upcomingMatches.slice(0, 10),
        };
    }
}
