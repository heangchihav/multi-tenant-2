import { Router } from 'express'
import cloudflareRoutes from '@/api/v1/routes/domain/cloudflared';
import addDomainRoutes from '@/api/v1/routes/domain/domain';

const domainRoutes: Router = Router();

domainRoutes.use(cloudflareRoutes);
domainRoutes.use(addDomainRoutes);

export default domainRoutes;