import "reflect-metadata";
import express from "express";
import cors from "cors";
import path from "path";
import healthRoutes from "./modules/health/health.routes";
import authRoutes from "./modules/auth/auth.routes";
import settingsRoutes from "./modules/settings/settings.routes";
import tournamentRoutes from "./modules/tournaments/tournament.routes";
import { teamRoutes } from "./modules/teams/team.routes";
import matchRoutes from "./modules/matches/match.routes";
import publicRoutes from "./modules/public/public.routes";
import dashboardRoutes from "./modules/dashboard/dashboard.routes";

const app = express();

app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));



// Routes
app.use("/api/health", healthRoutes);
app.use("/auth", authRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/tournaments", tournamentRoutes);
app.use("/api/teams", teamRoutes);
app.use("/api/matches", matchRoutes);
app.use("/api/public", publicRoutes);
app.use("/api/dashboard", dashboardRoutes);

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("Unhandled Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
});

export default app;
// trigger nodemon restart
