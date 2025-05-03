import { Request, Response, NextFunction, RequestHandler } from 'express';
import Logger from '@/config/logger';

export const sqlInjectionCheckMiddleware: RequestHandler = (req: Request, res: Response, next: NextFunction): void => {
    const sqlInjectionPatterns = [
        /(\%27)|(\')|(\-\-)|(\%23)|(#)/i,
        /((\%3D)|(=))[^\n]*((\%27)|(\')|(\-\-)|(\%3B)|(;))/i,
        /\w*((\%27)|(\'))((\%6F)|o|(\%4F))((\%72)|r|(\%52))/i,
        /exec(\s|\+)+(s|x)p\w+/i,
        /UNION([^a-zA-Z0-9])+SELECT/i
    ];

    const checkForSQLInjection = (value: string): boolean => {
        return sqlInjectionPatterns.some(pattern => pattern.test(value));
    };

    try {
        // Check URL parameters
        const queryString = req.url.split('?')[1];
        if (queryString && checkForSQLInjection(queryString)) {
            Logger.warn('SQL Injection attempt detected in query string:', {
                ip: req.ip,
                path: req.path,
                query: queryString
            });
            res.status(400).json({ error: 'Invalid request parameters' });
            return;
        }

        // Check request body
        if (req.body && typeof req.body === 'object') {
            const bodyStr = JSON.stringify(req.body);
            if (checkForSQLInjection(bodyStr)) {
                Logger.warn('SQL Injection attempt detected in request body:', {
                    ip: req.ip,
                    path: req.path,
                    body: req.body
                });
                res.status(400).json({ error: 'Invalid request data' });
                return;
            }
        }

        next();
    } catch (error) {
        Logger.error('Error in SQL injection check middleware:', error);
        next(error);
    }
};