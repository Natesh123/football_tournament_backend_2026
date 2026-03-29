import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne } from "typeorm";
import { Tournament } from "./tournament.entity";
import { Team } from "../teams/team.entity";

export enum TeamStatus {
    PENDING = "pending",
    APPROVED = "approved",
    REJECTED = "rejected",
}

export enum TeamPaymentStatus {
    PENDING = "pending",
    PAID = "paid",
}

@Entity()
export class TournamentTeam {
    @PrimaryGeneratedColumn()
    id!: number;

    @ManyToOne(() => Tournament, (tournament) => tournament.teamRegistrations, { onDelete: "CASCADE" })
    tournament!: Tournament;

    @ManyToOne(() => Team, (team) => team.tournamentRegistrations, { onDelete: "CASCADE" })
    team!: Team;

    @Column({
        type: "enum",
        enum: TeamStatus,
        default: TeamStatus.PENDING,
    })
    status!: TeamStatus;

    @Column({
        type: "enum",
        enum: TeamPaymentStatus,
        default: TeamPaymentStatus.PENDING,
    })
    paymentStatus!: TeamPaymentStatus;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}
