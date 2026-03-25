import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from "typeorm";
import { Tournament } from "../tournament.entity";

@Entity("tournament_prize_pool")
export class TournamentPrizePool {
    @PrimaryGeneratedColumn()
    id!: number;

    @ManyToOne(() => Tournament, { onDelete: "CASCADE" })
    @JoinColumn({ name: "tournament_id" })
    tournament!: Tournament;

    @Column({ name: "total_prize_money", type: "decimal", precision: 10, scale: 2, default: 0 })
    totalPrizeMoney!: number;

    @Column({ name: "first_place_amount", type: "decimal", precision: 10, scale: 2, default: 0 })
    firstPlaceAmount!: number;

    @Column({ name: "second_place_amount", type: "decimal", precision: 10, scale: 2, default: 0 })
    secondPlaceAmount!: number;

    @Column({ name: "third_place_amount", type: "decimal", precision: 10, scale: 2, default: 0 })
    thirdPlaceAmount!: number;

    @CreateDateColumn({ name: "created_at" })
    createdAt!: Date;

    @UpdateDateColumn({ name: "updated_at" })
    updatedAt!: Date;
}
