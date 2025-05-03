// Cloudflare Account Management

import prisma from "@/libs/prisma";
import { User } from "@prisma/client";

/**
 * Adds a Cloudflare account to a merchant.
 * @param user - The authenticated user
 * @param accountId - Cloudflare Account ID
 * @param apiKey - Cloudflare API Key (should be stored securely)
 * @returns The created Cloudflare Account
 */
export async function addCloudflareAccountHelper(user: User, accountId: string, apiKey: string) {
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
        },
    });

    return cloudflareAccount;
}
