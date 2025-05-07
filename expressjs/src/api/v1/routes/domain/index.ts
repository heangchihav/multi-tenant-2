import { Router } from 'express'
import { asyncErrorHandler } from '@/middlewares/error/ErrorMiddleware';
import { addDomain } from '@/api/v1/controllers/domain/addDomain';

const domainRoutes: Router = Router();

domainRoutes.post('/addDomain', asyncErrorHandler(addDomain));

export default domainRoutes;