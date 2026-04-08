import { AppDataSource } from "../../config/data-source";
import { Match } from "./match.entity";
import { MatchEvent, MatchEventType, MatchEventTeamSide } from "./match-event.entity";
import { Team } from "../teams/team.entity";

export interface CreateMatchEventDto {
    type: MatchEventType;
    minute: number;
    playerName?: string;
    teamSide?: MatchEventTeamSide;
    /** Optional numeric team FK id */
    teamId?: number;
    details?: string;
    assistPlayerName?: string;
}

export class MatchEventService {
    private get matchRepo() {
        return AppDataSource.getRepository(Match);
    }

    private get eventRepo() {
        return AppDataSource.getRepository(MatchEvent);
    }

    // ── createMatchEvent ────────────────────────────────────────────────────────
    /**
     * Inserts a new event row for the given match.
     * If the event type is GOAL, automatically increments the relevant team score.
     *
     * @throws Error if the match does not exist
     */
    async createMatchEvent(matchId: number, dto: CreateMatchEventDto): Promise<MatchEvent> {
        const match = await this.matchRepo.findOne({
            where: { id: matchId },
            relations: ["homeTeam", "awayTeam"],
        });

        if (!match) {
            throw new Error(`Match ${matchId} not found`);
        }

        // Build the event entity
        const event = this.eventRepo.create({
            match: { id: match.id } as Match,
            type: dto.type,
            minute: dto.minute,
            playerName: dto.playerName,
            teamSide: dto.teamSide,
            details: dto.details,
            assistPlayerName: dto.assistPlayerName,
        });

        // Optionally link to team entity by id
        if (dto.teamId) {
            event.team = { id: dto.teamId } as Team;
        }

        const saved = await this.eventRepo.save(event);

        // Auto-increment score for goals / penalties (not own goals — handled separately)
        if (
            saved.type === MatchEventType.GOAL ||
            saved.type === MatchEventType.PENALTY
        ) {
            if (dto.teamSide === MatchEventTeamSide.HOME) {
                match.homeScore = (match.homeScore ?? 0) + 1;
                await this.matchRepo.save(match);
            } else if (dto.teamSide === MatchEventTeamSide.AWAY) {
                match.awayScore = (match.awayScore ?? 0) + 1;
                await this.matchRepo.save(match);
            } else if (dto.teamId) {
                // Fallback: resolve via team FK
                if (match.homeTeam && dto.teamId === match.homeTeam.id) {
                    match.homeScore = (match.homeScore ?? 0) + 1;
                } else if (match.awayTeam && dto.teamId === match.awayTeam.id) {
                    match.awayScore = (match.awayScore ?? 0) + 1;
                }
                await this.matchRepo.save(match);
            }
        } else if (saved.type === MatchEventType.OWN_GOAL) {
            // Own goal credits the OPPOSITE team
            if (dto.teamSide === MatchEventTeamSide.HOME) {
                // Home player scores own goal → away team gets the point
                match.awayScore = (match.awayScore ?? 0) + 1;
                await this.matchRepo.save(match);
            } else if (dto.teamSide === MatchEventTeamSide.AWAY) {
                match.homeScore = (match.homeScore ?? 0) + 1;
                await this.matchRepo.save(match);
            }
        }

        return saved;
    }

    // ── getMatchWithEvents ──────────────────────────────────────────────────────
    /**
     * Returns the full match object with all events ordered by minute asc.
     *
     * @throws Error if the match does not exist
     */
    async getMatchWithEvents(matchId: number): Promise<Match> {
        const match = await this.matchRepo.findOne({
            where: { id: matchId },
            relations: ["homeTeam", "awayTeam", "stage", "group", "tournament", "matchEvents", "matchEvents.team"],
        });

        if (!match) {
            throw new Error(`Match ${matchId} not found`);
        }

        // Sort events by minute (TypeORM doesn't support order on nested relations in findOne)
        if (match.matchEvents) {
            match.matchEvents.sort((a, b) => a.minute - b.minute);
        }

        return match;
    }

    // ── getGoals ────────────────────────────────────────────────────────────────
    /**
     * Returns all goal-type events (GOAL, PENALTY, OWN_GOAL) for a match, ordered by minute.
     */
    async getGoals(matchId: number): Promise<MatchEvent[]> {
        return this.eventRepo
            .createQueryBuilder("event")
            .leftJoinAndSelect("event.team", "team")
            .where("event.match_id = :matchId", { matchId })
            .andWhere("event.type IN (:...types)", {
                types: [MatchEventType.GOAL, MatchEventType.PENALTY, MatchEventType.OWN_GOAL],
            })
            .orderBy("event.minute", "ASC")
            .getMany();
    }

    // ── removeEvent ─────────────────────────────────────────────────────────────
    /**
     * Deletes a single event. If it was a scoring event, the match score is
     * decremented accordingly (clamped to 0).
     *
     * @throws Error if the event does not exist or doesn't belong to the match
     */
    async removeEvent(eventId: number, matchId: number): Promise<void> {
        const event = await this.eventRepo.findOne({
            where: { id: eventId, match: { id: matchId } },
            relations: ["team"],
        });

        if (!event) {
            throw new Error(`Event ${eventId} not found for match ${matchId}`);
        }

        const match = await this.matchRepo.findOne({
            where: { id: matchId },
            relations: ["homeTeam", "awayTeam"],
        });

        if (match) {
            const scoringEvents = [
                MatchEventType.GOAL,
                MatchEventType.PENALTY,
                MatchEventType.OWN_GOAL,
            ];

            if (scoringEvents.includes(event.type)) {
                if (event.type === MatchEventType.OWN_GOAL) {
                    // Own goal reversal: credited team was the OPPOSITE side
                    if (event.teamSide === MatchEventTeamSide.HOME) {
                        match.awayScore = Math.max(0, (match.awayScore ?? 0) - 1);
                    } else if (event.teamSide === MatchEventTeamSide.AWAY) {
                        match.homeScore = Math.max(0, (match.homeScore ?? 0) - 1);
                    }
                } else {
                    if (event.teamSide === MatchEventTeamSide.HOME) {
                        match.homeScore = Math.max(0, (match.homeScore ?? 0) - 1);
                    } else if (event.teamSide === MatchEventTeamSide.AWAY) {
                        match.awayScore = Math.max(0, (match.awayScore ?? 0) - 1);
                    } else if (event.team) {
                        // Fallback via team FK
                        if (match.homeTeam && event.team.id === match.homeTeam.id) {
                            match.homeScore = Math.max(0, (match.homeScore ?? 0) - 1);
                        } else if (match.awayTeam && event.team.id === match.awayTeam.id) {
                            match.awayScore = Math.max(0, (match.awayScore ?? 0) - 1);
                        }
                    }
                }
                await this.matchRepo.save(match);
            }
        }

        await this.eventRepo.remove(event);
    }
}

// Singleton export used by controller
export const matchEventService = new MatchEventService();
