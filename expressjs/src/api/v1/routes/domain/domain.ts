import { Router } from 'express'
import { asyncErrorHandler } from '@/middlewares/error/ErrorMiddleware';
import { addDomain } from '@/api/v1/controllers/domain/domainRoutes';

const addDomainRoutes: Router = Router();

addDomainRoutes.post('/addDomain', asyncErrorHandler(addDomain));

export default addDomainRoutes;