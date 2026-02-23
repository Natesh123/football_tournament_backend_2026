import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from "typeorm";
import { UserRole } from "./role.entity";

@Entity("permissions")
export class Permission {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column()
    roleId!: number;

    @ManyToOne(() => UserRole)
    @JoinColumn({ name: "roleId" })
    role!: UserRole;

    @Column("json", { nullable: true })
    module_access!: any;
}
