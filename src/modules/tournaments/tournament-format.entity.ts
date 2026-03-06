import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToOne, JoinColumn, OneToMany } from "typeorm";
import { Tournament } from "./tournament.entity";
import { TournamentTiebreaker } from "./tournament-tiebreaker.entity";
import { FormatGroupSettings } from "./format-group-settings.entity";
import { FormatKnockoutSettings } from "./format-knockout-settings.entity";
import { FormatStage } from "./format-stage.entity";

@Entity("tournament_formats")
export class TournamentFormat {
    @PrimaryGeneratedColumn("increment", { type: "bigint" })
    id!: string;

    // We use JoinColumn to explicitly name the foreign key tournament_id.
    // Note: Since Tournament's primary key is an implicitly generated UUID,
    // TypeORM will automatically make tournament_id a UUID column to match it.
    @OneToOne(() => Tournament, (tournament) => tournament.format, { onDelete: "CASCADE" })
    @JoinColumn({ name: "tournament_id" })
    tournament!: Tournament;

    @OneToMany(() => TournamentTiebreaker, (tiebreaker) => tiebreaker.tournamentFormat, { cascade: true })
    tiebreakers!: TournamentTiebreaker[];

    @Column({ type: "varchar", length: 30 })
    format_type!: string;

    @OneToOne(() => FormatGroupSettings, (settings) => settings.format, { cascade: true, nullable: true })
    group_settings?: FormatGroupSettings;

    @OneToOne(() => FormatKnockoutSettings, (settings) => settings.format, { cascade: true, nullable: true })
    knockout_settings?: FormatKnockoutSettings;

    @OneToMany(() => FormatStage, (stage) => stage.format, { cascade: true })
    stages!: FormatStage[];

    @Column({ type: "boolean", default: false })
    home_away_enabled!: boolean;

    @Column({ type: "int", default: 3 })
    win_points!: number;

    @Column({ type: "int", default: 1 })
    draw_points!: number;

    @Column({ type: "int", default: 0 })
    loss_points!: number;

    @CreateDateColumn({ name: "created_at" })
    created_at!: Date;

    @UpdateDateColumn({ name: "updated_at" })
    updated_at!: Date;
}
