import morgan from 'morgan';
import Logger from '@/config/logger';

// Create a custom format that includes additional information
const morganFormat = ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"';

// Create the morgan middleware
export const morganMiddleware = morgan(morganFormat, {
    stream: {
        write: (message: string) => {
            // Remove the newline character that morgan adds
            const logMessage = message.trim();

            // Log using our Winston logger
            Logger.info('HTTP Access Log:', {
                raw: logMessage,
                timestamp: new Date().toISOString()
            });
        }
    },
    // Skip logging for health check endpoints
    skip: (req) => {
        return req.url === '/health' || req.url === '/healthcheck';
    }
});
