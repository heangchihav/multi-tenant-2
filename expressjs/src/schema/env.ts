import { z } from 'zod';

// Environment variable validation schema
export const envSchema = z.object({
    // Application Settings
    NODE_ENV: z.enum(['development', 'production', 'test'], {
        required_error: "NODE_ENV is required. Must be one of: 'development', 'production', 'test'",
    }),
    SERVER_PORT: z.string().regex(/^\d+$/, {
        message: "SERVER_PORT must be a valid port number"
    }).transform(val => parseInt(val, 10)),
    HOST: z.string().min(1, {
        message: "HOST is required"
    }),

    // Database Configuration
    // DB_PASSWORD: z.string().min(1, {
    //     message: "DB_PASSWORD is required"
    // }),
    // DB_NAME: z.string().min(1, {
    //     message: "DB_NAME is required"
    // }),
    // DATABASE_URL: z.string().url({
    //     message: "DATABASE_URL must be a valid URL"
    // }),

    // Authentication Secrets
    ACCESS_TOKEN_SECRET: z.string().min(32, {
        message: "ACCESS_TOKEN_SECRET must be at least 32 characters long"
    }),
    REFRESH_TOKEN_SECRET: z.string().min(32, {
        message: "REFRESH_TOKEN_SECRET must be at least 32 characters long"
    }),
    SESSION_SECRET: z.string().min(32, {
        message: "SESSION_SECRET must be at least 32 characters long"
    }),

    // Google OAuth
    GOOGLE_CLIENT_ID: z.string().min(1, {
        message: "GOOGLE_CLIENT_ID is required"
    }),
    GOOGLE_CLIENT_SECRET: z.string().min(1, {
        message: "GOOGLE_CLIENT_SECRET is required"
    }),
    CALLBACK_URL: z.string().url().optional(),

    // CORS Settings
    CORS_ORIGINS: z.string().default('*'),
    ALLOWED_METHODS: z.string().default('GET,HEAD,PUT,PATCH,POST,DELETE'),

    // Rate Limiting
    RATE_LIMIT_WINDOW_MS: z.string().regex(/^\d+$/, {
        message: "RATE_LIMIT_WINDOW_MS must be a valid number"
    }).transform(val => parseInt(val, 10)).default('900000'),
    RATE_LIMIT_MAX: z.string().regex(/^\d+$/, {
        message: "RATE_LIMIT_MAX must be a valid number"
    }).transform(val => parseInt(val, 10)).default('100'),

    // CSRF Protection
    CSRF_SECRET: z.string().min(32, {
        message: "CSRF_SECRET must be at least 32 characters long"
    }).optional()
});

// Type inference for environment variables
export type EnvConfig = z.infer<typeof envSchema>;