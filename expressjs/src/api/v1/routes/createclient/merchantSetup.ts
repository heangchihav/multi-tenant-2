import express, { Request, Response } from 'express';
import { Router } from 'express';
import { asyncErrorHandler } from '@/middlewares/error/ErrorMiddleware';
import { PrismaClient } from '@prisma/client';
import { exec } from 'child_process';
import axios from 'axios';

const prisma = new PrismaClient();
const merchantSetupRoutes: Router = Router();

// CONFIG
const BACKEND_DOMAIN = 'backenddomain.com'; // Base domain for merchant backends

interface SetupMerchantRequestBody {
  name: string;
  email: string;
  cloudflareApiKey?: string;
  cloudflareAccountId?: string;
  cloudflareZoneId?: string;
}

// POST: /api/merchant/setup
merchantSetupRoutes.post('/setup',
  asyncErrorHandler(async (req: Request<{}, {}, SetupMerchantRequestBody>, res: Response) => {
    const { name, email, cloudflareApiKey, cloudflareAccountId, cloudflareZoneId } = req.body;
    
    try {
      console.log(`Setting up merchant: ${name}`);
      
      // 1. Create merchant record
      const merchant = await prisma.merchant.create({
        data: {
          name
          // email field doesn't exist in the Merchant model
          // isActive may not exist in the schema, let's try without it
        }
      });
      
      console.log(`Created merchant with ID: ${merchant.id}`);
      
      // 2. Create default admin user for the merchant
      const user = await prisma.user.create({
        data: {
          email,
          name: `${name} Admin`,
          role: 'ADMIN',
          merchantId: merchant.id
        }
      });
      
      console.log(`Created admin user with ID: ${user.id}`);
      
      // 3. Set up Cloudflare account if credentials provided
      let cloudflareAccount = null;
      if (cloudflareApiKey && cloudflareAccountId && cloudflareZoneId) {
        // Create Cloudflare account record
        cloudflareAccount = await prisma.cloudflareAccount.create({
          data: {
            merchantId: merchant.id,
            accountId: cloudflareAccountId,
            apiKey: cloudflareApiKey,
            zoneId: cloudflareZoneId // Required field in the Prisma schema
          }
        });
        
        console.log(`Created Cloudflare account for merchant: ${merchant.id}`);
        
        // Set up Cloudflare tunnel for the merchant
        try {
          const tunnelId = await setupCloudflareTunnel(cloudflareApiKey, cloudflareAccountId, merchant.id);
          
          // Update Cloudflare account with tunnel ID
          await prisma.cloudflareAccount.update({
            where: { id: cloudflareAccount.id },
            data: { tunnelId }
          });
          
          console.log(`Configured Cloudflare tunnel: ${tunnelId}`);
        } catch (tunnelError: any) {
          console.error('Error setting up Cloudflare tunnel:', tunnelError);
          // Don't fail the entire process if tunnel setup fails
        }
      }
      
      // 4. Set up backend subdomain (merchantid.backenddomain.com)
      const backendDomain = `${merchant.id}.${BACKEND_DOMAIN}`;
      
      // Create domain record for backend
      // Prepare domain data
      const domainData: any = {
        name: backendDomain,
        ns1: 'ns1.cloudflare.com',
        ns2: 'ns2.cloudflare.com',
        status: 'ACTIVE',
        addedById: user.id
      };
      
      // Only add cloudflareAccountId if it exists
      if (cloudflareAccount?.id) {
        domainData.cloudflareAccountId = cloudflareAccount.id;
      }
      
      const backendDomainRecord = await prisma.domain.create({
        data: domainData
      });
      
      console.log(`Created backend domain: ${backendDomain}`);
      
      // Return success response
      res.status(201).json({
        success: true,
        merchant,
        user,
        cloudflareAccount,
        backendDomain: backendDomainRecord
      });
      
    } catch (error: any) {
      console.error('Error setting up merchant:', error);
      
      // Return error response
      res.status(500).json({
        success: false,
        error: error.message || 'An error occurred while setting up the merchant'
      });
    }
  })
);

// Helper function to set up Cloudflare tunnel
async function setupCloudflareTunnel(apiKey: string, accountId: string, merchantId: string): Promise<string> {
  try {
    // Create a new tunnel
    const tunnelResponse = await axios.post(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/tunnels`,
      {
        name: `merchant-${merchantId}-tunnel`,
        tunnel_type: 'http'
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );
    
    if (!tunnelResponse.data.success) {
      throw new Error(`Failed to create tunnel: ${tunnelResponse.data.errors?.[0]?.message || 'Unknown error'}`);
    }
    
    const tunnelId = tunnelResponse.data.result.id;
    
    // Configure the tunnel
    await axios.put(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/tunnels/${tunnelId}/configurations`,
      {
        config: {
          ingress: [
            {
              hostname: `${merchantId}.${BACKEND_DOMAIN}`,
              service: 'http://localhost:3000'
            },
            {
              service: 'http_status:404'
            }
          ]
        }
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );
    
    return tunnelId;
  } catch (error: any) {
    console.error('Error setting up Cloudflare tunnel:', error);
    throw new Error(`Failed to set up Cloudflare tunnel: ${error.message || 'Unknown error'}`);
  }
}

export default merchantSetupRoutes;
