import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { createClient } from 'redis';
import Logger from '@/config/logger';
import { secret } from '@/config/secret';

// Create Redis client
const redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://redis_service:6379'
});

redisClient.on('error', (err) => Logger.error('Redis Client Error', err));
redisClient.on('connect', () => Logger.info('Redis Client Connected'));

// Connect to Redis
redisClient.connect().catch((err) => {
    Logger.error('Redis connection error:', err);
});

export const rateLimiterMiddleware = rateLimit({
    windowMs: Number(secret.rateLimitWindowMs) || 15 * 60 * 1000,
    max: Number(secret.rateLimitMax) || 100,
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisStore({
        sendCommand: (...args: string[]) => redisClient.sendCommand(args),
    }),
    handler: (req, res) => {
        Logger.warn('Rate limit exceeded:', {
            ip: req.ip,
            path: req.path
        });
        res.status(429).json({
            error: 'Too many requests',
            message: 'Please try again later'
        });
    },
    skip: (req) => req.path === '/healthcheck',
    message: {
        status: 'error',
        code: 'TOO_MANY_REQUESTS',
        message: 'Too many requests, please try again later.'
    },
});

