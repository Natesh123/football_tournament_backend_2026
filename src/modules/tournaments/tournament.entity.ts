import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from "typeorm";
import { Team } from "../teams/team.entity";

export enum TournamentStatus {
    DRAFT = "draft",
    REGISTRATION_OPEN = "registration_open",
    IN_PROGRESS = "in_progress",
    COMPLETED = "completed",
}

@Entity()
export class Tournament {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column()
    name!: string;

    @Column({ type: "text", nullable: true })
    description?: string;

    @Column()
    startDate!: Date;

    @Column()
    endDate!: Date;

    @Column({
        type: "enum",
        enum: TournamentStatus,
        default: TournamentStatus.DRAFT,
    })
    status!: TournamentStatus;

    @Column({ type: "int", default: 16 })
    maxTeams!: number;

    @OneToMany(() => Team, (team) => team.tournament)
    teams!: Team[];

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}
