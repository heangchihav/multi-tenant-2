import { Router } from 'express';
import { logout } from '@/api/v1/controllers/auth/logout';
import { asyncErrorHandler } from '@/middlewares/error/ErrorMiddleware';

const logoutRoutes: Router = Router();

logoutRoutes.get('/logout', asyncErrorHandler(logout));

export default logoutRoutes;