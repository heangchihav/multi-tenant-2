import { Request, Response } from 'express';
import prisma from '@/libs/prisma';
import { UnauthorizedError } from '@/errors/HttpErrors';
import { User } from '@prisma/client';

export const logout = async (req: Request, res: Response) => {
    const user = req.user as User;
    if (!user) {
        throw new UnauthorizedError('Not authenticated');
    }

    // Delete refresh token from database
    await prisma.refreshToken.deleteMany({
        where: {
            userId: user.id
        }
    });

    // Clear refresh token cookie if it exists
    res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
    });

    res.status(200).json({
        success: true,
        message: 'Logged out successfully'
    });
};