import { adminMiddleware as admin } from '@/middlewares/auth/admin';
import { allowDeviceMiddleware as allowDevice } from '@/middlewares/auth/allowDevice';
import { authMiddleware as auth } from '@/middlewares/auth/auth';
import { sessionMiddleware as session } from '@/middlewares/auth/session';
import { MiddlewareFunction } from '@/types/middleware';

export const adminMiddleware: MiddlewareFunction = admin;
export const allowDeviceMiddleware: MiddlewareFunction = allowDevice;
export const authMiddleware: MiddlewareFunction = auth;
export const sessionMiddleware: MiddlewareFunction = session;