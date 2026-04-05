import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from "typeorm";
import { TournamentFormat } from "./tournament-format.entity";

@Entity("format_stages")
export class FormatStage {
    @PrimaryGeneratedColumn("increment", { type: "bigint" })
    id!: string;

    @ManyToOne(() => TournamentFormat, (format) => format.stages, { onDelete: "CASCADE" })
    @JoinColumn({ name: "format_id" })
    format!: TournamentFormat;

    @Column({ type: "int" })
    stage_order!: number;

    @Column({ type: "enum", enum: ["group", "knockout"] })
    stage_type!: string;

    @Column({ type: "varchar", length: 255 })
    stage_name!: string;

    @Column({ type: "int" })
    teams_count!: number;

    @CreateDateColumn({ name: "created_at" })
    created_at!: Date;
}
