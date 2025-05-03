import { Request, Response, NextFunction } from 'express';
import { HttpError } from '@/errors/HttpErrors';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import Logger from '@/config/logger';
import {
    ValidationError,
    DatabaseError,
    InternalServerError,
    NotFoundError
} from '@/errors/HttpErrors';

type AsyncRequestHandler = (req: Request, res: Response, next: NextFunction) => Promise<any>;

/**
 * Higher-order function that wraps route handlers to provide consistent error handling
 */
export const asyncErrorHandler = (handler: AsyncRequestHandler) => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            await handler(req, res, next);
        } catch (error: unknown) {
            next(error);
        }
    };
};

/**
 * Global error handler middleware
 */
export const errorHandler = (
    error: Error,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    // Log the error
    Logger.error({
        message: error.message,
        stack: error.stack,
        path: req.path,
        method: req.method,
    });

    // Handle HttpError (our custom error class)
    if (error instanceof HttpError) {
        res.status(error.statusCode).json({
            status: 'error',
            code: error.errorCode,
            message: error.message,
            errors: error.errors,
            timestamp: new Date().toISOString(),
            ...(process.env.NODE_ENV === 'development' && {
                path: req.path,
                stack: error.stack,
            }),
        });
        return; // Prevent further execution
    }

    // Handle Prisma errors
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        const dbError = new DatabaseError('Database operation failed');
        dbError.errors = (error as Prisma.PrismaClientKnownRequestError).meta
            ? [(error as Prisma.PrismaClientKnownRequestError).meta]
            : undefined;

        switch ((error as Prisma.PrismaClientKnownRequestError).code) {
            case 'P2002': // Unique constraint violation
                dbError.message = 'A record with this value already exists';
                break;
            case 'P2025': // Record not found
                dbError.message = 'Record not found';
                break;
            case 'P2003': // Foreign key constraint failed
                dbError.message = 'Related record not found';
                break;
        }

        res.status(dbError.statusCode).json({
            status: 'error',
            code: dbError.errorCode,
            message: dbError.message,
            errors: dbError.errors,
            timestamp: new Date().toISOString(),
            ...(process.env.NODE_ENV === 'development' && {
                path: req.path,
                stack: error.stack,
            }),
        });
        return; // Prevent further execution
    }

    // Handle Zod validation errors
    if (error instanceof ZodError) {
        const validationError = new ValidationError('Validation failed', error.errors);
        res.status(validationError.statusCode).json({
            status: 'error',
            code: validationError.errorCode,
            message: validationError.message,
            errors: validationError.errors,
            timestamp: new Date().toISOString(),
            ...(process.env.NODE_ENV === 'development' && {
                path: req.path,
                stack: error.stack,
            }),
        });
        return; // Prevent further execution
    }

    // Handle 404 Not Found
    if (error.message === 'Not Found') {
        const notFoundError = new NotFoundError('Resource not found');
        res.status(notFoundError.statusCode).json({
            status: 'error',
            code: notFoundError.errorCode,
            message: notFoundError.message,
            timestamp: new Date().toISOString(),
            ...(process.env.NODE_ENV === 'development' && {
                path: req.path,
                stack: error.stack,
            }),
        });
        return; // Prevent further execution
    }

    // Handle unknown errors
    const internalError = new InternalServerError('Something went wrong');
    res.status(internalError.statusCode).json({
        status: 'error',
        code: internalError.errorCode,
        message: process.env.NODE_ENV === 'development' ? error.message : internalError.message,
        timestamp: new Date().toISOString(),
        ...(process.env.NODE_ENV === 'development' && {
            path: req.path,
            stack: error.stack,
        }),
    });
    return; // Prevent further execution
};

/**
 * 404 handler middleware
 */
export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
    const error = new NotFoundError(`Cannot ${req.method} ${req.path}`);
    next(error);
};
