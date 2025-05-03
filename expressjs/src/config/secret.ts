import dotenv from 'dotenv';
import { envSchema } from '@/schema/env';

// Load .env file
dotenv.config();

// Validate environment variables
function validateEnv() {
    const result = envSchema.safeParse(process.env);
    if (!result.success) {
        console.error('❌ Invalid environment variables:');
        console.error(JSON.stringify(result.error.format(), null, 2));
        throw new Error('Invalid environment variables');
    }
    return result.data;
}

// Get validated env variables
const env = validateEnv();

// System configuration with transformations
export const secret = {
    // Application Settings
    nodeEnv: env.NODE_ENV,
    serverPort: env.SERVER_PORT,
    host: env.HOST || '0.0.0.0',

    // Database Configuration
    // dbPassword: env.DB_PASSWORD,
    // dbName: env.DB_NAME,
    // databaseUrl: env.DATABASE_URL,

    // Authentication
    accessTokenSecret: env.ACCESS_TOKEN_SECRET,
    refreshTokenSecret: env.REFRESH_TOKEN_SECRET,
    sessionSecret: env.SESSION_SECRET,

    // Google OAuth
    googleClientId: env.GOOGLE_CLIENT_ID,
    googleClientSecret: env.GOOGLE_CLIENT_SECRET,
    callbackUrl: env.CALLBACK_URL || `http://${env.HOST}:${env.SERVER_PORT}/api/auth/google/callback`,

    // CORS Settings
    corsOrigins: env.CORS_ORIGINS.split(',').map(origin => origin.trim()).filter(Boolean),
    allowedMethods: env.ALLOWED_METHODS.split(',').map(method => method.trim()).filter(Boolean),

    // Rate Limiting
    rateLimitWindowMs: env.RATE_LIMIT_WINDOW_MS,
    rateLimitMax: env.RATE_LIMIT_MAX,

    // CSRF Protection
    csrfSecret: env.CSRF_SECRET
} as const;
