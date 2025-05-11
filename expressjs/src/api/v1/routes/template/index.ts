import { Router } from 'express'
import { asyncErrorHandler } from '@/middlewares/error/ErrorMiddleware';
import { addTemplate } from '../../controllers/templates/addTemplates';
import { getTemplates } from '../../controllers/templates/getTemplates';

const templatesRoutes: Router = Router();

// Route to add a new template
templatesRoutes.post('/addTemplate', asyncErrorHandler(addTemplate));

// Route to get all templates
templatesRoutes.get('/getTemplates', asyncErrorHandler(getTemplates));

export default templatesRoutes;