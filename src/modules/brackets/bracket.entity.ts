import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn, ManyToOne } from "typeorm";
import { Tournament } from "../tournaments/tournament.entity";
import { FormatStage } from "../tournaments/format-stage.entity";
@Entity()
export class Bracket {
    @PrimaryGeneratedColumn()
    id!: number;

    @OneToOne(() => Tournament)
    @JoinColumn()
    tournament!: Tournament;

    @ManyToOne(() => FormatStage, { nullable: true, onDelete: "CASCADE" })
    @JoinColumn({ name: "stage_id" })
    stage?: FormatStage;

    @Column({ type: "json", nullable: true })
    structureData?: any; // To store visual metadata or position overrides

    @Column({ default: "single_elimination" })
    type!: string;
}
