import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    OneToOne,
    JoinColumn,
    CreateDateColumn,
    UpdateDateColumn,
} from "typeorm";
import { Tournament } from "./tournament.entity";

// ── Enums ────────────────────────────────────────────────────────────────────

export enum ExtraTimeRule {
    NO_EXTRA_TIME   = "no_extra_time",
    GOLDEN_GOAL     = "golden_goal",
    FULL_EXTRA_TIME = "full_extra_time",
}

export enum GoalkeeperRule {
    STANDARD_FIFA   = "standard_fifa",
    ROLLING_KEEPER  = "rolling_keeper",
    NO_RESTRICTION  = "no_restriction",
}

// ── Entity ───────────────────────────────────────────────────────────────────

@Entity("tournament_rules")
export class TournamentRules {
    @PrimaryGeneratedColumn()
    id!: number;

    /** FK → tournament (CASCADE delete). One rules row per tournament. */
    @OneToOne(() => Tournament, (tournament) => tournament.rules, { onDelete: "CASCADE" })
    @JoinColumn({ name: "tournament_id" })
    tournament!: Tournament;

    @Column({ name: "governing_body", type: "varchar", length: 255, default: "FIFA" })
    governingBody!: string;

    /** FIFA standard ball size: 3 / 4 / 5 */
    @Column({ name: "ball_size", type: "tinyint", default: 5 })
    ballSize!: number;

    @Column({ name: "players_on_field", type: "tinyint", default: 11 })
    playersOnField!: number;

    /** Minimum players needed to continue a match */
    @Column({ name: "min_players", type: "tinyint", default: 7 })
    minPlayers!: number;

    /** Number of substitutions allowed per team */
    @Column({ name: "substitution_rules", type: "tinyint", default: 5 })
    substitutionRules!: number;

    @Column({ name: "apply_offside_rule", type: "boolean", default: true })
    applyOffsideRule!: boolean;

    @Column({
        name: "extra_time_rules",
        type: "enum",
        enum: ExtraTimeRule,
        default: ExtraTimeRule.NO_EXTRA_TIME,
    })
    extraTimeRules!: ExtraTimeRule;

    /**
     * Penalties shootout is only meaningful when extra time is enabled.
     * Enforced at the service level: if extraTimeRules = no_extra_time,
     * this is forced to false.
     */
    @Column({ name: "penalties_shootout", type: "boolean", default: false })
    penaltiesShootout!: boolean;

    /** Number of accumulated yellow cards that trigger a 1-match ban */
    @Column({ name: "yellow_card_suspension", type: "tinyint", default: 3 })
    yellowCardSuspension!: number;

    /** Number of matches banned automatically on a red card */
    @Column({ name: "red_card_penalty", type: "tinyint", default: 1 })
    redCardPenalty!: number;

    @Column({
        name: "goalkeeper_rules",
        type: "enum",
        enum: GoalkeeperRule,
        default: GoalkeeperRule.STANDARD_FIFA,
    })
    goalkeeperRules!: GoalkeeperRule;

}
