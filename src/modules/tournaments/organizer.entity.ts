import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { Tournament } from "./tournament.entity";

@Entity()
export class Organizer {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column({ nullable: true })
    name?: string;

    @Column({ nullable: true })
    email?: string;

    @Column({ nullable: true })
    phone?: string;

    @Column({ nullable: true })
    website?: string;

    @OneToOne(() => Tournament, (tournament) => tournament.organizer, { onDelete: 'CASCADE' })
    @JoinColumn()
    tournament!: Tournament;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}
