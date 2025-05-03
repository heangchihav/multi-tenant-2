import { PrismaClient } from '@prisma/client';

const MAX_RETRIES = 10; // Maximum number of retries
const RETRY_DELAY = 3000; // 3 seconds delay between retries

const prisma = new PrismaClient({
    log: ["query", "info", "warn", "error"], // ✅ Improved logging
});

/**
 * Attempts to connect to the database with retries if the database isn't ready.
 */
async function connectWithRetry(retries = 0): Promise<void> {
    try {
        console.log("⏳ Attempting to connect to the database...");
        await prisma.$connect();
        console.log("✅ Connected to the database!");
    } catch (error) {
        const e = error as Error;
        console.error(`⚠️ Database connection failed (${retries + 1}/${MAX_RETRIES}):`, e.message);

        if (retries < MAX_RETRIES) {
            console.log(`🔄 Retrying in ${RETRY_DELAY / 1000} seconds...`);
            await new Promise((res) => setTimeout(res, RETRY_DELAY));
            return connectWithRetry(retries + 1);
        } else {
            console.error("❌ Database connection failed after multiple attempts. Exiting...");
            process.exit(1);
        }
    }
}

// Automatically connect on startup
connectWithRetry();

export default prisma;
