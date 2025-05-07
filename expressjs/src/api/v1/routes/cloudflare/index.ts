import { Router } from 'express'
import { asyncErrorHandler } from '@/middlewares/error/ErrorMiddleware';
import { addCloudflareAccount } from '@/api/v1/controllers/cloudflare/addCloudflareAccount';

const cloudflareRoutes: Router = Router();

cloudflareRoutes.post('/addcloudflared', asyncErrorHandler(addCloudflareAccount));

export default cloudflareRoutes;