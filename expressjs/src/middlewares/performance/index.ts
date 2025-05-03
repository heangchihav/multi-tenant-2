import { compressionMiddleware as compression } from '@/middlewares/performance/compression';
import { MiddlewareFunction } from '@/types/middleware';

export const compressionMiddleware: MiddlewareFunction = compression;