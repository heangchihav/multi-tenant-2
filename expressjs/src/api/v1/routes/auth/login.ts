import { Router } from 'express'
import { login } from '@/api/v1/controllers/auth/login'
import { asyncErrorHandler } from '@/middlewares/error/ErrorMiddleware';
const loginRoutes: Router = Router();

loginRoutes.post('/login', asyncErrorHandler(login));

export default loginRoutes;