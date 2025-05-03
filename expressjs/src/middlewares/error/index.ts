import { ErrorRequestHandler, RequestHandler } from 'express';
import { errorHandler, asyncErrorHandler, notFoundHandler } from '@/middlewares/error/ErrorMiddleware';

export const errorHandlerMiddleware: ErrorRequestHandler = errorHandler;
export const asyncErrorHandlerMiddleware = asyncErrorHandler;
export const notFoundHandlerMiddleware: RequestHandler = notFoundHandler;