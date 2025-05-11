import { Request, Response, NextFunction } from 'express';
import prisma from '@/libs/prisma';

export const getTemplates = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        // Fetch all templates from the database
        const templates = await prisma.template.findMany({
            orderBy: {
                createdAt: 'desc'
            }
        });
        
        res.status(200).json({
            success: true,
            message: 'Templates retrieved successfully',
            data: templates
        });
    } catch (error) {
        // Pass the error to the error handling middleware
        next(error);
    }
};
