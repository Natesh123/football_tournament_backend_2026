import { MigrationInterface, QueryRunner } from "typeorm";

export class MigrateUuidToIntIds1741421501000 implements MigrationInterface {
    name = "MigrateUuidToIntIds1741421501000";

    public async up(queryRunner: QueryRunner): Promise<void> {
        // ──────────────────────────────────────────────
        // 1. Disable FK checks so we can drop in any order,
        //    then DROP all UUID-based tables.
        // ──────────────────────────────────────────────
        await queryRunner.query(`SET FOREIGN_KEY_CHECKS = 0`);

        await queryRunner.query(`DROP TABLE IF EXISTS \`match_sources\``);
        await queryRunner.query(`DROP TABLE IF EXISTS \`bracket\``);
        await queryRunner.query(`DROP TABLE IF EXISTS \`match\``);
        await queryRunner.query(`DROP TABLE IF EXISTS \`group_teams\``);
        await queryRunner.query(`DROP TABLE IF EXISTS \`groups\``);
        await queryRunner.query(`DROP TABLE IF EXISTS \`tournament_team\``);
        await queryRunner.query(`DROP TABLE IF EXISTS \`team_member\``);
        await queryRunner.query(`DROP TABLE IF EXISTS \`organizer\``);
        // sponsor table also has a FK to tournament.id (not in TypeORM entities)
        await queryRunner.query(`DROP TABLE IF EXISTS \`sponsor\``);

        // tournament_formats.tournament_id was varchar(36) → drop FK/column if they still exist
        // NOTE: MySQL DDL auto-commits even inside a TypeORM transaction, so these may already be gone.
        const [fkRows]: any = await queryRunner.query(
            `SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tournament_formats'
               AND CONSTRAINT_TYPE = 'FOREIGN KEY' AND CONSTRAINT_NAME = 'FK_3dd7c6e89c59e847a559aa620bc'`
        );
        if (fkRows) {
            await queryRunner.query(`ALTER TABLE \`tournament_formats\` DROP FOREIGN KEY \`FK_3dd7c6e89c59e847a559aa620bc\``);
        }
        const [idxRows]: any = await queryRunner.query(
            `SELECT INDEX_NAME FROM information_schema.STATISTICS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tournament_formats'
               AND INDEX_NAME = 'REL_3dd7c6e89c59e847a559aa620b'`
        );
        if (idxRows) {
            await queryRunner.query(`DROP INDEX \`REL_3dd7c6e89c59e847a559aa620b\` ON \`tournament_formats\``);
        }
        const [colRows]: any = await queryRunner.query(
            `SELECT COLUMN_NAME FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tournament_formats'
               AND COLUMN_NAME = 'tournament_id'`
        );
        if (colRows) {
            await queryRunner.query(`ALTER TABLE \`tournament_formats\` DROP COLUMN \`tournament_id\``);
        }


        await queryRunner.query(`DROP TABLE IF EXISTS \`team\``);
        await queryRunner.query(`DROP TABLE IF EXISTS \`tournament\``);

        await queryRunner.query(`SET FOREIGN_KEY_CHECKS = 1`);

        // ──────────────────────────────────────────────
        // 2. RECREATE tables with INT auto-increment PKs
        //    in dependency order (parents first).
        // ──────────────────────────────────────────────

        // tournament
        await queryRunner.query(`
            CREATE TABLE \`tournament\` (
                \`id\`              INT NOT NULL AUTO_INCREMENT,
                \`name\`            VARCHAR(255) NOT NULL,
                \`description\`     TEXT NULL,
                \`startDate\`       DATETIME NOT NULL,
                \`endDate\`         DATETIME NOT NULL,
                \`status\`          ENUM('draft','registration_open','in_progress','completed') NOT NULL DEFAULT 'draft',
                \`maxTeams\`        INT NOT NULL DEFAULT 16,
                \`participantType\` VARCHAR(255) NULL,
                \`minTeams\`        INT NULL,
                \`regOpenDate\`     DATETIME NULL,
                \`regCloseDate\`    DATETIME NULL,
                \`approvalRequired\` TINYINT NOT NULL DEFAULT 0,
                \`regFee\`          DECIMAL(10,2) NOT NULL DEFAULT '0.00',
                \`playerLimit\`     INT NULL,
                \`squadSize\`       INT NULL,
                \`shortName\`       VARCHAR(255) NULL,
                \`type\`            VARCHAR(255) NULL,
                \`visibility\`      VARCHAR(255) NULL,
                \`logo\`            LONGTEXT NULL,
                \`coverImage\`      LONGTEXT NULL,
                \`sponsors\`        VARCHAR(255) NULL,
                \`createdAt\`       DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updatedAt\`       DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                PRIMARY KEY (\`id\`)
            ) ENGINE=InnoDB
        `);

        // team
        await queryRunner.query(`
            CREATE TABLE \`team\` (
                \`id\`           INT NOT NULL AUTO_INCREMENT,
                \`name\`         VARCHAR(255) NOT NULL,
                \`shortName\`    VARCHAR(255) NULL,
                \`logoUrl\`      LONGTEXT NULL,
                \`teamType\`     ENUM('Club','School','College','Corporate','Academy') NULL,
                \`city\`         VARCHAR(255) NULL,
                \`state\`        VARCHAR(255) NULL,
                \`country\`      VARCHAR(255) NULL,
                \`foundedYear\`  INT NULL,
                \`homeGround\`   VARCHAR(255) NULL,
                \`description\`  TEXT NULL,
                \`captainName\`  VARCHAR(255) NULL,
                \`contactEmail\` VARCHAR(255) NULL,
                \`createdAt\`    DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updatedAt\`    DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                PRIMARY KEY (\`id\`)
            ) ENGINE=InnoDB
        `);

        // organizer (FK → tournament)
        await queryRunner.query(`
            CREATE TABLE \`organizer\` (
                \`id\`            INT NOT NULL AUTO_INCREMENT,
                \`name\`          VARCHAR(255) NULL,
                \`email\`         VARCHAR(255) NULL,
                \`phone\`         VARCHAR(255) NULL,
                \`website\`       VARCHAR(255) NULL,
                \`createdAt\`     DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updatedAt\`     DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                \`tournamentId\`  INT NULL,
                PRIMARY KEY (\`id\`)
            ) ENGINE=InnoDB
        `);
        await queryRunner.query(`
            ALTER TABLE \`organizer\`
            ADD CONSTRAINT \`FK_organizer_tournament\`
            FOREIGN KEY (\`tournamentId\`) REFERENCES \`tournament\`(\`id\`) ON DELETE CASCADE
        `);

        // team_member (FK → team)
        await queryRunner.query(`
            CREATE TABLE \`team_member\` (
                \`id\`           INT NOT NULL AUTO_INCREMENT,
                \`name\`         VARCHAR(255) NOT NULL,
                \`role\`         ENUM('player','captain','coach','manager') NOT NULL DEFAULT 'player',
                \`position\`     VARCHAR(255) NULL,
                \`jerseyNumber\` INT NULL,
                \`createdAt\`    DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updatedAt\`    DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                \`teamId\`       INT NULL,
                PRIMARY KEY (\`id\`)
            ) ENGINE=InnoDB
        `);
        await queryRunner.query(`
            ALTER TABLE \`team_member\`
            ADD CONSTRAINT \`FK_team_member_team\`
            FOREIGN KEY (\`teamId\`) REFERENCES \`team\`(\`id\`) ON DELETE CASCADE
        `);

        // tournament_team (FK → tournament, team)
        await queryRunner.query(`
            CREATE TABLE \`tournament_team\` (
                \`id\`            INT NOT NULL AUTO_INCREMENT,
                \`status\`        ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
                \`paymentStatus\` ENUM('pending','paid') NOT NULL DEFAULT 'pending',
                \`createdAt\`     DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updatedAt\`     DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                \`tournamentId\`  INT NULL,
                \`teamId\`        INT NULL,
                PRIMARY KEY (\`id\`)
            ) ENGINE=InnoDB
        `);
        await queryRunner.query(`
            ALTER TABLE \`tournament_team\`
            ADD CONSTRAINT \`FK_tournament_team_tournament\`
            FOREIGN KEY (\`tournamentId\`) REFERENCES \`tournament\`(\`id\`) ON DELETE CASCADE
        `);
        await queryRunner.query(`
            ALTER TABLE \`tournament_team\`
            ADD CONSTRAINT \`FK_tournament_team_team\`
            FOREIGN KEY (\`teamId\`) REFERENCES \`team\`(\`id\`) ON DELETE CASCADE
        `);

        // Add tournament_id INT column back to tournament_formats
        await queryRunner.query(`
            ALTER TABLE \`tournament_formats\`
            ADD COLUMN \`tournament_id\` INT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE \`tournament_formats\`
            ADD UNIQUE INDEX \`REL_tournament_formats_tournament\` (\`tournament_id\`)
        `);
        await queryRunner.query(`
            ALTER TABLE \`tournament_formats\`
            ADD CONSTRAINT \`FK_tournament_formats_tournament\`
            FOREIGN KEY (\`tournament_id\`) REFERENCES \`tournament\`(\`id\`) ON DELETE CASCADE
        `);

        // groups (FK → tournament, format_stages)
        await queryRunner.query(`
            CREATE TABLE \`groups\` (
                \`id\`           INT NOT NULL AUTO_INCREMENT,
                \`group_name\`   VARCHAR(255) NOT NULL,
                \`created_at\`   DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updated_at\`   DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                \`tournament_id\` INT NULL,
                \`stage_id\`     BIGINT NULL,
                PRIMARY KEY (\`id\`)
            ) ENGINE=InnoDB
        `);
        await queryRunner.query(`
            ALTER TABLE \`groups\`
            ADD CONSTRAINT \`FK_groups_tournament\`
            FOREIGN KEY (\`tournament_id\`) REFERENCES \`tournament\`(\`id\`) ON DELETE CASCADE
        `);
        await queryRunner.query(`
            ALTER TABLE \`groups\`
            ADD CONSTRAINT \`FK_groups_stage\`
            FOREIGN KEY (\`stage_id\`) REFERENCES \`format_stages\`(\`id\`) ON DELETE CASCADE
        `);

        // group_teams (FK → groups, team)
        await queryRunner.query(`
            CREATE TABLE \`group_teams\` (
                \`id\`             INT NOT NULL AUTO_INCREMENT,
                \`played\`         INT NOT NULL DEFAULT 0,
                \`wins\`           INT NOT NULL DEFAULT 0,
                \`draws\`          INT NOT NULL DEFAULT 0,
                \`losses\`         INT NOT NULL DEFAULT 0,
                \`goals_for\`      INT NOT NULL DEFAULT 0,
                \`goals_against\`  INT NOT NULL DEFAULT 0,
                \`goal_difference\` INT NOT NULL DEFAULT 0,
                \`points\`         INT NOT NULL DEFAULT 0,
                \`position\`       INT NOT NULL DEFAULT 0,
                \`created_at\`     DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updated_at\`     DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                \`group_id\`       INT NULL,
                \`team_id\`        INT NULL,
                PRIMARY KEY (\`id\`)
            ) ENGINE=InnoDB
        `);
        await queryRunner.query(`
            ALTER TABLE \`group_teams\`
            ADD CONSTRAINT \`FK_group_teams_group\`
            FOREIGN KEY (\`group_id\`) REFERENCES \`groups\`(\`id\`) ON DELETE CASCADE
        `);
        await queryRunner.query(`
            ALTER TABLE \`group_teams\`
            ADD CONSTRAINT \`FK_group_teams_team\`
            FOREIGN KEY (\`team_id\`) REFERENCES \`team\`(\`id\`) ON DELETE CASCADE
        `);

        // match (FK → tournament, team x2, format_stages, groups)
        await queryRunner.query(`
            CREATE TABLE \`match\` (
                \`id\`             INT NOT NULL AUTO_INCREMENT,
                \`homeScore\`      INT NOT NULL DEFAULT 0,
                \`awayScore\`      INT NOT NULL DEFAULT 0,
                \`startTime\`      DATETIME NOT NULL,
                \`status\`         ENUM('scheduled','live','completed') NOT NULL DEFAULT 'scheduled',
                \`round\`          INT NULL,
                \`bracketPosition\` INT NULL,
                \`createdAt\`      DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updatedAt\`      DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                \`tournamentId\`   INT NULL,
                \`homeTeamId\`     INT NULL,
                \`awayTeamId\`     INT NULL,
                \`stage_id\`       BIGINT NULL,
                \`group_id\`       INT NULL,
                PRIMARY KEY (\`id\`)
            ) ENGINE=InnoDB
        `);
        await queryRunner.query(`
            ALTER TABLE \`match\`
            ADD CONSTRAINT \`FK_match_tournament\`
            FOREIGN KEY (\`tournamentId\`) REFERENCES \`tournament\`(\`id\`) ON DELETE CASCADE
        `);
        await queryRunner.query(`
            ALTER TABLE \`match\`
            ADD CONSTRAINT \`FK_match_home_team\`
            FOREIGN KEY (\`homeTeamId\`) REFERENCES \`team\`(\`id\`) ON DELETE SET NULL
        `);
        await queryRunner.query(`
            ALTER TABLE \`match\`
            ADD CONSTRAINT \`FK_match_away_team\`
            FOREIGN KEY (\`awayTeamId\`) REFERENCES \`team\`(\`id\`) ON DELETE SET NULL
        `);
        await queryRunner.query(`
            ALTER TABLE \`match\`
            ADD CONSTRAINT \`FK_match_stage\`
            FOREIGN KEY (\`stage_id\`) REFERENCES \`format_stages\`(\`id\`) ON DELETE CASCADE
        `);
        await queryRunner.query(`
            ALTER TABLE \`match\`
            ADD CONSTRAINT \`FK_match_group\`
            FOREIGN KEY (\`group_id\`) REFERENCES \`groups\`(\`id\`) ON DELETE CASCADE
        `);

        // match_sources (FK → match)
        await queryRunner.query(`
            CREATE TABLE \`match_sources\` (
                \`id\`           INT NOT NULL AUTO_INCREMENT,
                \`side\`         ENUM('home','away') NOT NULL,
                \`source_type\`  ENUM('team','group_rank','match_winner') NOT NULL,
                \`source_value\` VARCHAR(255) NOT NULL,
                \`created_at\`   DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updated_at\`   DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                \`match_id\`     INT NULL,
                PRIMARY KEY (\`id\`)
            ) ENGINE=InnoDB
        `);
        await queryRunner.query(`
            ALTER TABLE \`match_sources\`
            ADD CONSTRAINT \`FK_match_sources_match\`
            FOREIGN KEY (\`match_id\`) REFERENCES \`match\`(\`id\`) ON DELETE CASCADE
        `);

        // bracket (FK → tournament, format_stages)
        await queryRunner.query(`
            CREATE TABLE \`bracket\` (
                \`id\`            INT NOT NULL AUTO_INCREMENT,
                \`structureData\` JSON NULL,
                \`type\`          VARCHAR(255) NOT NULL DEFAULT 'single_elimination',
                \`tournamentId\`  INT NULL,
                \`stage_id\`      BIGINT NULL,
                PRIMARY KEY (\`id\`)
            ) ENGINE=InnoDB
        `);
        await queryRunner.query(`
            ALTER TABLE \`bracket\`
            ADD UNIQUE INDEX \`REL_bracket_tournament\` (\`tournamentId\`)
        `);
        await queryRunner.query(`
            ALTER TABLE \`bracket\`
            ADD CONSTRAINT \`FK_bracket_tournament\`
            FOREIGN KEY (\`tournamentId\`) REFERENCES \`tournament\`(\`id\`) ON DELETE CASCADE
        `);
        await queryRunner.query(`
            ALTER TABLE \`bracket\`
            ADD CONSTRAINT \`FK_bracket_stage\`
            FOREIGN KEY (\`stage_id\`) REFERENCES \`format_stages\`(\`id\`) ON DELETE CASCADE
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // ──────────────────────────────────────────────
        // Reverse: drop int tables, restore uuid tables
        // ──────────────────────────────────────────────
        await queryRunner.query(`DROP TABLE IF EXISTS \`match_sources\``);
        await queryRunner.query(`DROP TABLE IF EXISTS \`bracket\``);
        await queryRunner.query(`DROP TABLE IF EXISTS \`match\``);
        await queryRunner.query(`DROP TABLE IF EXISTS \`group_teams\``);
        await queryRunner.query(`DROP TABLE IF EXISTS \`groups\``);
        await queryRunner.query(`DROP TABLE IF EXISTS \`tournament_team\``);
        await queryRunner.query(`DROP TABLE IF EXISTS \`team_member\``);
        await queryRunner.query(`DROP TABLE IF EXISTS \`organizer\``);

        // Undo tournament_formats FK change
        await queryRunner.query(`ALTER TABLE \`tournament_formats\` DROP FOREIGN KEY \`FK_tournament_formats_tournament\``);
        await queryRunner.query(`DROP INDEX \`REL_tournament_formats_tournament\` ON \`tournament_formats\``);
        await queryRunner.query(`ALTER TABLE \`tournament_formats\` DROP COLUMN \`tournament_id\``);
        await queryRunner.query(`ALTER TABLE \`tournament_formats\` ADD COLUMN \`tournament_id\` VARCHAR(36) NULL`);
        await queryRunner.query(`ALTER TABLE \`tournament_formats\` ADD UNIQUE INDEX \`REL_3dd7c6e89c59e847a559aa620b\` (\`tournament_id\`)`);

        await queryRunner.query(`DROP TABLE IF EXISTS \`team\``);
        await queryRunner.query(`DROP TABLE IF EXISTS \`tournament\``);

        // Recreate uuid-based tournament
        await queryRunner.query(`
            CREATE TABLE \`tournament\` (
                \`id\`              VARCHAR(36) NOT NULL,
                \`name\`            VARCHAR(255) NOT NULL,
                \`description\`     TEXT NULL,
                \`startDate\`       DATETIME NOT NULL,
                \`endDate\`         DATETIME NOT NULL,
                \`status\`          ENUM('draft','registration_open','in_progress','completed') NOT NULL DEFAULT 'draft',
                \`maxTeams\`        INT NOT NULL DEFAULT 16,
                \`participantType\` VARCHAR(255) NULL,
                \`minTeams\`        INT NULL,
                \`regOpenDate\`     DATETIME NULL,
                \`regCloseDate\`    DATETIME NULL,
                \`approvalRequired\` TINYINT NOT NULL DEFAULT 0,
                \`regFee\`          DECIMAL(10,2) NOT NULL DEFAULT '0.00',
                \`playerLimit\`     INT NULL,
                \`squadSize\`       INT NULL,
                \`shortName\`       VARCHAR(255) NULL,
                \`type\`            VARCHAR(255) NULL,
                \`visibility\`      VARCHAR(255) NULL,
                \`logo\`            LONGTEXT NULL,
                \`coverImage\`      LONGTEXT NULL,
                \`sponsors\`        VARCHAR(255) NULL,
                \`createdAt\`       DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updatedAt\`       DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                PRIMARY KEY (\`id\`)
            ) ENGINE=InnoDB
        `);
        await queryRunner.query(`ALTER TABLE \`tournament_formats\` ADD CONSTRAINT \`FK_3dd7c6e89c59e847a559aa620bc\` FOREIGN KEY (\`tournament_id\`) REFERENCES \`tournament\`(\`id\`) ON DELETE CASCADE`);

        // Recreate uuid-based team
        await queryRunner.query(`
            CREATE TABLE \`team\` (
                \`id\`           VARCHAR(36) NOT NULL,
                \`name\`         VARCHAR(255) NOT NULL,
                \`shortName\`    VARCHAR(255) NULL,
                \`logoUrl\`      LONGTEXT NULL,
                \`teamType\`     ENUM('Club','School','College','Corporate','Academy') NULL,
                \`city\`         VARCHAR(255) NULL,
                \`state\`        VARCHAR(255) NULL,
                \`country\`      VARCHAR(255) NULL,
                \`foundedYear\`  INT NULL,
                \`homeGround\`   VARCHAR(255) NULL,
                \`description\`  TEXT NULL,
                \`captainName\`  VARCHAR(255) NULL,
                \`contactEmail\` VARCHAR(255) NULL,
                \`createdAt\`    DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updatedAt\`    DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                PRIMARY KEY (\`id\`)
            ) ENGINE=InnoDB
        `);

        await queryRunner.query(`
            CREATE TABLE \`organizer\` (
                \`id\`            VARCHAR(36) NOT NULL,
                \`name\`          VARCHAR(255) NULL,
                \`email\`         VARCHAR(255) NULL,
                \`phone\`         VARCHAR(255) NULL,
                \`website\`       VARCHAR(255) NULL,
                \`createdAt\`     DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updatedAt\`     DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                \`tournamentId\`  VARCHAR(36) NULL,
                PRIMARY KEY (\`id\`)
            ) ENGINE=InnoDB
        `);
        await queryRunner.query(`ALTER TABLE \`organizer\` ADD CONSTRAINT \`FK_95b76af812bcd51f0e180126ed1\` FOREIGN KEY (\`tournamentId\`) REFERENCES \`tournament\`(\`id\`) ON DELETE CASCADE`);

        await queryRunner.query(`
            CREATE TABLE \`team_member\` (
                \`id\`           VARCHAR(36) NOT NULL,
                \`name\`         VARCHAR(255) NOT NULL,
                \`role\`         ENUM('player','captain','coach','manager') NOT NULL DEFAULT 'player',
                \`position\`     VARCHAR(255) NULL,
                \`jerseyNumber\` INT NULL,
                \`createdAt\`    DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updatedAt\`    DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                \`teamId\`       VARCHAR(36) NULL,
                PRIMARY KEY (\`id\`)
            ) ENGINE=InnoDB
        `);
        await queryRunner.query(`ALTER TABLE \`team_member\` ADD CONSTRAINT \`FK_74da8f612921485e1005dc8e225\` FOREIGN KEY (\`teamId\`) REFERENCES \`team\`(\`id\`) ON DELETE CASCADE`);

        await queryRunner.query(`
            CREATE TABLE \`tournament_team\` (
                \`id\`            VARCHAR(36) NOT NULL,
                \`status\`        ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
                \`paymentStatus\` ENUM('pending','paid') NOT NULL DEFAULT 'pending',
                \`createdAt\`     DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updatedAt\`     DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                \`tournamentId\`  VARCHAR(36) NULL,
                \`teamId\`        VARCHAR(36) NULL,
                PRIMARY KEY (\`id\`)
            ) ENGINE=InnoDB
        `);
        await queryRunner.query(`ALTER TABLE \`tournament_team\` ADD CONSTRAINT \`FK_a57753f0e48a8681c0b2163ed12\` FOREIGN KEY (\`tournamentId\`) REFERENCES \`tournament\`(\`id\`) ON DELETE CASCADE`);
        await queryRunner.query(`ALTER TABLE \`tournament_team\` ADD CONSTRAINT \`FK_e7ea12e2d49a7f5e6e1481429a1\` FOREIGN KEY (\`teamId\`) REFERENCES \`team\`(\`id\`) ON DELETE CASCADE`);
    }
}
