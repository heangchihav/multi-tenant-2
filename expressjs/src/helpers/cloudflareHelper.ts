import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

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

/**
 * Creates a CNAME DNS record in Cloudflare.
 * @param domain - The domain to add the CNAME record for.
 * @param zoneId - The Cloudflare Zone ID.
 * @param cloudflareAccount - The merchant's Cloudflare account
 */
export async function addCloudflareDnsRecord(domain: string, zoneId: string, cloudflareAccount: CloudflareAccount) {
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
