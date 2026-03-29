import { AppDataSource } from "./config/data-source";
import app from "./app";
import * as dotenv from "dotenv";

dotenv.config();

const PORT = process.env.PORT || 3000;
const MAX_RETRIES = 10;
const RETRY_INTERVAL = 5000; // 5 seconds

async function startServer(retries = 0) {
    try {
        await AppDataSource.initialize();
        console.log("Data Source has been initialized!");

        const server = app.listen(Number(PORT), "0.0.0.0", () => {
            console.log(`Server is running on http://localhost:${PORT}`);
            console.log("Press Ctrl+C to stop the server");
        });

        server.on("error", (err: any) => {
            if (err.code === "EADDRINUSE") {
                console.error(`Error: Port ${PORT} is already in use.`);
            } else {
                console.error("Server Error:", err);
            }
        });

    } catch (err) {
        console.error(`CRITICAL ERROR: Data Source initialization failed! (Attempt ${retries + 1}/${MAX_RETRIES})`);
        console.error(err);

        if (retries < MAX_RETRIES) {
            console.log(`Retrying in ${RETRY_INTERVAL / 1000} seconds...`);
            setTimeout(() => startServer(retries + 1), RETRY_INTERVAL);
        } else {
            console.error("Failed to connect to the database after maximum retries. Please check your MySQL service.");
        }
    }
}

startServer();

