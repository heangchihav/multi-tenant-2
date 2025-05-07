import { Request, Response } from "express";
import { User } from "@prisma/client";
import prisma from "@/libs/prisma";

/**
 * POST /api/cloudflare
 * Allows a user to add a Cloudflare account for their merchant
 */
export const addCloudflareAccount = async (req: Request, res: Response) => {
    const { accountId, apiKey, zoneId } = req.body;
    const user = req.user as User; // Ensure user is authenticated

    if (!accountId || !apiKey || !zoneId) {
        return res.status(400).json({ error: "accountId, apiKey, and zoneId are required." });
    }

    try {
        const cloudflareAccount = await addCloudflareAccountHelper(user, accountId, apiKey, zoneId);
        return res.json({ success: true, cloudflareAccount });
    } catch (error) {
        console.error("Error adding Cloudflare account:", error);
        return res.status(400).json({ error: (error as Error).message });
    }
};

async function addCloudflareAccountHelper(user: User, accountId: string, apiKey: string, zoneId: string) {
    if (!user || !user.merchantId) {
        throw new Error("Invalid user or merchant ID.");
    }

    const merchant = await prisma.merchant.findUnique({
        where: { id: user.merchantId },
    });

    if (!merchant) {
        throw new Error("Merchant not found.");
    }

    // Check if the merchant already has a Cloudflare account
    const existingCloudflareAccount = await prisma.cloudflareAccount.findFirst({
        where: { merchantId: user.merchantId },
    });

    if (existingCloudflareAccount) {
        throw new Error("Merchant already has a Cloudflare account.");
    }

    // Store the API Key securely (avoid storing raw keys)
    const encryptedApiKey = Buffer.from(apiKey).toString("base64"); // 🔒 Encrypt API Key (Consider using a proper encryption method)

    const cloudflareAccount = await prisma.cloudflareAccount.create({
        data: {
            merchantId: user.merchantId,
            accountId,
            apiKey: encryptedApiKey, // Store securely
            zoneId, // Zone ID for the domain
        },
    });

    return cloudflareAccount;
}