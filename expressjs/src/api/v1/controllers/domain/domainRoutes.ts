import { Request, Response } from "express";
import prisma from "@/libs/prisma";
import { User } from "@prisma/client";
import {
    registerDomainWithCloudflare,
    updateCloudflareTunnel,
    addCloudflareDnsRecord,
    CloudflareAccount,
} from "@/helpers/cloudflareHelper";

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
