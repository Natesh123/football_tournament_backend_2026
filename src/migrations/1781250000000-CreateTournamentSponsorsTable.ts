import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from "typeorm";

export class CreateTournamentSponsorsTable1781250000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: "tournament_sponsors",
                columns: [
                    {
                        name: "id",
                        type: "int",
                        isPrimary: true,
                        isGenerated: true,
                        generationStrategy: "increment",
                    },
                    {
                        name: "tournament_id",
                        type: "int",
                        isNullable: false,
                    },
                    {
                        name: "sponsor_id",
                        type: "int",
                        isNullable: false,
                    },
                    {
                        name: "created_at",
                        type: "timestamp",
                        default: "CURRENT_TIMESTAMP",
                    },
                ],
            }),
            true
        );

        await queryRunner.createForeignKey(
            "tournament_sponsors",
            new TableForeignKey({
                columnNames: ["tournament_id"],
                referencedColumnNames: ["id"],
                referencedTableName: "tournament",
                onDelete: "CASCADE",
            })
        );

        await queryRunner.createForeignKey(
            "tournament_sponsors",
            new TableForeignKey({
                columnNames: ["sponsor_id"],
                referencedColumnNames: ["id"],
                referencedTableName: "sponsors",
                onDelete: "CASCADE",
            })
        );

        await queryRunner.createIndex(
            "tournament_sponsors",
            new TableIndex({
                name: "IDX_TOURNAMENT_SPONSOR_UNIQUE",
                columnNames: ["tournament_id", "sponsor_id"],
                isUnique: true,
            })
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable("tournament_sponsors");
    }
}
