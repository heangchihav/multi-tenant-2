import { Router } from 'express';
import merchantSetupRoutes from './merchantSetup';
import websiteSetupRoutes from './websiteSetup';
import domainManagementRoutes from '../domain/domainManagement';

const clientRoutes: Router = Router();

// Mount the merchant setup routes
clientRoutes.use('/merchant', merchantSetupRoutes);

// Mount the website setup routes
clientRoutes.use('/website', websiteSetupRoutes);

// Mount the domain management routes
clientRoutes.use('/domain', domainManagementRoutes);

export default clientRoutes;
