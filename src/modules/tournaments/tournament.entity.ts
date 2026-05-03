import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, OneToOne, ManyToOne } from "typeorm";
import { Organizer } from "./organizer.entity";
import { TournamentTeam } from "./tournament-team.entity";
import { TournamentFormat } from "./tournament-format.entity";
import { TournamentSponsor } from "./tournament-sponsor.entity";
import { Match } from "../matches/match.entity";
import { TournamentRules } from "./tournament-rules.entity";


export enum TournamentStatus {
    DRAFT = "draft",
    REGISTRATION_OPEN = "registration_open",
    IN_PROGRESS = "in_progress",
    COMPLETED = "completed",
}

@Entity()
export class Tournament {
    @PrimaryGeneratedColumn()
    id!: number;

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

    @Column({ nullable: true })
    participantType?: string;

    @Column({ type: "int", nullable: true })
    minTeams?: number;

    @Column({ type: "datetime", nullable: true })
    regOpenDate?: Date;

    @Column({ type: "datetime", nullable: true })
    regCloseDate?: Date;

    @Column({ type: "boolean", default: false })
    approvalRequired!: boolean;

    @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
    regFee!: number;

    @Column({ type: "int", nullable: true })
    playerLimit?: number;

    @Column({ type: "int", nullable: true })
    squadSize?: number;

    @Column({ nullable: true })
    shortName?: string;

    @Column({ nullable: true, default: '11aside' })
    type?: string;

    @Column({ nullable: true })
    visibility?: string;

    @Column({ type: "longtext", nullable: true })
    logo?: string;

    @Column({ type: "longtext", nullable: true })
    coverImage?: string;

    @OneToOne(() => Organizer, (organizer) => organizer.tournament, { cascade: true })
    organizer?: Organizer;

    @OneToOne(() => TournamentFormat, (format) => format.tournament, { cascade: ["insert", "update", "remove"] })
    format?: TournamentFormat;

    @OneToOne(() => TournamentRules, (rules) => rules.tournament, { cascade: ["insert", "update", "remove"] })
    rules?: TournamentRules;



    @Column({ nullable: true })
    sponsors?: string;

    @OneToMany(() => TournamentTeam, (registration) => registration.tournament)
    teamRegistrations!: TournamentTeam[];

    @OneToMany(() => Match, (match) => match.tournament)
    matches!: Match[];

    @OneToMany(() => TournamentSponsor, (ts) => ts.tournament)
    tournamentSponsors!: TournamentSponsor[];

    @Column({ nullable: true })
    ownerId?: number;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}
