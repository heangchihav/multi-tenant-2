import express, { Request, Response } from 'express';
import fs from 'fs-extra';
import path from 'path';
import { exec } from 'child_process';
import axios from 'axios';
import { Router } from 'express';
import { asyncErrorHandler } from '@/middlewares/error/ErrorMiddleware';
import { PrismaClient, CloudflareAccount } from '@prisma/client';

const prisma = new PrismaClient(); // Make sure this is a proper async error wrapper

const createClientRoutes: Router = Router();

// CONFIG
const TEMPLATE_DIR = '/app/templates';
const WEBSITE_DIR = '/app/websites';
const NGINX_CONF_DIR = '/app/tenant-configs';

// Nginx rate limiting configuration
const NGINX_RATE_LIMIT_CONFIG = `
# Rate limiting settings for multi-tenant setup
limit_req_zone $binary_remote_addr zone=tenant_limit:10m rate=10r/s;
limit_conn_zone $binary_remote_addr zone=tenant_connection:10m;
`.trim();

interface CreateClientRequestBody {
  merchantId: string;
  templateName: string;
  domains: string[];
  label?: string;
}

// POST: /api/create-client
createClientRoutes.post('/create',
  asyncErrorHandler(async (req: Request<{}, {}, CreateClientRequestBody>, res: Response) => {
    const { merchantId, templateName, domains, label } = req.body;

    // 1. Validate merchant and template
    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId },
      include: { cloudflareAccounts: true }
    });
    if (!merchant) throw new Error('Merchant not found');
    
    // Check if merchant has Cloudflare account
    const hasCloudflareAccount = merchant.cloudflareAccounts && merchant.cloudflareAccounts.length > 0;
    console.log(`Merchant ${merchantId} has Cloudflare account: ${hasCloudflareAccount}`);
    
    // For testing, we'll make Cloudflare account optional
    // if (!merchant.cloudflareAccounts?.[0]) throw new Error('Cloudflare account not configured');

    const template = await prisma.template.findUnique({
      where: { name: templateName }
    });
    if (!template) throw new Error('Template not found');

    // 2. Create website record
    const website = await prisma.website.create({
      data: {
        merchantId,
        templateId: template.id,
        label: label || `${merchant.name}'s ${templateName} site`,
        isActive: true
      }
    });

    const srcPath = path.join(TEMPLATE_DIR, templateName);
    const destPath = path.join(WEBSITE_DIR, `website-${website.id}`);
    const buildPath = path.join(destPath, 'dist');

    // 3. Copy template and build
    console.log(`Copying template from ${srcPath} to ${destPath}`);
    await fs.copy(srcPath, destPath);
    
    // Check if package.json exists
    const packageJsonPath = path.join(destPath, 'package.json');
    if (await fs.pathExists(packageJsonPath)) {
      console.log('Found package.json, installing dependencies...');
      try {
        // Install dependencies
        await execPromise(`cd ${destPath} && npm install`);
        
        // Read package.json to check for build script
        const packageJson = await fs.readJson(packageJsonPath);
        if (packageJson.scripts && packageJson.scripts.build) {
          console.log('Running build script...');
          await execPromise(`cd ${destPath} && npm run build`);
        } else {
          console.log('No build script found in package.json');
          // Create a dist directory if it doesn't exist
          const distPath = path.join(destPath, 'dist');
          if (!await fs.pathExists(distPath)) {
            console.log(`Creating dist directory at ${distPath}`);
            await fs.mkdir(distPath);
            // Copy source files to dist as a fallback
            await fs.copy(path.join(destPath, 'src'), distPath, {
              filter: (src) => !src.includes('node_modules')
            });
          }
        }
      } catch (buildError: any) {
        console.error('Error during build process:', buildError);
        throw new Error(`Build process failed: ${buildError.message || String(buildError)}`);
      }
    } else {
      console.log('No package.json found, skipping build process');
      // Create a dist directory with the template content
      const distPath = path.join(destPath, 'dist');
      await fs.mkdir(distPath);
      // Copy all files except node_modules to dist
      await fs.copy(destPath, distPath, {
        filter: (src) => !src.includes('node_modules')
      });
    }

    // 4. Create domain records and configure DNS
    const cloudflareAccount = merchant.cloudflareAccounts?.[0];
    const domainPromises = domains.map(async (domainName) => {
      // Create or get domain
      const domain = await prisma.domain.create({
        data: {
          name: domainName,
          ns1: 'ns1.cloudflare.com',
          ns2: 'ns2.cloudflare.com',
          status: 'PENDING',
          cloudflareAccountId: cloudflareAccount?.id || '', // Use empty string if no account
          addedById: 1, // TODO: Get from auth context
        }
      });

      // Create website domain mapping
      await prisma.websiteDomain.create({
        data: {
          websiteId: website.id,
          domainId: domain.id,
          isPrimary: true
        }
      });

      return domain;
    });

    await Promise.all(domainPromises);

    let confPath: string | undefined;
    try {
      // 5. Generate and save NGINX config
      const nginxConf = generateNginxConf(website.id, domains, buildPath);
      confPath = path.join(NGINX_CONF_DIR, `${website.id}.conf`);
      await fs.writeFile(confPath, nginxConf);

      // 6. Reload NGINX
      await execPromise('nginx -s reload');

      // 7. Configure Cloudflare Tunnel for each domain
      // Only configure Cloudflare Tunnel if account exists
      if (cloudflareAccount) {
        await Promise.all(domains.map((domain) => configureTunnelForDomain(domain, cloudflareAccount, website.id)));
      } else {
        console.log('Skipping Cloudflare Tunnel configuration as no account is configured');
      }

      // 8. Update domain status to ACTIVE
      await prisma.domain.updateMany({
        where: { name: { in: domains } },
        data: { status: 'ACTIVE' }
      });

      res.json({
        message: 'Client website created and configured successfully',
        data: {
          websiteId: website.id,
          domains: domains,
          buildPath,
          label: website.label
        }
      });
    } catch (error) {
      // Log detailed error information
      console.error('Error in create client:', error);
      
      // Rollback on failure
      try {
        if (website?.id) {
          console.log(`Rolling back website ${website.id}`);
          await prisma.website.delete({ where: { id: website.id } });
        }
        
        if (destPath) {
          console.log(`Removing directory ${destPath}`);
          await fs.remove(destPath);
        }
        
        if (confPath && await fs.pathExists(confPath)) {
          console.log(`Removing Nginx config ${confPath}`);
          await fs.remove(confPath);
          await execPromise('nginx -s reload');
        }
      } catch (rollbackError) {
        console.error('Error during rollback:', rollbackError);
      }
      
      // Throw the original error
      throw error;
    }
  })
);

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

    # Trust Cloudflare headers
    real_ip_header CF-Connecting-IP;
    set_real_ip_from 127.0.0.1/32;
    real_ip_recursive on;

    # Basic security headers
    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-XSS-Protection "1; mode=block";
    add_header X-Content-Type-Options "nosniff";
    add_header Referrer-Policy "strict-origin-when-cross-origin";

    # Cache control for static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }

    # Main application routing
    location / {
        # Tenant identification
        set $tenant_id "${websiteId}";

        # Only allow access through Cloudflare Tunnel
        if ($http_cf_connecting_ip = "") {
            return 403;
        }

        # Add tenant headers
        proxy_set_header X-Website-ID $tenant_id;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header Host $host;

        try_files $uri $uri/ /index.html;
    }

    # Block access to sensitive files
    location ~ \.(env|config|lock|git|yml|yaml|xml)$ {
        deny all;
        return 404;
    }

    # Health check endpoint for Cloudflare
    location /cdn-cgi/health {
        access_log off;
        return 200 'healthy';
        add_header Content-Type text/plain;
    }

    # Error pages
    error_page 404 /404.html;
    error_page 500 502 503 504 /50x.html;
}
`.trim();
}



function execPromise(command: string): Promise<string> {
  console.log(`Executing command: ${command}`);
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (stdout) console.log(`Command stdout: ${stdout}`);
      if (stderr) console.log(`Command stderr: ${stderr}`);
      
      if (error) {
        console.error(`Command error: ${error.message}`);
        return reject(stderr || error.message);
      }
      resolve(stdout);
    });
  });
}

async function configureTunnelForDomain(domain: string, cloudflareAccount: CloudflareAccount, websiteId: string): Promise<void> {
  const TUNNEL_ID = process.env.CLOUDFLARE_TUNNEL_ID || cloudflareAccount.tunnelId;
  const API_KEY = cloudflareAccount.apiKey;
  const ACCOUNT_ID = cloudflareAccount.accountId;

  if (!API_KEY) {
    throw new Error('Cloudflare API key not configured');
  }

  if (!TUNNEL_ID) {
    throw new Error('Cloudflare tunnel ID not configured');
  }

  // 1. Configure tunnel route for the domain
  const tunnelConfig = {
    hostname: domain,
    service: `http://localhost:3000`,  // Match Nginx port
    originRequest: {
      noTLSVerify: true,
      httpHostHeader: domain,
      // Add custom headers to identify the tenant
      connectTimeout: '10s',
      headers: {
        'X-Website-ID': websiteId,
        'CF-Access-Client-Id': process.env.CF_ACCESS_CLIENT_ID,
        'CF-Access-Client-Secret': process.env.CF_ACCESS_CLIENT_SECRET
      }
    }
  };

  try {
    // Configure tunnel route
    const routeResponse = await axios.post(
      `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/tunnels/${TUNNEL_ID}/configurations`,
      tunnelConfig,
      {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!routeResponse.data.success) {
      throw new Error(`Failed to configure tunnel: ${routeResponse.data.errors?.[0]?.message || 'Unknown error'}`);
    }

    // 2. Create CNAME record pointing to tunnel
    const tunnelDomain = `${TUNNEL_ID}.cfargotunnel.com`;
    const dnsRecord = {
      type: 'CNAME',
      name: domain,
      content: tunnelDomain,
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

export default createClientRoutes;
