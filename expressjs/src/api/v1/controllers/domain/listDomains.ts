import { Request, Response } from "express";
import prisma from "@/libs/prisma";
import { User } from "@prisma/client";

/**
 * List all domains for the current user's merchant
 * @method GET
 * @path /api/v1/domain/list
 */
export const listDomains = async (req: Request, res: Response) => {
    try {
        const user = req.user as User;
        const userId = user?.id;

        // Validate User & Fetch Merchant
        const dbUser = await prisma.user.findUnique({
            where: { id: userId },
            include: { merchant: true },
        });

        if (!dbUser || !dbUser.merchant) {
            return res.status(400).json({ error: "Invalid user or merchant" });
        }

        // Get all domains for this merchant
        const domains = await prisma.domain.findMany({
            where: {
                cloudflareAccount: {
                    merchantId: dbUser.merchant.id
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        return res.json({
            success: true,
            domains
        });
    } catch (error) {
        console.error("Error listing domains:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};
