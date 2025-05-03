import cors from 'cors';
import { RequestHandler } from 'express';
import { secret } from '@/config/secret';

const allowedOrigins = secret.corsOrigins;
const allowedMethods = secret.allowedMethods;

export const corsOptions: cors.CorsOptions = {
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: allowedMethods,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-API-Key'],
    credentials: true,
    maxAge: 86400, // 24 hours
    optionsSuccessStatus: 200
};

export const corsMiddleware: RequestHandler = cors(corsOptions);
