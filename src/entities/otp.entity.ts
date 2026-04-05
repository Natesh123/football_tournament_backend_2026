import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity("user_otps")
export class UserOtp {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column()
    user_id!: number;

    @Column()
    otp!: string;

    @Column()
    expires_at!: Date;

    @Column({ default: false })
    is_used!: boolean;
}
