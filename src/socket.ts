import { Server } from "socket.io";
import { Server as HttpServer } from "http";

let io: Server;

export const initSocket = (server: HttpServer) => {
    const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:4200")
        .split(",")
        .map(o => o.trim())
        .filter(Boolean);

    io = new Server(server, {
        cors: {
            origin: allowedOrigins,
            methods: ["GET", "POST"]
        }
    });

    io.on("connection", (socket: any) => {
        console.log("A user connected:", socket.id);

        socket.on("disconnect", () => {
            console.log("User disconnected:", socket.id);
        });
    });

    return io;
};

export const getIO = () => {
    if (!io) {
        throw new Error("Socket.IO not initialized!");
    }
    return io;
};

export const emitMatchUpdate = (matchId: number | string, data: any) => {
    if (io) {
        io.emit(`match_update_${matchId}`, data);
        // Also emit a general update for those watching all matches
        io.emit("match_update", { matchId, ...data });
    }
};
