import { Router } from 'express'
import { asyncErrorHandler } from '@/middlewares/error/ErrorMiddleware';
import { addDomain } from '@/api/v1/controllers/domain/addDomain';
import { listDomains } from '@/api/v1/controllers/domain/listDomains';

const domainRoutes: Router = Router();

// Route to add a new domain
domainRoutes.post('/addDomain', asyncErrorHandler(addDomain));

// Route to list all domains for the current merchant
domainRoutes.get('/list', asyncErrorHandler(listDomains));

export default domainRoutes;