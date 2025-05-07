import { Request, Response } from "express";
import prisma from "@/libs/prisma";
import { User } from "@prisma/client";
import axios from "axios";

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

        // 2️⃣ Ensure Merchant has a Cloudflare Account
        const cloudflareAccount = dbUser.merchant.cloudflareAccounts[0];
        if (!cloudflareAccount) {
            return res.status(400).json({ error: "Merchant does not have a Cloudflare account" });
        }
        if (!cloudflareAccount.tunnelId) {
            return res.status(400).json({ error: "Cloudflare account is not properly configured with a tunnel ID" });
        }
        // Convert DB response to CloudflareAccount type
        const cloudflareData: CloudflareAccount = {
            accountId: cloudflareAccount.accountId,
            apiKey: cloudflareAccount.apiKey, // Ensure this is decrypted if stored encrypted
            tunnelId: cloudflareAccount.tunnelId, // Make sure merchants have unique tunnels
        };

        // 3️⃣ Register the Domain with Cloudflare & Get Name Servers
        const { ns1, ns2, zoneId } = await registerDomainWithCloudflare(domainName, cloudflareData);

        // 4️⃣ Store Domain in Database
        const newDomain = await prisma.domain.create({
            data: {
                name: domainName,
                ns1,
                ns2,
                cloudflareAccountId: cloudflareAccount.id,
                addedById: userId,
            },
        });

        // 5️⃣ Update Cloudflare Tunnel & Add DNS Record
        await updateCloudflareTunnel(domainName, cloudflareData);
        await addCloudflareDnsRecord(domainName, zoneId, cloudflareData);

        return res.json({ success: true, domain: newDomain });
    } catch (error) {
        console.error("Error adding domain:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};




export interface CloudflareAccount {
    apiKey: string;
    accountId: string;
    tunnelId: string;  // Ensure each merchant has their own tunnel ID
}

const CLOUDFLARE_API_BASE = "https://api.cloudflare.com/client/v4";

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
 * Updates Cloudflare Tunnel to route traffic for the new domain.
 * @param domain - The domain name to add to the tunnel.
 * @param cloudflareAccount - The merchant's Cloudflare account
 */
export async function updateCloudflareTunnel(domain: string, cloudflareAccount: CloudflareAccount) {
    try {
        if (!cloudflareAccount.tunnelId) {
            throw new Error("Missing Cloudflare Tunnel ID for this merchant.");
        }

        // Fetch current tunnel configuration
        const tunnelConfigUrl = `${CLOUDFLARE_API_BASE}/accounts/${cloudflareAccount.accountId}/cfd_tunnel/${cloudflareAccount.tunnelId}/configurations`;
        const response = await axios.get(tunnelConfigUrl, {
            headers: { Authorization: `Bearer ${cloudflareAccount.apiKey}` },
        });

        let ingressRules = response.data.ingress || [];

        // Avoid duplicate entries
        if (ingressRules.some((rule: any) => rule.hostname === domain)) {
            console.log(`Domain ${domain} already exists in Cloudflare Tunnel.`);
            return;
        }

        // Add new hostname mapping
        ingressRules.unshift({ hostname: domain, service: "http://nginx:80" });

        // Update Cloudflare Tunnel configuration
        await axios.put(tunnelConfigUrl, { ingress: ingressRules }, {
            headers: { Authorization: `Bearer ${cloudflareAccount.apiKey}` },
        });

        console.log(`Cloudflare Tunnel updated for domain: ${domain}`);
    } catch (error: any) {
        console.error("Error updating Cloudflare Tunnel:", error.response?.data || error.message);
        throw new Error("Failed to update Cloudflare Tunnel");
    }
}


async function addCloudflareDnsRecord(domain: string, zoneId: string, cloudflareAccount: CloudflareAccount) {
    try {
        const dnsUrl = `${CLOUDFLARE_API_BASE}/zones/${zoneId}/dns_records`;

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
