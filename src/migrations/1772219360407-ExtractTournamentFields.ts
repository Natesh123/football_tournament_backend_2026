import { MigrationInterface, QueryRunner } from "typeorm";

export class ExtractTournamentFields1772219360407 implements MigrationInterface {
    name = 'ExtractTournamentFields1772219360407'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`users\` CHANGE \`roleId\` \`roleId\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`permissions\` DROP COLUMN \`module_access\``);
        await queryRunner.query(`ALTER TABLE \`permissions\` ADD \`module_access\` json NULL`);
        await queryRunner.query(`ALTER TABLE \`team_member\` CHANGE \`position\` \`position\` varchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE \`team_member\` CHANGE \`jerseyNumber\` \`jerseyNumber\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`team_member\` CHANGE \`teamId\` \`teamId\` varchar(36) NULL`);
        await queryRunner.query(`ALTER TABLE \`team\` CHANGE \`shortName\` \`shortName\` varchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE \`team\` CHANGE \`logoUrl\` \`logoUrl\` longtext NULL`);
        await queryRunner.query(`ALTER TABLE \`team\` CHANGE \`teamType\` \`teamType\` enum ('Club', 'School', 'College', 'Corporate', 'Academy') NULL`);
        await queryRunner.query(`ALTER TABLE \`team\` CHANGE \`city\` \`city\` varchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE \`team\` CHANGE \`state\` \`state\` varchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE \`team\` CHANGE \`country\` \`country\` varchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE \`team\` CHANGE \`foundedYear\` \`foundedYear\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`team\` CHANGE \`homeGround\` \`homeGround\` varchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE \`team\` CHANGE \`description\` \`description\` text NULL`);
        await queryRunner.query(`ALTER TABLE \`team\` CHANGE \`captainName\` \`captainName\` varchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE \`team\` CHANGE \`contactEmail\` \`contactEmail\` varchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE \`team\` CHANGE \`tournamentId\` \`tournamentId\` varchar(36) NULL`);
        await queryRunner.query(`ALTER TABLE \`organizer\` CHANGE \`name\` \`name\` varchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE \`organizer\` CHANGE \`email\` \`email\` varchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE \`organizer\` CHANGE \`phone\` \`phone\` varchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE \`organizer\` CHANGE \`website\` \`website\` varchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE \`organizer\` CHANGE \`tournamentId\` \`tournamentId\` varchar(36) NULL`);
        await queryRunner.query(`ALTER TABLE \`sponsor\` CHANGE \`name\` \`name\` varchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE \`sponsor\` CHANGE \`website\` \`website\` varchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE \`sponsor\` CHANGE \`tournamentId\` \`tournamentId\` varchar(36) NULL`);
        await queryRunner.query(`ALTER TABLE \`tournament\` CHANGE \`description\` \`description\` text NULL`);
        await queryRunner.query(`ALTER TABLE \`tournament\` CHANGE \`shortName\` \`shortName\` varchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE \`tournament\` CHANGE \`type\` \`type\` varchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE \`tournament\` CHANGE \`visibility\` \`visibility\` varchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE \`tournament\` CHANGE \`logo\` \`logo\` text NULL`);
        await queryRunner.query(`ALTER TABLE \`tournament\` CHANGE \`coverImage\` \`coverImage\` text NULL`);
        await queryRunner.query(`ALTER TABLE \`tournament\` DROP COLUMN \`settings\``);
        await queryRunner.query(`ALTER TABLE \`tournament\` ADD \`settings\` json NULL`);
        await queryRunner.query(`ALTER TABLE \`users\` ADD CONSTRAINT \`FK_368e146b785b574f42ae9e53d5e\` FOREIGN KEY (\`roleId\`) REFERENCES \`user_role\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`team_member\` ADD CONSTRAINT \`FK_74da8f612921485e1005dc8e225\` FOREIGN KEY (\`teamId\`) REFERENCES \`team\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`team\` ADD CONSTRAINT \`FK_6c381b833f42438bdf2206f47bd\` FOREIGN KEY (\`tournamentId\`) REFERENCES \`tournament\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`organizer\` ADD CONSTRAINT \`FK_95b76af812bcd51f0e180126ed1\` FOREIGN KEY (\`tournamentId\`) REFERENCES \`tournament\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`sponsor\` ADD CONSTRAINT \`FK_1f3625055d5a9c1e6bf205ce355\` FOREIGN KEY (\`tournamentId\`) REFERENCES \`tournament\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`sponsor\` DROP FOREIGN KEY \`FK_1f3625055d5a9c1e6bf205ce355\``);
        await queryRunner.query(`ALTER TABLE \`organizer\` DROP FOREIGN KEY \`FK_95b76af812bcd51f0e180126ed1\``);
        await queryRunner.query(`ALTER TABLE \`team\` DROP FOREIGN KEY \`FK_6c381b833f42438bdf2206f47bd\``);
        await queryRunner.query(`ALTER TABLE \`team_member\` DROP FOREIGN KEY \`FK_74da8f612921485e1005dc8e225\``);
        await queryRunner.query(`ALTER TABLE \`users\` DROP FOREIGN KEY \`FK_368e146b785b574f42ae9e53d5e\``);
        await queryRunner.query(`ALTER TABLE \`tournament\` DROP COLUMN \`settings\``);
        await queryRunner.query(`ALTER TABLE \`tournament\` ADD \`settings\` longtext COLLATE "utf8mb4_bin" NULL DEFAULT 'NULL'`);
        await queryRunner.query(`ALTER TABLE \`tournament\` CHANGE \`coverImage\` \`coverImage\` text NULL DEFAULT 'NULL'`);
        await queryRunner.query(`ALTER TABLE \`tournament\` CHANGE \`logo\` \`logo\` text NULL DEFAULT 'NULL'`);
        await queryRunner.query(`ALTER TABLE \`tournament\` CHANGE \`visibility\` \`visibility\` varchar(255) NULL DEFAULT 'NULL'`);
        await queryRunner.query(`ALTER TABLE \`tournament\` CHANGE \`type\` \`type\` varchar(255) NULL DEFAULT 'NULL'`);
        await queryRunner.query(`ALTER TABLE \`tournament\` CHANGE \`shortName\` \`shortName\` varchar(255) NULL DEFAULT 'NULL'`);
        await queryRunner.query(`ALTER TABLE \`tournament\` CHANGE \`description\` \`description\` text NULL DEFAULT 'NULL'`);
        await queryRunner.query(`ALTER TABLE \`sponsor\` CHANGE \`tournamentId\` \`tournamentId\` varchar(36) NULL DEFAULT 'NULL'`);
        await queryRunner.query(`ALTER TABLE \`sponsor\` CHANGE \`website\` \`website\` varchar(255) NULL DEFAULT 'NULL'`);
        await queryRunner.query(`ALTER TABLE \`sponsor\` CHANGE \`name\` \`name\` varchar(255) NULL DEFAULT 'NULL'`);
        await queryRunner.query(`ALTER TABLE \`organizer\` CHANGE \`tournamentId\` \`tournamentId\` varchar(36) NULL DEFAULT 'NULL'`);
        await queryRunner.query(`ALTER TABLE \`organizer\` CHANGE \`website\` \`website\` varchar(255) NULL DEFAULT 'NULL'`);
        await queryRunner.query(`ALTER TABLE \`organizer\` CHANGE \`phone\` \`phone\` varchar(255) NULL DEFAULT 'NULL'`);
        await queryRunner.query(`ALTER TABLE \`organizer\` CHANGE \`email\` \`email\` varchar(255) NULL DEFAULT 'NULL'`);
        await queryRunner.query(`ALTER TABLE \`organizer\` CHANGE \`name\` \`name\` varchar(255) NULL DEFAULT 'NULL'`);
        await queryRunner.query(`ALTER TABLE \`team\` CHANGE \`tournamentId\` \`tournamentId\` varchar(36) NULL DEFAULT 'NULL'`);
        await queryRunner.query(`ALTER TABLE \`team\` CHANGE \`contactEmail\` \`contactEmail\` varchar(255) NULL DEFAULT 'NULL'`);
        await queryRunner.query(`ALTER TABLE \`team\` CHANGE \`captainName\` \`captainName\` varchar(255) NULL DEFAULT 'NULL'`);
        await queryRunner.query(`ALTER TABLE \`team\` CHANGE \`description\` \`description\` text NULL DEFAULT 'NULL'`);
        await queryRunner.query(`ALTER TABLE \`team\` CHANGE \`homeGround\` \`homeGround\` varchar(255) NULL DEFAULT 'NULL'`);
        await queryRunner.query(`ALTER TABLE \`team\` CHANGE \`foundedYear\` \`foundedYear\` int NULL DEFAULT 'NULL'`);
        await queryRunner.query(`ALTER TABLE \`team\` CHANGE \`country\` \`country\` varchar(255) NULL DEFAULT 'NULL'`);
        await queryRunner.query(`ALTER TABLE \`team\` CHANGE \`state\` \`state\` varchar(255) NULL DEFAULT 'NULL'`);
        await queryRunner.query(`ALTER TABLE \`team\` CHANGE \`city\` \`city\` varchar(255) NULL DEFAULT 'NULL'`);
        await queryRunner.query(`ALTER TABLE \`team\` CHANGE \`teamType\` \`teamType\` enum ('Club', 'School', 'College', 'Corporate', 'Academy') NULL DEFAULT 'NULL'`);
        await queryRunner.query(`ALTER TABLE \`team\` CHANGE \`logoUrl\` \`logoUrl\` longtext NULL DEFAULT 'NULL'`);
        await queryRunner.query(`ALTER TABLE \`team\` CHANGE \`shortName\` \`shortName\` varchar(255) NULL DEFAULT 'NULL'`);
        await queryRunner.query(`ALTER TABLE \`team_member\` CHANGE \`teamId\` \`teamId\` varchar(36) NULL DEFAULT 'NULL'`);
        await queryRunner.query(`ALTER TABLE \`team_member\` CHANGE \`jerseyNumber\` \`jerseyNumber\` int NULL DEFAULT 'NULL'`);
        await queryRunner.query(`ALTER TABLE \`team_member\` CHANGE \`position\` \`position\` varchar(255) NULL DEFAULT 'NULL'`);
        await queryRunner.query(`ALTER TABLE \`permissions\` DROP COLUMN \`module_access\``);
        await queryRunner.query(`ALTER TABLE \`permissions\` ADD \`module_access\` longtext COLLATE "utf8mb4_bin" NULL DEFAULT 'NULL'`);
        await queryRunner.query(`ALTER TABLE \`users\` CHANGE \`roleId\` \`roleId\` int NULL DEFAULT 'NULL'`);
    }

}
