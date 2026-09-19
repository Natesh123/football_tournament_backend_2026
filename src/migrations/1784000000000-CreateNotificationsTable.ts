import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateNotificationsTable1784000000000 implements MigrationInterface {
    name = "CreateNotificationsTable1784000000000";

    public async up(queryRunner: QueryRunner): Promise<void> {
        const tableExists = await queryRunner.hasTable("notifications");
        if (!tableExists) {
            await queryRunner.query(`
                CREATE TABLE \`notifications\` (
                    \`id\` int NOT NULL AUTO_INCREMENT,
                    \`user_id\` int NOT NULL,
                    \`type\` varchar(100) NOT NULL DEFAULT 'plan_update',
                    \`title\` varchar(255) NOT NULL,
                    \`message\` text NOT NULL,
                    \`reference_id\` int NULL,
                    \`reference_type\` varchar(100) NULL,
                    \`status\` varchar(50) NOT NULL DEFAULT 'pending',
                    \`is_read\` tinyint NOT NULL DEFAULT 0,
                    \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                    \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                    INDEX \`IDX_notifications_user_id\` (\`user_id\`),
                    INDEX \`IDX_notifications_type\` (\`type\`),
                    INDEX \`IDX_notifications_status\` (\`status\`),
                    INDEX \`IDX_notifications_is_read\` (\`is_read\`),
                    INDEX \`IDX_notifications_created_at\` (\`created_at\`),
                    PRIMARY KEY (\`id\`)
                ) ENGINE=InnoDB;
            `);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const tableExists = await queryRunner.hasTable("notifications");
        if (tableExists) {
            await queryRunner.query(`DROP TABLE \`notifications\``);
        }
    }
}
