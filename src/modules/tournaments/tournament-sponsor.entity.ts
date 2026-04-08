import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from "typeorm";
import { Tournament } from "./tournament.entity";
import { Sponsor } from "../../entities/sponsor.entity";

@Entity("tournament_sponsors")
export class TournamentSponsor {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column()
    tournament_id!: number;

    @Column()
    sponsor_id!: number;

    @ManyToOne(() => Tournament, (tournament) => tournament.tournamentSponsors, { onDelete: 'CASCADE' })
    @JoinColumn({ name: "tournament_id" })
    tournament!: Tournament;

    @ManyToOne(() => Sponsor, (sponsor) => sponsor.tournamentSponsors, { onDelete: 'CASCADE' })
    @JoinColumn({ name: "sponsor_id" })
    sponsor!: Sponsor;

    @CreateDateColumn()
    created_at!: Date;
}
