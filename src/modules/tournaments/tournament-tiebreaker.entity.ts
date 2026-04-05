import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from "typeorm";
import { TournamentFormat } from "./tournament-format.entity";

@Entity("tournament_tiebreakers")
export class TournamentTiebreaker {
    @PrimaryGeneratedColumn("increment", { type: "bigint" })
    id!: string;

    @ManyToOne(() => TournamentFormat, (format) => format.tiebreakers, { onDelete: "CASCADE" })
    @JoinColumn({ name: "tournament_format_id" })
    tournamentFormat!: TournamentFormat;

    @Column({ type: "varchar", length: 50 })
    rule_key!: string;

    @Column({ type: "int" })
    priority_order!: number;

    @CreateDateColumn({ name: "created_at" })
    created_at!: Date;

    @UpdateDateColumn({ name: "updated_at" })
    updated_at!: Date;
}
