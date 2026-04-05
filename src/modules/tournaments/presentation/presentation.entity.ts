import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from "typeorm";
import { Tournament } from "../tournament.entity";

@Entity("tournament_presentation")
export class TournamentPresentation {
    @PrimaryGeneratedColumn()
    id!: number;

    @ManyToOne(() => Tournament, { onDelete: "CASCADE" })
    @JoinColumn({ name: "tournament_id" })
    tournament!: Tournament;

    @Column({ name: "brand_color", type: "varchar", length: 7, default: "#FFC107" })
    brandColor!: string;

    @Column({ name: "welcome_message", type: "text", nullable: true })
    welcomeMessage?: string;

    @Column({ name: "show_standings_widget", type: "boolean", default: true })
    showStandingsWidget!: boolean;

    @Column({ name: "show_top_scorers", type: "boolean", default: true })
    showTopScorers!: boolean;

    @Column({ name: "live_broadcast_enabled", type: "boolean", default: false })
    liveBroadcastEnabled!: boolean;

    @Column({ name: "show_recent_results", type: "boolean", default: true })
    showRecentResults!: boolean;

    @Column({ name: "live_stream_link", type: "varchar", length: 255, nullable: true })
    liveStreamLink?: string;

    @CreateDateColumn({ name: "created_at" })
    createdAt!: Date;

    @UpdateDateColumn({ name: "updated_at" })
    updatedAt!: Date;
}
