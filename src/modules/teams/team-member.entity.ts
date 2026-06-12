import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { Team } from "./team.entity";

export enum TeamMemberRole {
    PLAYER = "player",
    CAPTAIN = "captain",
    VICE_CAPTAIN = "vice_captain",
    COACH = "coach",
    MANAGER = "manager"
}

export enum TeamMemberStatus {
    ACTIVE = "active",
    INJURED = "injured",
    SUSPENDED = "suspended"
}

export enum PreferredFoot {
    RIGHT = "right",
    LEFT = "left",
    BOTH = "both"
}

@Entity()
export class TeamMember {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column()
    name!: string;

    @Column({
        type: "enum",
        enum: TeamMemberRole,
        default: TeamMemberRole.PLAYER
    })
    role!: TeamMemberRole;

    @Column({ nullable: true })
    position?: string;

    @Column({ type: "int", nullable: true })
    jerseyNumber?: number;

    @Column({
        type: "enum",
        enum: TeamMemberStatus,
        default: TeamMemberStatus.ACTIVE
    })
    status!: TeamMemberStatus;

    @Column({ type: "date", nullable: true })
    dob?: string;

    @Column({
        type: "enum",
        enum: PreferredFoot,
        nullable: true
    })
    preferredFoot?: PreferredFoot;

    @Column({ nullable: true })
    photoUrl?: string;

    @ManyToOne(() => Team, (team) => team.members, { onDelete: "CASCADE" })
    team!: Team;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}
