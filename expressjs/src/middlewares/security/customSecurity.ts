import { NextFunction, Request, Response, RequestHandler } from 'express';
import Logger from '@/config/logger';

export const customSecurityMiddleware: RequestHandler = (req: Request, res: Response, next: NextFunction): void => {
    try {
        // Block requests with suspicious query strings
        const suspiciousPatterns = [/\.\./g, /;/g, /--/g, /<script>/gi];
        const queryString = req.url.split('?')[1];

        if (queryString && suspiciousPatterns.some(pattern => pattern.test(queryString))) {
            Logger.warn('Suspicious query string detected:', {
                ip: req.ip,
                path: req.path,
                query: queryString
            });
            res.status(400).json({ error: 'Invalid request parameters' });
            return;
        }

        // Add security headers if not already set
        if (!res.getHeader('X-Content-Type-Options')) {
            res.setHeader('X-Content-Type-Options', 'nosniff');
        }
        if (!res.getHeader('X-Frame-Options')) {
            res.setHeader('X-Frame-Options', 'DENY');
        }
        if (!res.getHeader('X-XSS-Protection')) {
            res.setHeader('X-XSS-Protection', '1; mode=block');
        }
        if (!res.getHeader('Strict-Transport-Security')) {
            res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
        }
        if (!res.getHeader('Permissions-Policy')) {
            res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
        }

        // Remove potentially dangerous headers
        if (res.getHeader('X-Powered-By')) {
            res.removeHeader('X-Powered-By');
        }
        if (res.getHeader('Server')) {
            res.removeHeader('Server');
        }

        next();
    } catch (error) {
        Logger.error('Security middleware error:', error);
        next(error);
    }
};