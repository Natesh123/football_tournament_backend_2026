import { DataSource } from "typeorm";
import * as dotenv from "dotenv";
import { User } from "../entities/user.entity";
import { UserOtp } from "../entities/otp.entity";
import { UserRole } from "../entities/role.entity";
import { Permission } from "../entities/permission.entity";

dotenv.config();

export const AppDataSource = new DataSource({
    type: "mysql",
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "3306"),
    username: process.env.DB_USERNAME || "root",
    password: process.env.DB_PASSWORD ?? "password",
    database: process.env.DB_DATABASE || "football_tournament",
    synchronize: true, // Auto-create tables (dev only)
    logging: false,
    entities: [User, UserOtp, UserRole, Permission], // Direct imports for stability
    migrations: ["src/migrations/*.ts"],
    subscribers: [],
});
