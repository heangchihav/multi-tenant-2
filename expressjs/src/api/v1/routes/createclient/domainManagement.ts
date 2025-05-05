import express, { Request, Response } from 'express';
import fs from 'fs-extra';
import path from 'path';
import axios from 'axios';
import { Router } from 'express';
import { asyncErrorHandler } from '@/middlewares/error/ErrorMiddleware';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const domainManagementRoutes: Router = Router();

// CONFIG
const NGINX_CONF_DIR = '/app/tenant-configs';

interface AddDomainRequestBody {
  websiteId: string;
  domainName: string;
  isPrimary?: boolean;
}

// POST: /api/domain/add
domainManagementRoutes.post('/add',
  asyncErrorHandler(async (req: Request<{}, {}, AddDomainRequestBody>, res: Response) => {
    const { websiteId, domainName, isPrimary = false } = req.body;
    
    try {
      console.log(`Adding domain ${domainName} to website ${websiteId}`);
      
      // 1. Validate website exists and get related merchant info
      const website = await prisma.website.findUnique({
        where: { id: websiteId }
      });
      
      if (!website) {
        console.error(`Website with ID ${websiteId} not found`);
        throw new Error('Website not found');
      }
      
      // Get merchant with Cloudflare accounts
      const merchant = await prisma.merchant.findUnique({
        where: { id: website.merchantId },
        include: { cloudflareAccounts: true }
      });
      
      if (!merchant) {
        console.error(`Merchant with ID ${website.merchantId} not found`);
        throw new Error('Merchant not found');
      }
      
      // Get existing website domains
      const websiteDomains = await prisma.websiteDomain.findMany({
        where: { websiteId },
        include: { domain: true }
      });
      
      console.log(`Found website for merchant: ${merchant.name}`);
      
      // 2. Check if domain already exists
      const existingDomain = await prisma.domain.findFirst({
        where: { name: domainName }
      });
      
      let domain;
      if (existingDomain) {
        console.log(`Domain ${domainName} already exists, using existing record`);
        domain = existingDomain;
      } else {
        // 3. Create new domain
        const cloudflareAccount = merchant.cloudflareAccounts[0];
        
        // Prepare domain data
        const domainData: any = {
          name: domainName,
          ns1: 'ns1.cloudflare.com',
          ns2: 'ns2.cloudflare.com',
          status: 'PENDING',
          addedById: 1, // TODO: Get from auth context
        };
        
        // Only add cloudflareAccountId if it exists
        if (cloudflareAccount?.id) {
          domainData.cloudflareAccountId = cloudflareAccount.id;
        }
        
        domain = await prisma.domain.create({
          data: domainData
        });
        
        console.log(`Created domain ${domain.id} for ${domainName}`);
        
        // 4. Configure Cloudflare if account exists
        if (cloudflareAccount) {
          try {
            await configureTunnelForDomain(domainName, cloudflareAccount, websiteId);
            console.log(`Configured Cloudflare tunnel for domain ${domainName}`);
            
            // Update domain status
            await prisma.domain.update({
              where: { id: domain.id },
              data: { status: 'ACTIVE' }
            });
          } catch (cloudflareError: any) {
            console.error('Error configuring Cloudflare:', cloudflareError);
            // Don't fail the entire process if Cloudflare configuration fails
          }
        }
      }
      
      // 5. Create website domain mapping
      const websiteDomain = await prisma.websiteDomain.create({
        data: {
          websiteId,
          domainId: domain.id,
          isPrimary
        }
      });
      
      console.log(`Created website domain mapping ${websiteDomain.id}`);
      
      // 6. If primary domain is set, ensure other domains are not primary
      if (isPrimary) {
        await prisma.websiteDomain.updateMany({
          where: {
            websiteId,
            id: { not: websiteDomain.id }
          },
          data: {
            isPrimary: false
          }
        });
        
        console.log(`Updated other domains to non-primary for website ${websiteId}`);
      }
      
      // 7. Update Nginx configuration with all domains
      await updateNginxConfig(websiteId);
      
      // 8. Return success response
      res.status(201).json({
        success: true,
        domain,
        websiteDomain
      });
    } catch (error: any) {
      console.error('Error adding domain:', error);
      
      // Return error response
      res.status(500).json({
        success: false,
        error: error.message || 'An error occurred while adding the domain'
      });
    }
  })
);

// DELETE: /api/domain/remove
domainManagementRoutes.delete('/remove',
  asyncErrorHandler(async (req: Request, res: Response) => {
    const { websiteId, domainId } = req.body;
    
    try {
      console.log(`Removing domain ${domainId} from website ${websiteId}`);
      
      // 1. Validate website domain mapping exists
      const websiteDomain = await prisma.websiteDomain.findFirst({
        where: {
          websiteId,
          domainId
        },
        include: { domain: true }
      });
      
      if (!websiteDomain) {
        console.error(`Website domain mapping not found for website ${websiteId} and domain ${domainId}`);
        throw new Error('Website domain mapping not found');
      }
      
      // 2. Delete website domain mapping
      await prisma.websiteDomain.delete({
        where: { id: websiteDomain.id }
      });
      
      console.log(`Deleted website domain mapping ${websiteDomain.id}`);
      
      // 3. Update Nginx configuration with remaining domains
      await updateNginxConfig(websiteId);
      
      // 4. Return success response
      res.status(200).json({
        success: true,
        message: `Domain ${websiteDomain.domain.name} removed from website ${websiteId}`
      });
    } catch (error: any) {
      console.error('Error removing domain:', error);
      
      // Return error response
      res.status(500).json({
        success: false,
        error: error.message || 'An error occurred while removing the domain'
      });
    }
  })
);

// Helper function to update Nginx configuration with all domains for a website
async function updateNginxConfig(websiteId: string): Promise<void> {
  try {
    // 1. Get website
    const website = await prisma.website.findUnique({
      where: { id: websiteId }
    });
    
    if (!website) {
      throw new Error(`Website with ID ${websiteId} not found`);
    }
    
    // 2. Get all domains for this website
    const websiteDomains = await prisma.websiteDomain.findMany({
      where: { websiteId },
      include: { domain: true }
    });
    
    // 3. Extract domain names
    const domains = websiteDomains.map(wd => wd.domain.name);
    
    if (domains.length === 0) {
      console.log(`No domains found for website ${websiteId}, skipping Nginx config update`);
      return;
    }
    
    // 3. Generate Nginx configuration
    const buildPath = path.join('/app/websites', `website-${websiteId}`, 'dist');
    const nginxConfig = generateNginxConf(websiteId, domains, buildPath);
    
    // 4. Write Nginx configuration
    const nginxConfigPath = path.join(NGINX_CONF_DIR, `${websiteId}.conf`);
    await fs.writeFile(nginxConfigPath, nginxConfig);
    
    // Also write to the local directory for visibility on the host machine
    const localNginxConfigPath = path.join('/app/tenant-configs-local', `${websiteId}.conf`);
    try {
      await fs.writeFile(localNginxConfigPath, nginxConfig);
      console.log(`Nginx configuration also written to local directory: ${localNginxConfigPath}`);
    } catch (error: any) {
      // Don't fail if we can't write to the local directory
      console.warn(`Could not write to local directory: ${error.message || String(error)}`);
    }
    
    console.log(`Updated Nginx configuration for website ${websiteId} with ${domains.length} domains`);
  } catch (error: any) {
    console.error('Error updating Nginx configuration:', error);
    throw new Error(`Failed to update Nginx configuration: ${error.message || String(error)}`);
  }
}

// Helper function to generate Nginx configuration
function generateNginxConf(websiteId: string, domains: string[], buildPath: string): string {
  return `
# Multi-tenant configuration for website ${websiteId}
server {
    # Listen only on localhost since we're using Cloudflare Tunnel
    listen 127.0.0.1:3000;
    server_name ${domains.join(' ')};

    # Root directory for this tenant
    root /usr/share/nginx/websites/website-${websiteId}/dist;
    index index.html;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";
    add_header X-XSS-Protection "1; mode=block";
    add_header Referrer-Policy "strict-origin-when-cross-origin";

    # Rate limiting for this tenant
    limit_req zone=tenant_limit burst=20 nodelay;
    limit_conn tenant_connection 10;

    # Caching rules
    location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }
}
`.trim();
}

// Helper function to configure Cloudflare tunnel for a domain
async function configureTunnelForDomain(domain: string, cloudflareAccount: any, websiteId: string): Promise<void> {
  const API_KEY = cloudflareAccount.apiKey;
  const SERVER_IP = '127.0.0.1'; // Local IP since we're using Cloudflare Tunnel
  
  try {
    // 1. Create DNS record
    const dnsRecord = {
      type: 'CNAME',
      name: domain,
      content: `${cloudflareAccount.tunnelId}.cfargotunnel.com`,
      ttl: 1,  // Auto
      proxied: true
    };

    const dnsResponse = await axios.post(
      `https://api.cloudflare.com/client/v4/zones/${cloudflareAccount.zoneId}/dns_records`,
      dnsRecord,
      {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!dnsResponse.data.success) {
      throw new Error(`Failed to add DNS record: ${dnsResponse.data.errors?.[0]?.message || 'Unknown error'}`);
    }
  } catch (error: any) {
    console.error('Error configuring tunnel:', error);
    const errorMessage = error.message || 'Unknown error';
    throw new Error(`Failed to configure Cloudflare tunnel: ${errorMessage}`);
  }
}

export default domainManagementRoutes;
