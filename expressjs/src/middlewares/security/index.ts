import { corsMiddleware as cors } from '@/middlewares/security/cors';
import { csrfMiddleware as csrf } from '@/middlewares/security/csrf';
import { customSecurityMiddleware as customSecurity } from '@/middlewares/security/customSecurity';
import { helmetSecurityMiddleware as helmet } from '@/middlewares/security/helmet';
import { sqlInjectionCheckMiddleware as sqlInjectionCheck } from '@/middlewares/security/sqlInjectionCheck';
import { MiddlewareFunction } from '@/types/middleware';
import { rateLimiterMiddleware as rateLimiter } from '@/middlewares/security/rateLimiter';

export const corsMiddleware: MiddlewareFunction = cors;
export const csrfMiddleware: MiddlewareFunction = csrf;
export const customSecurityMiddleware: MiddlewareFunction = customSecurity;
export const helmetSecurityMiddleware: MiddlewareFunction = helmet;
export const sqlInjectionCheckMiddleware: MiddlewareFunction = sqlInjectionCheck;
export const rateLimiterMiddleware: MiddlewareFunction = rateLimiter;