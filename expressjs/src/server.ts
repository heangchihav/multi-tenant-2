import http from "http";
import { Server } from "socket.io";
import Logger from "@/config/logger";
import app from "@/app";
import prisma from "@/libs/prisma";
import { secret } from "@/config/secret";
import 'module-alias/register';

const port = secret.serverPort || 3000;
const host = secret.host || 'localhost';

async function startServer() {
    try {
        // Test database connection
        await prisma.$connect();
        Logger.info('Database connection established');

        const httpServer = http.createServer(app);

        // Configure Socket.IO
        const io = new Server(httpServer, {
            cors: {
                origin: secret.corsOrigins,
                methods: ["GET", "POST"],
                credentials: true
            },
        });

        // Socket.IO event handlers
        io.on("connection", (socket) => {
            Logger.info(`Client connected: ${socket.id}`);

            socket.on("message", (data) => {
                Logger.debug("Message received:", data);
                socket.emit("message", data);
            });

            socket.on("disconnect", () => {
                Logger.info(`Client disconnected: ${socket.id}`);
            });
        });

        // Start the server
        httpServer.listen(port, () => {
            Logger.info(`🚀 Server running at http://${host}:${port} in ${secret.nodeEnv} mode`);
            Logger.info('Press CTRL-C to stop');
        });

        // Handle shutdown
        process.on('SIGTERM', () => {
            Logger.info('SIGTERM received. Shutting down gracefully...');
            httpServer.close(async () => {
                await prisma.$disconnect();
                Logger.info('Server closed');
                process.exit(0);
            });
        });
    } catch (error) {
        Logger.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();
