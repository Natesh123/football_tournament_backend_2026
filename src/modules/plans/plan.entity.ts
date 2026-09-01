import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";

@Entity("plans")
export class Plan {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column()
    name!: string;

    /** Unique machine code, e.g. "CLUB", "LEAGUE", "FEDERATION". */
    @Column({ unique: true })
    code!: string;

    @Column({ type: "text", nullable: true })
    description?: string;

    @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
    monthlyPrice!: number;

    @Column({ type: "decimal", precision: 10, scale: 2, nullable: true })
    yearlyPrice?: number;

    @Column({ type: "int", default: 0 })
    maxTournaments!: number;

    @Column({ type: "int", default: 0 })
    maxTeams!: number;

    @Column({ type: "int", default: 0 })
    maxPlayers!: number;

    @Column({ type: "int", default: 0 })
    maxStaff!: number;

    @Column({ type: "int", default: 0 })
    maxGrounds!: number;

    @Column({ type: "int", default: 0 })
    maxReferees!: number;

    @Column({ type: "int", default: 0 })
    maxVendors!: number;

    /** Storage limit in megabytes. */
    @Column({ type: "int", default: 0 })
    storageLimitMb!: number;

    @Column({ type: "int", default: 0 })
    trialDays!: number;

    /** List of feature bullet points shown on the plan card. */
    @Column({ type: "json", nullable: true })
    features?: string[];

    @Column({ type: "boolean", default: false })
    allowOnlineRegistration!: boolean;

    @Column({ type: "boolean", default: false })
    allowPayment!: boolean;

    @Column({ type: "varchar", default: "Basic" })
    reportsLevel!: string;

    @Column({ type: "boolean", default: false })
    allowCustomBranding!: boolean;

    @Column({ type: "int", default: 0 })
    displayOrder!: number;

    @Column({ type: "boolean", default: false })
    isPopular!: boolean;

    @Column({ type: "boolean", default: true })
    landingVisible!: boolean;

    @Column({ type: "enum", enum: ["active", "inactive"], default: "active" })
    status!: "active" | "inactive";

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}
