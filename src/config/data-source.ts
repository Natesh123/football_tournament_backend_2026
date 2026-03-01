import { DataSource } from "typeorm";
import * as dotenv from "dotenv";
import { User } from "../entities/user.entity";
import { UserOtp } from "../entities/otp.entity";
import { UserRole } from "../entities/role.entity";
import { Permission } from "../entities/permission.entity";
import { Tournament } from "../modules/tournaments/tournament.entity";
import { Team } from "../modules/teams/team.entity";
import { TeamMember } from "../modules/teams/team-member.entity";
import { Organizer } from "../modules/tournaments/organizer.entity";
import { TournamentTeam } from "../modules/tournaments/tournament-team.entity";


dotenv.config();

export const AppDataSource = new DataSource({
    type: "mysql",
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "3306"),
    username: process.env.DB_USERNAME || "root",
    password: process.env.DB_PASSWORD ?? "password",
    database: process.env.DB_DATABASE || "football_tournament",
    synchronize: false, // Auto-create tables disabled to prevent crash on JSON vs LONGTEXT drift
    logging: false,
    entities: [User, UserOtp, UserRole, Permission, Tournament, Team, TeamMember, Organizer, TournamentTeam], // Direct imports for stability
    migrations: ["src/migrations/*.ts"],
    subscribers: [],
});
