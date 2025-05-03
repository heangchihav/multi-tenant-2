import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError } from '@/errors/HttpErrors';
import { User } from '@prisma/client';

export const adminMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as User;
    if (user.role == 'ADMIN') {
        next();
    }
    else {
        next(new UnauthorizedError('Admin access required'));
    }
};
