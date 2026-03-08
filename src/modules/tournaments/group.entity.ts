import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from "typeorm";
import { Tournament } from "./tournament.entity";
import { FormatStage } from "./format-stage.entity";
import { GroupTeam } from "./group-team.entity";

@Entity("groups")
export class Group {
    @PrimaryGeneratedColumn()
    id!: number;

    @ManyToOne(() => Tournament, { onDelete: "CASCADE" })
    @JoinColumn({ name: "tournament_id" })
    tournament!: Tournament;

    @ManyToOne(() => FormatStage, { onDelete: "CASCADE" })
    @JoinColumn({ name: "stage_id" })
    stage!: FormatStage;

    @Column({ type: "varchar", length: 255 })
    group_name!: string;

    @OneToMany(() => GroupTeam, (groupTeam) => groupTeam.group, { cascade: true })
    group_teams!: GroupTeam[];

    @CreateDateColumn({ name: "created_at" })
    created_at!: Date;

    @UpdateDateColumn({ name: "updated_at" })
    updated_at!: Date;
}
