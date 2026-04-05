import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from "typeorm";
import { TeamMember } from "./team-member.entity";
import { TournamentTeam } from "../tournaments/tournament-team.entity";

export enum TeamType {
    CLUB = "Club",
    SCHOOL = "School",
    COLLEGE = "College",
    CORPORATE = "Corporate",
    ACADEMY = "Academy",
}

@Entity()
export class Team {
    @PrimaryGeneratedColumn()
    id!: number;

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

    @OneToMany(() => TournamentTeam, (registration) => registration.team)
    tournamentRegistrations!: TournamentTeam[];

    @OneToMany(() => TeamMember, (member) => member.team)
    members!: TeamMember[];

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}
