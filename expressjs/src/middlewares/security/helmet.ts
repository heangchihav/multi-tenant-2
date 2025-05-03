import helmet from 'helmet';
import { RequestHandler } from 'express';
import { secret } from '@/config/secret';
import { HelmetOptions } from 'helmet';

// Helmet configuration
const helmetConfig: HelmetOptions = {
    contentSecurityPolicy: {
        useDefaults: true,
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
        }
    },
    crossOriginEmbedderPolicy: true,
    crossOriginOpenerPolicy: true,
    crossOriginResourcePolicy: {
        policy: "cross-origin"
    },
    dnsPrefetchControl: true,
    frameguard: {
        action: "deny"
    },
    hidePoweredBy: true,
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    },
    ieNoOpen: true,
    noSniff: true,
    originAgentCluster: true,
    permittedCrossDomainPolicies: true,
    referrerPolicy: {
        policy: ["strict-origin-when-cross-origin"]
    },
    xssFilter: true
};

export const helmetSecurityMiddleware: RequestHandler = helmet(helmetConfig);
