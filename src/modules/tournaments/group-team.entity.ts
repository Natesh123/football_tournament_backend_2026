import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from "typeorm";
import { Group } from "./group.entity";
import { Team } from "../teams/team.entity";

@Entity("group_teams")
export class GroupTeam {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @ManyToOne(() => Group, (group) => group.group_teams, { onDelete: "CASCADE" })
    @JoinColumn({ name: "group_id" })
    group!: Group;

    @ManyToOne(() => Team, { onDelete: "CASCADE" })
    @JoinColumn({ name: "team_id" })
    team!: Team;

    @Column({ type: "int", default: 0 })
    played!: number;

    @Column({ type: "int", default: 0 })
    wins!: number;

    @Column({ type: "int", default: 0 })
    draws!: number;

    @Column({ type: "int", default: 0 })
    losses!: number;

    @Column({ type: "int", default: 0 })
    goals_for!: number;

    @Column({ type: "int", default: 0 })
    goals_against!: number;

    @Column({ type: "int", default: 0 })
    goal_difference!: number;

    @Column({ type: "int", default: 0 })
    points!: number;

    @Column({ type: "int", default: 0 })
    position!: number;

    @CreateDateColumn({ name: "created_at" })
    created_at!: Date;

    @UpdateDateColumn({ name: "updated_at" })
    updated_at!: Date;
}
