import { Router } from 'express'
import { asyncErrorHandler } from '@/middlewares/error/ErrorMiddleware';
import { addTemplate } from '../../controllers/templates/addTemplates';

const templatesRoutes: Router = Router();

// Route to add a new template
templatesRoutes.post('/addTemplate', asyncErrorHandler(addTemplate));

export default templatesRoutes;