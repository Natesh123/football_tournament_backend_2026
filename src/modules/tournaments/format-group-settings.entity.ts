import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from "typeorm";
import { TournamentFormat } from "./tournament-format.entity";

@Entity("format_group_settings")
export class FormatGroupSettings {
    @PrimaryGeneratedColumn("increment", { type: "bigint" })
    id!: string;

    @ManyToOne(() => TournamentFormat, (format) => format.group_settings, { onDelete: "CASCADE" })
    @JoinColumn({ name: "format_id" })
    format!: TournamentFormat;

    @Column({ type: "int" })
    groups_count!: number;

    @Column({ type: "int" })
    teams_per_group!: number;

    @Column({ type: "int" })
    total_teams!: number;

    @Column({ type: "boolean", default: false })
    home_away_enabled!: boolean;

    @CreateDateColumn({ name: "created_at" })
    created_at!: Date;

    @UpdateDateColumn({ name: "updated_at" })
    updated_at!: Date;
}
