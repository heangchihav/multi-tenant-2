import { Router } from 'express'
import { signup } from '@/api/v1/controllers/auth/signup'
import { asyncErrorHandler } from '@/middlewares/error/ErrorMiddleware';
const signupRoutes: Router = Router();

signupRoutes.post('/signup', asyncErrorHandler(signup));


export default signupRoutes;