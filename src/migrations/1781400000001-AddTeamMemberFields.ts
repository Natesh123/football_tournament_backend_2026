import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTeamMemberFields1781400000001 implements MigrationInterface {
    name = 'AddTeamMemberFields1781400000001';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Allow the vice_captain role
        await queryRunner.query(
            `ALTER TABLE \`team_member\` MODIFY \`role\` ENUM('player','captain','vice_captain','coach','manager') NOT NULL DEFAULT 'player'`
        );
        await queryRunner.query(
            `ALTER TABLE \`team_member\` ADD \`status\` ENUM('active','injured','suspended') NOT NULL DEFAULT 'active'`
        );
        await queryRunner.query(`ALTER TABLE \`team_member\` ADD \`dob\` date NULL`);
        await queryRunner.query(
            `ALTER TABLE \`team_member\` ADD \`preferredFoot\` ENUM('right','left','both') NULL`
        );
        await queryRunner.query(`ALTER TABLE \`team_member\` ADD \`photoUrl\` varchar(255) NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`team_member\` DROP COLUMN \`photoUrl\``);
        await queryRunner.query(`ALTER TABLE \`team_member\` DROP COLUMN \`preferredFoot\``);
        await queryRunner.query(`ALTER TABLE \`team_member\` DROP COLUMN \`dob\``);
        await queryRunner.query(`ALTER TABLE \`team_member\` DROP COLUMN \`status\``);
        await queryRunner.query(
            `ALTER TABLE \`team_member\` MODIFY \`role\` ENUM('player','captain','coach','manager') NOT NULL DEFAULT 'player'`
        );
    }
}
