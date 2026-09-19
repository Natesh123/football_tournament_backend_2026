import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from "typeorm";

@Entity("notifications")
export class Notification {
    @PrimaryGeneratedColumn()
    id!: number;

    @Index()
    @Column({ name: "user_id", type: "int" })
    userId!: number;

    @Index()
    @Column({ type: "varchar", length: 100, default: "plan_update" })
    type!: string;

    @Column({ type: "varchar", length: 255 })
    title!: string;

    @Column({ type: "text" })
    message!: string;

    @Column({ name: "reference_id", type: "int", nullable: true })
    referenceId?: number | null;

    @Column({ name: "reference_type", type: "varchar", length: 100, nullable: true })
    referenceType?: string | null;

    @Index()
    @Column({ type: "varchar", length: 50, default: "pending" })
    status!: string;

    @Index()
    @Column({ name: "is_read", type: "boolean", default: false })
    isRead!: boolean;

    @Index()
    @CreateDateColumn({ name: "created_at" })
    createdAt!: Date;

    @UpdateDateColumn({ name: "updated_at" })
    updatedAt!: Date;
}
