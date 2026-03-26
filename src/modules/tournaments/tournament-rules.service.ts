import { AppDataSource } from "../../config/data-source";
import { TournamentRules, ExtraTimeRule, GoalkeeperRule } from "./tournament-rules.entity";
import { Tournament } from "./tournament.entity";

export interface TournamentRulesDto {
    governingBody?:        string;
    ballSize?:             number;
    playersOnField?:       number;
    minPlayers?:           number;
    substitutionRules?:    number;
    applyOffsideRule?:     boolean;
    extraTimeRules?:       ExtraTimeRule;
    penaltiesShootout?:    boolean;
    yellowCardSuspension?: number;
    redCardPenalty?:       number;
    goalkeeperRules?:      GoalkeeperRule;
}

export class TournamentRulesService {
    private get repo() {
        return AppDataSource.getRepository(TournamentRules);
    }

    // ── saveRules ────────────────────────────────────────────────────────────
    /**
     * Upserts the rules row for a tournament (insert on first call, update thereafter).
     *
     * Business rule enforced here:
     *   if extraTimeRules === 'no_extra_time'  →  penaltiesShootout forced to false
     *
     * @throws Error if the tournament does not exist
     */
    async saveRules(tournamentId: number, dto: TournamentRulesDto): Promise<TournamentRules> {
        // Verify the tournament exists first to give a clean 404
        const tournamentRepo = AppDataSource.getRepository(Tournament);
        const tournament = await tournamentRepo.findOne({ where: { id: tournamentId } });
        if (!tournament) {
            throw new Error(`Tournament ${tournamentId} not found`);
        }

        // Enforce: no penalties shootout without extra time
        const extraTimeRules = dto.extraTimeRules ?? ExtraTimeRule.NO_EXTRA_TIME;
        const penaltiesShootout =
            extraTimeRules === ExtraTimeRule.NO_EXTRA_TIME
                ? false
                : (dto.penaltiesShootout ?? false);

        // Find existing rules row (if any) for upsert behaviour
        let rules = await this.repo.findOne({
            where: { tournament: { id: tournamentId } },
        });

        if (!rules) {
            // First save — create a new row with defaults then apply dto
            rules = this.repo.create({
                tournament: { id: tournamentId } as Tournament,
            });
        }

        // Apply all provided fields (entity defaults handle anything omitted on first insert)
        if (dto.governingBody        !== undefined) rules.governingBody        = dto.governingBody;
        if (dto.ballSize             !== undefined) rules.ballSize             = dto.ballSize;
        if (dto.playersOnField       !== undefined) rules.playersOnField       = dto.playersOnField;
        if (dto.minPlayers           !== undefined) rules.minPlayers           = dto.minPlayers;
        if (dto.substitutionRules    !== undefined) rules.substitutionRules    = dto.substitutionRules;
        if (dto.applyOffsideRule     !== undefined) rules.applyOffsideRule     = dto.applyOffsideRule;
        if (dto.yellowCardSuspension !== undefined) rules.yellowCardSuspension = dto.yellowCardSuspension;
        if (dto.redCardPenalty       !== undefined) rules.redCardPenalty       = dto.redCardPenalty;
        if (dto.goalkeeperRules      !== undefined) rules.goalkeeperRules      = dto.goalkeeperRules;

        // Always apply (already enforced above)
        rules.extraTimeRules    = extraTimeRules;
        rules.penaltiesShootout = penaltiesShootout;

        return this.repo.save(rules);
    }

    // ── getRules ─────────────────────────────────────────────────────────────
    /**
     * Returns the rules for a tournament, or null if no rules have been saved yet.
     */
    async getRules(tournamentId: number): Promise<TournamentRules | null> {
        return this.repo.findOne({
            where: { tournament: { id: tournamentId } },
            relations: ["tournament"],
        });
    }
}

// Singleton export
export const tournamentRulesService = new TournamentRulesService();
