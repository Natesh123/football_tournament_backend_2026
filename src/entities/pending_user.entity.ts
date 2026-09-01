import { Entity, PrimaryColumn, Column, CreateDateColumn } from "typeorm";

@Entity("pending_users")
export class PendingUser {
    @PrimaryColumn()
    email!: string;

    @Column()
    user_name!: string;

    @Column()
    password!: string;

    @Column()
    phone_number!: string;

    @Column()
    otp!: string;

    @Column()
    expires_at!: Date;

    @Column({ nullable: true, default: "Free" })
    plan!: string;

    @CreateDateColumn()
    created_at!: Date;
}
