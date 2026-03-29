import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { Team } from "./team.entity";

export enum TeamMemberRole {
    PLAYER = "player",
    CAPTAIN = "captain",
    COACH = "coach",
    MANAGER = "manager"
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

    @ManyToOne(() => Team, (team) => team.members, { onDelete: "CASCADE" })
    team!: Team;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}
