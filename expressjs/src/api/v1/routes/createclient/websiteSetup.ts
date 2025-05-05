import express, { Request, Response } from 'express';
import fs from 'fs-extra';
import path from 'path';
import { exec } from 'child_process';
import { Router } from 'express';
import { asyncErrorHandler } from '@/middlewares/error/ErrorMiddleware';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const websiteSetupRoutes: Router = Router();

// CONFIG
const TEMPLATE_DIR = '/app/templates';
const WEBSITE_DIR = '/app/websites';
const NGINX_CONF_DIR = '/app/tenant-configs';

interface SetupWebsiteRequestBody {
  merchantId: string;
  templateName: string;
  domains: string[];
  label?: string;
}

// POST: /api/website/setup
websiteSetupRoutes.post('/setup',
  asyncErrorHandler(async (req: Request<{}, {}, SetupWebsiteRequestBody>, res: Response) => {
    const { merchantId, templateName, domains, label } = req.body;
    let website: any = undefined;
    let destPath: string = '';
    
    try {
      console.log(`Creating website for merchant ${merchantId} with template ${templateName}`);
      
      // 1. Validate merchant exists
      const merchant = await prisma.merchant.findUnique({
        where: { id: merchantId },
        include: { cloudflareAccounts: true }
      });
      
      if (!merchant) {
        console.error(`Merchant with ID ${merchantId} not found`);
        throw new Error('Merchant not found');
      }
      
      console.log(`Found merchant: ${merchant.name}`);
      
      // 2. Validate template exists
      const template = await prisma.template.findUnique({
        where: { name: templateName }
      });
      
      if (!template) {
        throw new Error('Template not found');
      }

      // 3. Create website record
      // Check if isActive field exists in the Website model
      const websiteData: any = {
        merchantId,
        templateId: template.id,
        label: label || `${merchant.name}'s ${templateName} site`
      };
      
      // Only add isActive if it's a valid field in the schema
      try {
        // Try to include isActive field
        website = await prisma.website.create({
          data: {
            ...websiteData,
            isActive: true
          }
        });
      } catch (createError: any) {
        // If isActive causes an error, try without it
        if (createError.message.includes('isActive')) {
          console.log('isActive field not found in Website model, creating without it');
          website = await prisma.website.create({
            data: websiteData
          });
        } else {
          // If it's a different error, rethrow it
          throw createError;
        }
      }

      const srcPath = path.join(TEMPLATE_DIR, templateName);
      destPath = path.join(WEBSITE_DIR, `website-${website.id}`);
      const buildPath = path.join(destPath, 'dist');

      // 4. Copy template and build
      console.log(`Copying template from ${srcPath} to ${destPath}`);
      await fs.copy(srcPath, destPath);
      
      // Build the website
      await buildWebsite(destPath);

      // 5. Generate and write Nginx configuration
      const nginxConfig = generateNginxConf(website.id.toString(), domains, buildPath);
      const nginxConfigPath = path.join(NGINX_CONF_DIR, `${website.id}.conf`);
      await fs.writeFile(nginxConfigPath, nginxConfig);
      
      // Also write to the local directory for visibility on the host machine
      const localNginxConfigPath = path.join('/app/tenant-configs-local', `${website.id}.conf`);
      try {
        await fs.writeFile(localNginxConfigPath, nginxConfig);
        console.log(`Nginx configuration also written to local directory: ${localNginxConfigPath}`);
      } catch (error: any) {
        // Don't fail if we can't write to the local directory
        console.warn(`Could not write to local directory: ${error.message || String(error)}`);
      }

      // 6. Signal Nginx to reload by creating a reload file that can be monitored
      console.log('Nginx configuration written successfully. Nginx will detect changes.');

      // 7. Return success response with website details
      res.status(201).json({
        success: true,
        website,
        domains
      });
    } catch (error: any) {
      console.error('Error creating website:', error);
      
      // Attempt to clean up if website was created
      if (typeof website !== 'undefined') {
        try {
          // Delete website record
          await prisma.website.delete({
            where: { id: website.id }
          });
          
          // Remove website directory
          if (await fs.pathExists(destPath)) {
            await fs.remove(destPath);
          }
          
          // Remove Nginx config
          const nginxConfigPath = path.join(NGINX_CONF_DIR, `${website.id}.conf`);
          if (await fs.pathExists(nginxConfigPath)) {
            await fs.remove(nginxConfigPath);
          }
        } catch (cleanupError) {
          console.error('Error during rollback:', cleanupError);
        }
      }
      
      // Return error response
      res.status(500).json({
        success: false,
        error: error.message || 'An error occurred while creating the website'
      });
    }
  })
);

// Helper function to build the website
async function buildWebsite(destPath: string): Promise<void> {
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

// Helper function to execute shell commands
function execPromise(command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    console.log(`Executing command: ${command}`);
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`exec error: ${error}`);
        console.error(`stderr: ${stderr}`);
        reject(error);
        return;
      }
      
      console.log(`stdout: ${stdout}`);
      if (stderr) console.log(`stderr: ${stderr}`);
      resolve(stdout);
    });
  });
}

export default websiteSetupRoutes;
