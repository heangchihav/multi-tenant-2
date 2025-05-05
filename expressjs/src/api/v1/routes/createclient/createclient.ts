// import express, { Request, Response } from 'express';
// import fs from 'fs-extra';
// import path from 'path';
// import { exec } from 'child_process';
// import axios from 'axios';
// import { Router } from 'express';
// import { asyncErrorHandler } from '@/middlewares/error/ErrorMiddleware';
// import { PrismaClient, CloudflareAccount } from '@prisma/client';

// const prisma = new PrismaClient(); // Make sure this is a proper async error wrapper

// const createClientRoutes: Router = Router();

// // CONFIG
// const TEMPLATE_DIR = '/app/templates';
// const WEBSITE_DIR = '/app/websites';
// const NGINX_CONF_DIR = '/app/tenant-configs';

// // Nginx rate limiting configuration
// const NGINX_RATE_LIMIT_CONFIG = `
// # Rate limiting settings for multi-tenant setup
// limit_req_zone $binary_remote_addr zone=tenant_limit:10m rate=10r/s;
// limit_conn_zone $binary_remote_addr zone=tenant_connection:10m;
// `.trim();

// interface CreateClientRequestBody {
//   merchantId: string;
//   templateName: string;
//   domains: string[];
//   label?: string;
// }

// // POST: /api/create-client
// createClientRoutes.post('/create',
//   asyncErrorHandler(async (req: Request<{}, {}, CreateClientRequestBody>, res: Response) => {
//     const { merchantId, templateName, domains, label } = req.body;
//     let website: any = undefined;
//     let destPath: string = '';
    
//     try {
//       console.log(`Creating client for merchant ${merchantId} with template ${templateName}`);
      
//       // 1. Validate merchant exists and has Cloudflare account
//       const merchant = await prisma.merchant.findUnique({
//         where: { id: merchantId },
//         include: { cloudflareAccounts: true }
//       });
      
//       if (!merchant) {
//         console.error(`Merchant with ID ${merchantId} not found`);
//         throw new Error('Merchant not found');
//       }
      
//       console.log(`Found merchant: ${merchant.name}`);
      
//       // Cloudflare account is optional for testing
//       // if (!merchant.cloudflareAccounts?.length) {
//       //   throw new Error('Merchant has no Cloudflare account');
//       // }
      
//       const template = await prisma.template.findUnique({
//         where: { name: templateName }
//       });
//       if (!template) throw new Error('Template not found');

//       // 2. Create website record
//       website = await prisma.website.create({
//         data: {
//           merchantId,
//           templateId: template.id,
//           label: label || `${merchant.name}'s ${templateName} site`,
//           isActive: true
//         }
//       });

//       const srcPath = path.join(TEMPLATE_DIR, templateName);
//       destPath = path.join(WEBSITE_DIR, `website-${website.id}`);
//       const buildPath = path.join(destPath, 'dist');

//       // 3. Copy template and build
//       console.log(`Copying template from ${srcPath} to ${destPath}`);
//       await fs.copy(srcPath, destPath);
      
//       // Check if package.json exists
//       const packageJsonPath = path.join(destPath, 'package.json');
//       if (await fs.pathExists(packageJsonPath)) {
//         console.log('Found package.json, installing dependencies...');
//         try {
//           // Install dependencies
//           await execPromise(`cd ${destPath} && npm install`);
          
//           // Read package.json to check for build script
//           const packageJson = await fs.readJson(packageJsonPath);
//           if (packageJson.scripts && packageJson.scripts.build) {
//             console.log('Running build script...');
//             await execPromise(`cd ${destPath} && npm run build`);
//           } else {
//             console.log('No build script found in package.json');
//             // Create a dist directory if it doesn't exist
//             const distPath = path.join(destPath, 'dist');
//             if (!await fs.pathExists(distPath)) {
//               console.log(`Creating dist directory at ${distPath}`);
//               await fs.mkdir(distPath);
//               // Copy source files to dist as a fallback
//               await fs.copy(path.join(destPath, 'src'), distPath, {
//                 filter: (src) => !src.includes('node_modules')
//               });
//             }
//           }
//         } catch (buildError: any) {
//           console.error('Error during build process:', buildError);
//           throw new Error(`Build process failed: ${buildError.message || String(buildError)}`);
//         }
//       } else {
//         console.log('No package.json found, skipping build process');
//         // Create a dist directory with the template content
//         const distPath = path.join(destPath, 'dist');
//         await fs.mkdir(distPath);
//         // Copy all files except node_modules to dist
//         await fs.copy(destPath, distPath, {
//           filter: (src) => !src.includes('node_modules')
//         });
//       }

//       // 4. Create domain records and configure DNS
//       const cloudflareAccount = merchant.cloudflareAccounts?.[0];
      
//       // Verify the website exists before creating domains
//       const websiteCheck = await prisma.website.findUnique({
//         where: { id: website.id }
//       });
      
//       if (!websiteCheck) {
//         console.error(`Website with ID ${website.id} not found`);
//         throw new Error('Website not found. Cannot create domain mappings.');
//       }
      
//       console.log(`Creating domains for website ${website.id}`);
      
//       const domainPromises = domains.map(async (domainName: string) => {
//         try {
//           // Use a transaction to ensure both domain and mapping are created together
//           return await prisma.$transaction(async (tx) => {
//             // Create domain
//             const domain = await tx.domain.create({
//               data: {
//                 name: domainName,
//                 ns1: 'ns1.cloudflare.com',
//                 ns2: 'ns2.cloudflare.com',
//                 status: 'PENDING',
//                 cloudflareAccountId: cloudflareAccount?.id || '', // Use empty string if no account
//                 addedById: 1, // TODO: Get from auth context
//               }
//             });
            
//             console.log(`Created domain ${domain.id} for ${domainName}`);
            
//             // Create website domain mapping
//             const websiteDomain = await tx.websiteDomain.create({
//               data: {
//                 websiteId: website.id,
//                 domainId: domain.id,
//                 isPrimary: true
//               }
//             });
            
//             console.log(`Created website domain mapping ${websiteDomain.id}`);
            
//             return domain;
//           });
//         } catch (error: any) {
//           console.error(`Error creating domain ${domainName}:`, error);
//           throw new Error(`Failed to create domain: ${error.message || String(error)}`);
//         }
//       });

//       await Promise.all(domainPromises);

//       // 5. Generate and write Nginx configuration
//       const nginxConfig = generateNginxConf(website.id.toString(), domains, buildPath);
//       const nginxConfigPath = path.join(NGINX_CONF_DIR, `${website.id}.conf`);
//       await fs.writeFile(nginxConfigPath, nginxConfig);
      
//       // Also write to the local directory for visibility on the host machine
//       const localNginxConfigPath = path.join('/app/tenant-configs-local', `${website.id}.conf`);
//       try {
//         await fs.writeFile(localNginxConfigPath, nginxConfig);
//         console.log(`Nginx configuration also written to local directory: ${localNginxConfigPath}`);
//       } catch (error: any) {
//         // Don't fail if we can't write to the local directory
//         console.warn(`Could not write to local directory: ${error.message || String(error)}`);
//       }

//       // 6. Signal Nginx to reload by creating a reload file that can be monitored
//       // We don't need to directly reload Nginx from this container
//       // Instead, we'll just write the config and let the Nginx container handle reloading
//       console.log('Nginx configuration written successfully. Nginx will detect changes.');

//       res.status(201).json({
//         success: true,
//         website,
//         domains: await Promise.all(domainPromises)
//       });
//     } catch (error: any) {
//       console.error('Error creating client:', error);
      
//       // Attempt to clean up if website was created
//       if (typeof website !== 'undefined') {
//         try {
//           // Delete website record
//           await prisma.website.delete({
//             where: { id: website.id }
//           });
          
//           // Remove website directory
//           if (await fs.pathExists(destPath)) {
//             await fs.remove(destPath);
//           }
          
//           // Remove Nginx config
//           const nginxConfigPath = path.join(NGINX_CONF_DIR, `${website.id}.conf`);
//           if (await fs.pathExists(nginxConfigPath)) {
//             await fs.remove(nginxConfigPath);
//           }
//         } catch (cleanupError) {
//           console.error('Error during rollback:', cleanupError);
//         }
//       }
      
//       // Return error response
//       res.status(500).json({
//         success: false,
//         error: error.message || 'An error occurred while creating the client website'
//       });
//     }
//   })
// );

// function generateNginxConf(websiteId: string, domains: string[], buildPath: string): string {
//   return `
// # Multi-tenant configuration for website ${websiteId}
// server {
//     # Listen only on localhost since we're using Cloudflare Tunnel
//     listen 127.0.0.1:3000;
//     server_name ${domains.join(' ')};

//     # Root directory for this tenant
//     root /usr/share/nginx/websites/website-${websiteId}/dist;
//     index index.html;

//     # Security headers
//     add_header X-Frame-Options "SAMEORIGIN";
//     add_header X-Content-Type-Options "nosniff";
//     add_header X-XSS-Protection "1; mode=block";
//     add_header Referrer-Policy "strict-origin-when-cross-origin";

//     # Rate limiting for this tenant
//     limit_req zone=tenant_limit burst=20 nodelay;
//     limit_conn tenant_connection 10;

//     # Caching rules
//     location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
//         expires 30d;
//         add_header Cache-Control "public, no-transform";
//     }

//     # SPA fallback
//     location / {
//         try_files $uri $uri/ /index.html;
//     }
// }
// `.trim();
// }

// function execPromise(command: string): Promise<string> {
//   return new Promise((resolve, reject) => {
//     console.log(`Executing command: ${command}`);
//     exec(command, (error, stdout, stderr) => {
//       if (error) {
//         console.error(`exec error: ${error}`);
//         console.error(`stderr: ${stderr}`);
//         reject(error);
//         return;
//       }
      
//       console.log(`stdout: ${stdout}`);
//       if (stderr) console.log(`stderr: ${stderr}`);
//       resolve(stdout);
//     });
//   });
// }

// async function configureTunnelForDomain(domain: string, cloudflareAccount: any, websiteId: string): Promise<void> {
//   const API_KEY = cloudflareAccount.apiKey;
//   const SERVER_IP = '127.0.0.1'; // Local IP since we're using Cloudflare Tunnel
  
//   try {
//     // 1. Create DNS record
//     const dnsRecord = {
//       type: 'CNAME',
//       name: domain,
//       content: `${cloudflareAccount.tunnelId}.cfargotunnel.com`,
//       ttl: 1,  // Auto
//       proxied: true
//     };

//     const dnsResponse = await axios.post(
//       `https://api.cloudflare.com/client/v4/zones/${cloudflareAccount.zoneId}/dns_records`,
//       dnsRecord,
//       {
//         headers: {
//           Authorization: `Bearer ${API_KEY}`,
//           'Content-Type': 'application/json',
//         },
//       }
//     );

//     if (!dnsResponse.data.success) {
//       throw new Error(`Failed to add DNS record: ${dnsResponse.data.errors?.[0]?.message || 'Unknown error'}`);
//     }
//   } catch (error: any) {
//     console.error('Error configuring tunnel:', error);
//     const errorMessage = error.message || 'Unknown error';
//     throw new Error(`Failed to configure Cloudflare tunnel: ${errorMessage}`);
//   }
// }

// export default createClientRoutes;
