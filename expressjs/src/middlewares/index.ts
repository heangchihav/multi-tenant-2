import { Express } from 'express';
import cookieParser from 'cookie-parser';
import { logRequestMiddleware, morganMiddleware } from '@/middlewares/logging';
import { errorHandlerMiddleware, notFoundHandlerMiddleware } from '@/middlewares/error';
import { compressionMiddleware } from '@/middlewares/performance';
import { sessionMiddleware, authMiddleware } from '@/middlewares/auth';
import { corsMiddleware, helmetSecurityMiddleware, csrfMiddleware, rateLimiterMiddleware, customSecurityMiddleware, sqlInjectionCheckMiddleware } from './security';
import passport from 'passport';

export const configurePerformanceMiddlewares = (app: Express): void => {
    if (compressionMiddleware) app.use(compressionMiddleware);
}

export const configureBasicMiddlewares = (app: Express): void => {
    // Basic middleware setup
    if (cookieParser) app.use(cookieParser());
    if (corsMiddleware) app.use(corsMiddleware);
    // Session middleware
    if (sessionMiddleware) app.use(sessionMiddleware);
};

export const configureLoggingMiddlewares = (app: Express): void => {
    if (morganMiddleware) app.use(morganMiddleware);
    if (logRequestMiddleware) app.use(logRequestMiddleware);

};

export const configureSecurityMiddlewares = (app: Express): void => {
    if (customSecurityMiddleware) app.use(customSecurityMiddleware);
    if (helmetSecurityMiddleware) app.use(helmetSecurityMiddleware);
    if (rateLimiterMiddleware) app.use(rateLimiterMiddleware);
    if (sqlInjectionCheckMiddleware) app.use(sqlInjectionCheckMiddleware);
    if (csrfMiddleware) app.use(csrfMiddleware);
};

export const configureAuthMiddlewares = (app: Express): void => {
    // Initialize Passport
    app.use(passport.initialize());
    app.use(passport.session());

    // Auth middleware
    if (authMiddleware) app.use(authMiddleware);
};

export const configureErrorHandling = (app: Express): void => {
    // Handle 404
    if (notFoundHandlerMiddleware) app.use(notFoundHandlerMiddleware);

    // Global error handler
    if (errorHandlerMiddleware) app.use(errorHandlerMiddleware);
};
