import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from "typeorm";
import { TournamentSponsor } from "../modules/tournaments/tournament-sponsor.entity";

@Entity("sponsors")
export class Sponsor {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column()
    name!: string;

    @Column({ nullable: true })
    logo!: string;

    @Column({ nullable: true })
    email!: string;

    @Column({ nullable: true })
    phone!: string;

    @Column({ nullable: true })
    website!: string;

    @Column({ type: "varchar", length: 100, nullable: true })
    type!: string; // e.g., Gold, Silver, Platinum

    @Column({ default: 0 })
    display_order!: number;

    @Column({ type: "enum", enum: ["active", "inactive"], default: "active" })
    status!: "active" | "inactive";

    @CreateDateColumn()
    created_at!: Date;

    @UpdateDateColumn()
    updated_at!: Date;

    @OneToMany(() => TournamentSponsor, (ts) => ts.sponsor)
    tournamentSponsors!: TournamentSponsor[];
}
