import { Request, Response, NextFunction } from 'express';
import prisma from '@/libs/prisma';
import { z } from 'zod';

// Define validation schema for template creation
const templateSchema = z.object({
    name: z.string().min(1, 'Template name is required').max(100),
    label: z.string().min(1, 'Template label is required').max(100)
});

export const addTemplate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        // Validate request body
        const validatedData = templateSchema.parse(req.body);
        const { name, label } = validatedData;
        
        // Check if template with the same name already exists
        const existingTemplate = await prisma.template.findUnique({
            where: { name }
        });
        
        if (existingTemplate) {
            res.status(400).json({
                success: false,
                message: `Template with name '${name}' already exists`
            });
            return;
        }
        
        // Create new template
        const newTemplate = await prisma.template.create({
            data: {
                name,
                label
            }
        });
        
        res.status(201).json({
            success: true,
            message: 'Template created successfully',
            data: newTemplate
        });
    } catch (error) {
        // Pass the error to the error handling middleware
        next(error);
    }
}