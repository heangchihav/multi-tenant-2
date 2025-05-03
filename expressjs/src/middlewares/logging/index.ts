import { logRequest } from '@/middlewares/logging/logRequest';
import { morganMiddleware as morgan } from '@/middlewares/logging/morgan';
import { MiddlewareFunction } from '@/types/middleware';

export const logRequestMiddleware: MiddlewareFunction = logRequest;
export const morganMiddleware: MiddlewareFunction = morgan;
