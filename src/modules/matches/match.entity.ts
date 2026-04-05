import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from "typeorm";
// Triggering restart for migration
import { Tournament } from "../tournaments/tournament.entity";
import { Team } from "../teams/team.entity";
import { FormatStage } from "../tournaments/format-stage.entity";
import { Group } from "../tournaments/group.entity";
import { MatchSource } from "./match-source.entity";
import { MatchEvent } from "./match-event.entity";

export enum MatchStatus {
    SCHEDULED = "scheduled",
    LIVE = "live",
    COMPLETED = "completed",
}

export enum MatchPeriod {
    NOT_STARTED = "not_started",
    FIRST_HALF = "first_half",
    HALF_TIME = "half_time",
    SECOND_HALF = "second_half",
    EXTRA_TIME = "extra_time",
    PENALTIES = "penalties",
}

@Entity()
export class Match {
    @PrimaryGeneratedColumn()
    id!: number;

    @ManyToOne(() => Tournament, (tournament) => tournament.matches, { onDelete: "CASCADE" })
    tournament!: Tournament;

    @ManyToOne(() => Team, { nullable: true })
    homeTeam?: Team;

    @ManyToOne(() => Team, { nullable: true })
    awayTeam?: Team;

    @Column({ type: "int", default: 0 })
    homeScore!: number;

    @Column({ type: "int", default: 0 })
    awayScore!: number;

    @Column()
    startTime!: Date;

    @Column({
        type: "enum",
        enum: MatchStatus,
        default: MatchStatus.SCHEDULED,
    })
    status!: MatchStatus;

    @Column({ nullable: true })
    venue?: string;

    @Column({ type: "int", nullable: true })
    breakDuration?: number; // In minutes

    @Column({ type: "tinyint", nullable: true })
    live_minute?: number;

    @Column({
        type: "enum",
        enum: MatchPeriod,
        default: MatchPeriod.NOT_STARTED,
    })
    match_period!: MatchPeriod;

    // events text column dropped — data migrated to match_events table

    @Column({ type: "text", nullable: true })
    matchReferees?: string;

    @Column({ type: "json", nullable: true })
    referees?: any;

    @Column({ type: "json", nullable: true })
    homeLineup?: any;

    @Column({ type: "json", nullable: true })
    awayLineup?: any;

    @Column({ nullable: true })
    round?: number;

    @Column({ nullable: true })
    bracketPosition?: number; // E.g., match number in the bracket

    @ManyToOne(() => FormatStage, { nullable: true, onDelete: "CASCADE" })
    @JoinColumn({ name: "stage_id" })
    stage?: FormatStage;

    @ManyToOne(() => Group, { nullable: true, onDelete: "CASCADE" })
    @JoinColumn({ name: "group_id" })
    group?: Group;

    @OneToMany(() => MatchSource, (source) => source.match, { cascade: true })
    matchSources!: MatchSource[];

    @OneToMany(() => MatchEvent, (event) => event.match, { cascade: true })
    matchEvents!: MatchEvent[];

    @Column({ type: "json", nullable: true })
    stats?: any;

    @Column({ type: "datetime", nullable: true })
    periodStartedAt?: Date;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;

    get result(): "home" | "away" | "draw" | null {
        if (this.status === MatchStatus.COMPLETED) {
            if (this.homeScore > this.awayScore) return "home";
            if (this.homeScore < this.awayScore) return "away";
            return "draw";
        }
        return null;
    }
}
