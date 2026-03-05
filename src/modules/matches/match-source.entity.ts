import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from "typeorm";
import { Match } from "./match.entity";

@Entity("match_sources")
export class MatchSource {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @ManyToOne(() => Match, (match) => match.matchSources, { onDelete: "CASCADE" })
    @JoinColumn({ name: "match_id" })
    match!: Match;

    @Column({ type: "enum", enum: ["home", "away"] })
    side!: string;

    @Column({ type: "enum", enum: ["team", "group_rank", "match_winner"] })
    source_type!: string;

    @Column({ type: "varchar", length: 255 })
    source_value!: string;

    @CreateDateColumn({ name: "created_at" })
    created_at!: Date;

    @UpdateDateColumn({ name: "updated_at" })
    updated_at!: Date;
}
