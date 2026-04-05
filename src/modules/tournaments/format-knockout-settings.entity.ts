import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from "typeorm";
import { TournamentFormat } from "./tournament-format.entity";

@Entity("format_knockout_settings")
export class FormatKnockoutSettings {
    @PrimaryGeneratedColumn("increment", { type: "bigint" })
    id!: string;

    @ManyToOne(() => TournamentFormat, (format) => format.knockout_settings, { onDelete: "CASCADE" })
    @JoinColumn({ name: "format_id" })
    format!: TournamentFormat;

    @Column({ type: "int" })
    qualified_teams!: number;

    @Column({ type: "enum", enum: ["group_rank", "random", "manual"], default: "group_rank" })
    seeding_type!: string;

    @Column({ type: "boolean", default: false })
    third_place_match!: boolean;

    @CreateDateColumn({ name: "created_at" })
    created_at!: Date;

    @UpdateDateColumn({ name: "updated_at" })
    updated_at!: Date;
}
