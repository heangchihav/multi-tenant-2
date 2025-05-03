import { Request, Response } from "express";
import { addCloudflareAccountHelper } from "@/helpers/cloudflareAccountHelper";
import { User } from "@prisma/client";

/**
 * POST /api/cloudflare
 * Allows a user to add a Cloudflare account for their merchant
 */
export const addCloudflareAccount = async (req: Request, res: Response) => {
    const { accountId, apiKey } = req.body;
    const user = req.user as User; // Ensure user is authenticated

    if (!accountId || !apiKey) {
        return res.status(400).json({ error: "Both accountId and apiKey are required." });
    }

    try {
        const cloudflareAccount = await addCloudflareAccountHelper(user, accountId, apiKey);
        return res.json({ success: true, cloudflareAccount });
    } catch (error) {
        console.error("Error adding Cloudflare account:", error);
        return res.status(400).json({ error: (error as Error).message });
    }
};
