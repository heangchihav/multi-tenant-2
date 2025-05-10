import cors from 'cors';
import { RequestHandler } from 'express';
import { secret } from '@/config/secret';

// Define specific allowed origins instead of using wildcard
// These are the only domains that can access your API
const specificAllowedOrigins = [
    'http://localhost',
    'http://localhost:80',
    'http://127.0.0.1',
    'http://127.0.0.1:80'
];

const allowedMethods = secret.allowedMethods;

export const corsOptions: cors.CorsOptions = {
    origin: (origin, callback) => {
        // For requests from the same server (no origin) - like direct API calls or Postman
        if (!origin) {
            return callback(null, true);
        }
        
        // Check if the request origin is in our allowed list
        if (specificAllowedOrigins.some(allowed => origin.startsWith(allowed))) {
            return callback(null, true);
        }
        
        // Reject all other origins
        callback(new Error('Not allowed by CORS'));
    },
    methods: allowedMethods,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-API-Key'],
    credentials: true,
    maxAge: 86400, // 24 hours
    optionsSuccessStatus: 200
};

export const corsMiddleware: RequestHandler = cors(corsOptions);
