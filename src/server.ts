import { AppDataSource } from "./config/data-source";
import app from "./app";
import * as dotenv from "dotenv";

dotenv.config();

const PORT = process.env.PORT || 3000;

AppDataSource.initialize()
    .then(() => {
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
    })
    .catch((err) => {
        console.error("CRITICAL ERROR: Data Source initialization failed!");
        console.error(err);
        console.log("\nTIP: Please check your .env file and ensure MySQL is running.");
    });
