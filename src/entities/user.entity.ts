import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from "typeorm";
import { UserRole } from "./role.entity";

@Entity("users")
export class User {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ unique: true })
    email!: string;

    @Column({ unique: true })
    user_name!: string;

    @Column()
    phone_number!: string;

    @Column()
    password!: string;

    @Column({ nullable: true })
    roleId!: number;

    @ManyToOne(() => UserRole, (role) => role.users)
    @JoinColumn({ name: "roleId" })
    userRole!: UserRole;

    @Column({ default: 1 })
    state!: number;

    @Column({ default: false })
    is_verified!: boolean;
}
