import { Request, Response } from "express";
import prisma from "@/libs/prisma";
import { User } from "@prisma/client";
import axios from "axios";

const CLOUDFLARE_API_BASE = "https://api.cloudflare.com/client/v4";

export interface CloudflareAccount {
    apiKey: string;
    accountId: string;
    tunnelId: string;
}

export const addDomain = async (req: Request, res: Response) => {
    const { domainName } = req.body;
    const user = req.user as User;
    const userId = user?.id;

    try {
        // 1️⃣ Validate User & Fetch Merchant with Cloudflare Account
        const dbUser = await prisma.user.findUnique({
            where: { id: userId },
            include: { merchant: { include: { cloudflareAccounts: true } } },
        });

        if (!dbUser || !dbUser.merchant) {
            return res.status(400).json({ error: "Invalid user or merchant" });
        }

        const merchantId = dbUser.merchant.id;

        // 2️⃣ Ensure Merchant has a Cloudflare Account
        const cloudflareAccount = dbUser.merchant.cloudflareAccounts[0];
        if (!cloudflareAccount) {
            return res.status(400).json({ error: "Merchant does not have a Cloudflare account" });
        }

        // 3️⃣ Check if domain already exists
        const existingDomain = await prisma.domain.findFirst({
            where: { name: domainName },
        });

        if (existingDomain) {
            return res.status(400).json({ 
                error: "Domain already exists in the system" 
            });
        }

        // 4️⃣ Prepare Cloudflare account data
        const cloudflareData: CloudflareAccount = {
            accountId: cloudflareAccount.accountId,
            apiKey: cloudflareAccount.apiKey,
            tunnelId: cloudflareAccount.tunnelId || "",
        };
        
        // 5️⃣ Register domain with Cloudflare if feature is enabled
        let zoneDetails;
        let useCustomNameservers = false;

        if (dbUser.merchant.useCloudflareZones) {
            try {
                zoneDetails = await registerDomainWithCloudflare(domainName, cloudflareData);
                useCustomNameservers = true;
                console.log(`Domain registered with Cloudflare: ${domainName}`);
            } catch (cloudflareError) {
                console.error("Error registering with Cloudflare:", cloudflareError);
                // Continue with default nameservers if Cloudflare registration fails
            }
        }

        // 6️⃣ Store Domain in Database
        const ns1 = useCustomNameservers && zoneDetails?.ns1 ? zoneDetails.ns1 : "ns1.cloudflare.com";
        const ns2 = useCustomNameservers && zoneDetails?.ns2 ? zoneDetails.ns2 : "ns2.cloudflare.com";
        
        const newDomain = await prisma.domain.create({
            data: {
                name: domainName,
                ns1,
                ns2,
                status: "PENDING",
                zoneId: useCustomNameservers ? zoneDetails?.zoneId : null,
                cloudflareAccountId: cloudflareAccount.id,
                addedById: userId,
                merchantId: merchantId, // Link domain to specific merchant for tenant isolation
            },
        });

        // 7️⃣ Update Cloudflare Tunnel if tunnelId exists
        let tunnelUpdated = false;
        if (cloudflareAccount.tunnelId) {
            try {
                // Configure the tunnel with tenant-specific routing
                const serviceUrl = `http://nginx:80?tenant=${merchantId}`;
                await updateCloudflareTunnel(domainName, cloudflareData, serviceUrl);
                console.log(`Cloudflare Tunnel updated for domain: ${domainName}`);
                tunnelUpdated = true;
                
                // Update domain status
                await prisma.domain.update({
                    where: { id: newDomain.id },
                    data: { 
                        tunnelConfigured: true,
                        status: "CONFIGURING" 
                    },
                });
            } catch (tunnelError) {
                console.error("Error updating Cloudflare Tunnel:", tunnelError);
                // Don't fail the entire process if tunnel update fails
            }
        }

        // 8️⃣ Add DNS record if we have a zone ID
        let dnsConfigured = false;
        if (zoneDetails?.zoneId && cloudflareAccount.tunnelId) {
            try {
                await addCloudflareDnsRecord(domainName, zoneDetails.zoneId, cloudflareData);
                console.log(`DNS record added for domain: ${domainName}`);
                dnsConfigured = true;
                
                // Update domain
                await prisma.domain.update({
                    where: { id: newDomain.id },
                    data: { dnsConfigured: true },
                });
            } catch (dnsError) {
                console.error("Error adding DNS record:", dnsError);
            }
        }

        // 9️⃣ Schedule nameserver verification job
        if (tunnelUpdated) {
            scheduleNameserverCheck(newDomain.id);
        }

        // 🔟 Return success response with next steps
        const instructions = useCustomNameservers 
            ? `Please configure your domain's nameservers to ${ns1} and ${ns2} in your domain registrar.`
            : "Please configure your domain's nameservers to ns1.cloudflare.com and ns2.cloudflare.com in your domain registrar.";

        return res.json({ 
            success: true, 
            domain: newDomain,
            message: `Domain added successfully. ${instructions}`,
            tunnelConfigured: tunnelUpdated,
            dnsConfigured: dnsConfigured,
            nextSteps: [
                "Update your domain's nameservers in your domain registrar",
                "Nameserver changes may take 24-48 hours to propagate",
                "Your domain status will automatically update when configuration is complete"
            ]
        });
    } catch (error) {
        console.error("Error adding domain:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};

/**
 * Registers a domain with Cloudflare and retrieves the zone details.
 * @param domainName - The domain to register.
 * @param cloudflareAccount - The Cloudflare account object.
 * @returns Cloudflare Zone Data (Name Servers, Zone ID)
 */
export async function registerDomainWithCloudflare(domainName: string, cloudflareAccount: CloudflareAccount) {
    try {
        const response = await axios.post(
            `${CLOUDFLARE_API_BASE}/zones`,
            {
                name: domainName,
                account: { id: cloudflareAccount.accountId },
                jump_start: true,
            },
            {
                headers: {
                    Authorization: `Bearer ${cloudflareAccount.apiKey}`,
                    "Content-Type": "application/json",
                },
            }
        );

        if (!response.data.success) {
            throw new Error("Failed to register domain with Cloudflare");
        }

        return {
            ns1: response.data.result.name_servers?.[0] ?? null,
            ns2: response.data.result.name_servers?.[1] ?? null,
            zoneId: response.data.result.id,
        };
    } catch (error: any) {
        console.error("Error registering domain with Cloudflare:", error.response?.data || error.message);
        throw new Error("Cloudflare domain registration failed");
    }
}

/**
 * Updates Cloudflare Tunnel to route traffic for the new domain to the specific tenant.
 * @param domain - The domain name to add to the tunnel
 * @param cloudflareAccount - The merchant's Cloudflare account
 * @param serviceUrl - The service URL with tenant identifier
 */
export async function updateCloudflareTunnel(
    domain: string, 
    cloudflareAccount: CloudflareAccount,
    serviceUrl: string = "http://nginx:80"
) {
    try {
        if (!cloudflareAccount.tunnelId) {
            throw new Error("Missing Cloudflare Tunnel ID for this merchant.");
        }

        // Fetch current tunnel configuration
        const tunnelConfigUrl = `${CLOUDFLARE_API_BASE}/accounts/${cloudflareAccount.accountId}/cfd_tunnel/${cloudflareAccount.tunnelId}/configurations`;
        const response = await axios.get(tunnelConfigUrl, {
            headers: { Authorization: `Bearer ${cloudflareAccount.apiKey}` },
        });

        // Check response structure based on Cloudflare API
        let ingressRules = response.data.result?.config?.ingress || [];
        if (!ingressRules.length && response.data.ingress) {
            ingressRules = response.data.ingress; // Alternative structure
        }

        // Avoid duplicate entries
        if (ingressRules.some((rule: any) => rule.hostname === domain)) {
            console.log(`Domain ${domain} already exists in Cloudflare Tunnel.`);
            return;
        }

        // Add new hostname mapping with tenant-specific service URL
        ingressRules.unshift({ hostname: domain, service: serviceUrl });

        // Make sure we keep the catch-all rule at the end
        const catchAllRule = ingressRules.find((rule: any) => !rule.hostname);
        if (!catchAllRule) {
            ingressRules.push({ service: "http_status:404" });
        }

        // Determine payload structure based on API version
        let requestPayload: any;
        if (response.data.result?.config) {
            requestPayload = { config: { ingress: ingressRules } };
        } else {
            requestPayload = { ingress: ingressRules };
        }

        // Update Cloudflare Tunnel configuration
        await axios.put(tunnelConfigUrl, requestPayload, {
            headers: { Authorization: `Bearer ${cloudflareAccount.apiKey}` },
        });

        console.log(`Cloudflare Tunnel updated for domain: ${domain}`);
    } catch (error: any) {
        console.error("Error updating Cloudflare Tunnel:", error.response?.data || error.message);
        throw new Error("Failed to update Cloudflare Tunnel");
    }
}

/**
 * Adds a DNS record to point the domain to the Cloudflare tunnel
 * @param domain - The domain name
 * @param zoneId - The Cloudflare zone ID
 * @param cloudflareAccount - The Cloudflare account
 */
export async function addCloudflareDnsRecord(domain: string, zoneId: string, cloudflareAccount: CloudflareAccount) {
    try {
        if (!cloudflareAccount.tunnelId) {
            throw new Error("Missing Cloudflare Tunnel ID");
        }

        const dnsUrl = `${CLOUDFLARE_API_BASE}/zones/${zoneId}/dns_records`;

        // Create CNAME record pointing to the tunnel
        await axios.post(
            dnsUrl,
            {
                type: "CNAME",
                name: domain,
                content: `${cloudflareAccount.tunnelId}.cfargotunnel.com`,
                ttl: 1,
                proxied: true,
            },
            {
                headers: { Authorization: `Bearer ${cloudflareAccount.apiKey}` },
            }
        );

        console.log(`DNS record for ${domain} created successfully.`);
    } catch (error: any) {
        console.error("Error adding DNS record:", error.response?.data || error.message);
        throw new Error("Failed to add Cloudflare DNS record");
    }
}

/**
 * Schedules a job to verify nameserver configuration
 * This would be implemented with your job queue system (Bull, Agenda, etc.)
 */
function scheduleNameserverCheck(domainId: string) {
    // This is a placeholder - replace with actual job scheduling code
    console.log(`Scheduled nameserver verification for domain ID: ${domainId}`);
    
    // Example with setTimeout (for demonstration only)
    // In production, use a proper job queue
    setTimeout(async () => {
        try {
            await verifyDomainNameservers(domainId);
        } catch (error) {
            console.error(`Error verifying nameservers for domain ${domainId}:`, error);
        }
    }, 3600000); // Check after 1 hour
}

/**
 * Verifies if nameservers are properly configured for a domain
 * This would be called by your job scheduler
 */
async function verifyDomainNameservers(domainId: string) {
    try {
        // Fetch domain details
        const domain = await prisma.domain.findUnique({
            where: { id: domainId },
            include: { cloudflareAccount: true }
        });
        
        if (!domain) {
            throw new Error(`Domain not found: ${domainId}`);
        }
        
        // Implement nameserver verification logic
        // This could use DNS lookup APIs to check if nameservers match
        
        // This is a placeholder for the actual verification
        const nameserversConfigured = true; // Replace with actual verification
        
        // Update domain status based on verification
        if (nameserversConfigured) {
            await prisma.domain.update({
                where: { id: domainId },
                data: {
                    nameserversConfigured: true,
                    status: "ACTIVE",
                    lastVerifiedAt: new Date(),
                }
            });
            console.log(`Domain ${domain.name} is now active`);
        } else {
            // Schedule another check later
            scheduleNameserverCheck(domainId);
        }
    } catch (error) {
        console.error(`Error in nameserver verification:`, error);
        // Update domain with error information
        await prisma.domain.update({
            where: { id: domainId },
            data: {
                verificationErrors: error instanceof Error ? error.message : "Unknown error",
                lastVerifiedAt: new Date(),
            }
        });
    }
}