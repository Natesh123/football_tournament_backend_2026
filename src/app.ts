import "reflect-metadata";
import express from "express";
import cors from "cors";
import healthRoutes from "./modules/health/health.routes";
import authRoutes from "./modules/auth/auth.routes";

const app = express();

app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json());

// Routes
app.use("/api/health", healthRoutes);
app.use("/auth", authRoutes);

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("Unhandled Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
});

export default app;
