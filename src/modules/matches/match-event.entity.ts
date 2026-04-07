import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
    CreateDateColumn,
    Index,
} from "typeorm";
import { Match } from "./match.entity";
import { Team } from "../teams/team.entity";

/** All recordable in-match event types */
export enum MatchEventType {
    GOAL         = "goal",
    YELLOW_CARD  = "yellow_card",
    RED_CARD     = "red_card",
    SUBSTITUTION = "substitution",
    PENALTY      = "penalty",
    OWN_GOAL     = "own_goal",
    CORNER       = "corner",
    FOUL         = "foul",
    OFFSIDE      = "offside",
    FREE_KICK    = "free_kick",
}

/** Which side of the match the event belongs to */
export enum MatchEventTeamSide {
    HOME = "home",
    AWAY = "away",
}

@Entity("match_events")
export class MatchEvent {
    @PrimaryGeneratedColumn()
    id!: number;

    /** FK → match (CASCADE delete) */
    @ManyToOne(() => Match, (match) => match.matchEvents, { onDelete: "CASCADE" })
    @JoinColumn({ name: "match_id" })
    match!: Match;

    /** Event classification — indexed via IDX_match_events_type */
    @Index("IDX_match_events_type")
    @Column({
        name: "type",
        type: "enum",
        enum: MatchEventType,
        default: MatchEventType.GOAL,
    })
    type!: MatchEventType;

    /** Free-text player name (replaces the old integer playerId FK) */
    @Column({ name: "player_name", type: "varchar", length: 255, nullable: true })
    playerName?: string;

    /** Which side (home / away) the event belongs to */
    @Column({
        name: "team",
        type: "enum",
        enum: MatchEventTeamSide,
        nullable: true,
    })
    teamSide?: MatchEventTeamSide;

    /** Secondary player name (e.g. Assist provider or substitution incoming player) */
    @Column({ name: "assist_player_name", type: "varchar", length: 255, nullable: true })
    assistPlayerName?: string;

    /**
     * Optional FK → team entity (SET NULL on delete).
     * Kept alongside `teamSide` so we can resolve team details when needed.
     */
    @ManyToOne(() => Team, { nullable: true, onDelete: "SET NULL" })
    @JoinColumn({ name: "team_id" })
    team?: Team;

    /** Minute the event occurred — TINYINT UNSIGNED (0-255) */
    @Column({ type: "tinyint", unsigned: true, default: 0 })
    minute!: number;

    /** Optional extra description (e.g. penalty details, assist name) */
    @Column({ type: "text", nullable: true })
    details?: string;

    @CreateDateColumn()
    createdAt!: Date;
}
