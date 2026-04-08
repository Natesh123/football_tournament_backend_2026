import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class CreateSponsorsTable1781200000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: "sponsors",
                columns: [
                    {
                        name: "id",
                        type: "int",
                        isPrimary: true,
                        isGenerated: true,
                        generationStrategy: "increment",
                    },
                    {
                        name: "name",
                        type: "varchar",
                        isNullable: false,
                    },
                    {
                        name: "logo",
                        type: "varchar",
                        isNullable: true,
                    },
                    {
                        name: "email",
                        type: "varchar",
                        isNullable: true,
                    },
                    {
                        name: "phone",
                        type: "varchar",
                        isNullable: true,
                    },
                    {
                        name: "website",
                        type: "varchar",
                        isNullable: true,
                    },
                    {
                        name: "type",
                        type: "varchar",
                        length: "100",
                        isNullable: true,
                    },
                    {
                        name: "display_order",
                        type: "int",
                        default: 0,
                    },
                    {
                        name: "status",
                        type: "enum",
                        enum: ["active", "inactive"],
                        default: "'active'",
                    },
                    {
                        name: "created_at",
                        type: "timestamp",
                        default: "CURRENT_TIMESTAMP",
                    },
                    {
                        name: "updated_at",
                        type: "timestamp",
                        default: "CURRENT_TIMESTAMP",
                        onUpdate: "CURRENT_TIMESTAMP",
                    },
                ],
            }),
            true
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable("sponsors");
    }
}
