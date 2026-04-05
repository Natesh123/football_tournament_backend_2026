import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from "typeorm";
import { Tournament } from "../tournament.entity";

export enum FieldType {
    NATURAL_GRASS = "natural_grass",
    ARTIFICIAL_TURF = "artificial_turf",
    INDOOR = "indoor",
    FUTSAL = "futsal",
}

@Entity("tournament_venues")
export class TournamentVenue {
    @PrimaryGeneratedColumn()
    id!: number;

    @ManyToOne(() => Tournament, { onDelete: "CASCADE" })
    @JoinColumn({ name: "tournament_id" })
    tournament!: Tournament;

    @Column({ name: "primary_venue_name", type: "varchar", length: 255 })
    primaryVenueName!: string;

    @Column({ name: "venue_address", type: "text", nullable: true })
    venueAddress?: string;

    @Column({ name: "total_pitches", type: "int", default: 1 })
    totalPitches!: number;

    @Column({ 
        name: "field_type",
        type: "enum",
        enum: FieldType,
        default: FieldType.NATURAL_GRASS
    })
    fieldType!: FieldType;

    @Column({ name: "multiple_venues_enabled", type: "boolean", default: false })
    multipleVenuesEnabled!: boolean;

    @Column({ type: "json", nullable: true })
    pitches?: { id: string, name: string, type?: string }[];

    @CreateDateColumn({ name: "created_at" })
    createdAt!: Date;

    @UpdateDateColumn({ name: "updated_at" })
    updatedAt!: Date;
}
