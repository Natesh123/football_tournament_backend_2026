import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany } from "typeorm";
import { Tournament } from "../tournaments/tournament.entity";
import { TeamMember } from "./team-member.entity";

export enum TeamStatus {
    PENDING = "pending",
    APPROVED = "approved",
    REJECTED = "rejected",
}

export enum TeamType {
    CLUB = "Club",
    SCHOOL = "School",
    COLLEGE = "College",
    CORPORATE = "Corporate",
    ACADEMY = "Academy",
}

@Entity()
export class Team {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column()
    name!: string;

    @Column({ nullable: true })
    shortName?: string;

    @Column({ type: "longtext", nullable: true })
    logoUrl?: string;

    @Column({
        type: "enum",
        enum: TeamType,
        nullable: true,
    })
    teamType?: TeamType;

    @Column({ nullable: true })
    city?: string;

    @Column({ nullable: true })
    state?: string;

    @Column({ nullable: true })
    country?: string;

    @Column({ nullable: true })
    foundedYear?: number;

    @Column({ nullable: true })
    homeGround?: string;

    @Column({ type: "text", nullable: true })
    description?: string;

    @Column({ nullable: true })
    captainName?: string;

    @Column({ nullable: true })
    contactEmail?: string;

    @Column({
        type: "enum",
        enum: TeamStatus,
        default: TeamStatus.PENDING,
    })
    status!: TeamStatus;

    @ManyToOne(() => Tournament, (tournament) => tournament.teams, { onDelete: "CASCADE" })
    tournament!: Tournament;

    @OneToMany(() => TeamMember, (member) => member.team)
    members!: TeamMember[];

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}
