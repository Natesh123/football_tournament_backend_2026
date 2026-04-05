import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from "typeorm";
import { Tournament } from "../tournament.entity";

export enum AcceptedPaymentMethod {
    BANK_TRANSFER = "bank_transfer",
    CASH = "cash",
    ONLINE = "online",
    UPI = "upi",
}

@Entity("tournament_finance")
export class TournamentFinance {
    @PrimaryGeneratedColumn()
    id!: number;

    @ManyToOne(() => Tournament, { onDelete: "CASCADE" })
    @JoinColumn({ name: "tournament_id" })
    tournament!: Tournament;

    @Column({ name: "registration_fee", type: "decimal", precision: 10, scale: 2, default: 0 })
    registrationFee!: number;

    @Column({
        name: "accepted_method",
        type: "enum",
        enum: AcceptedPaymentMethod,
        default: AcceptedPaymentMethod.BANK_TRANSFER
    })
    acceptedMethod!: AcceptedPaymentMethod;

    @Column({ name: "payment_instructions", type: "text", nullable: true })
    paymentInstructions?: string;

    @CreateDateColumn({ name: "created_at" })
    createdAt!: Date;

    @UpdateDateColumn({ name: "updated_at" })
    updatedAt!: Date;
}
