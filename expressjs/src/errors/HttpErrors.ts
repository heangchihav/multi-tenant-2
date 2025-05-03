import { ErrorCode } from '@/errors/ErrorTypes';

// Base HTTP Error class
export class HttpError extends Error {
    public statusCode: number;
    public errorCode: ErrorCode;
    public errors?: any[];

    constructor(
        statusCode: number,
        errorCode: ErrorCode,
        message: string,
        errors?: any[]
    ) {
        super(message);
        this.name = this.constructor.name;
        this.statusCode = statusCode;
        this.errorCode = errorCode;
        this.errors = errors;
        Error.captureStackTrace(this, this.constructor);
    }

    toJSON() {
        return {
            statusCode: this.statusCode,
            errorCode: this.errorCode,
            message: this.message,
            errors: this.errors,
        };
    }
}

// 4xx Client Errors
export class BadRequestError extends HttpError {
    constructor(message: string = 'Bad Request', errors?: any[]) {
        super(400, ErrorCode.BAD_REQUEST, message, errors);
    }
}

export class UnauthorizedError extends HttpError {
    constructor(message: string = 'Unauthorized') {
        super(401, ErrorCode.UNAUTHORIZED, message);
    }
}

export class ForbiddenError extends HttpError {
    constructor(message: string = 'Forbidden') {
        super(403, ErrorCode.FORBIDDEN, message);
    }
}

export class NotFoundError extends HttpError {
    constructor(message: string = 'Resource not found') {
        super(404, ErrorCode.NOT_FOUND, message);
    }
}

export class ConflictError extends HttpError {
    constructor(message: string = 'Resource conflict') {
        super(409, ErrorCode.DUPLICATE_ENTRY, message);
    }
}

export class ValidationError extends HttpError {
    constructor(message: string = 'Validation failed', errors?: any[]) {
        super(422, ErrorCode.VALIDATION_ERROR, message, errors);
    }
}

export class TooManyRequestsError extends HttpError {
    constructor(message: string = 'Too many requests') {
        super(429, ErrorCode.TOO_MANY_REQUESTS, message);
    }
}

// 5xx Server Errors
export class InternalServerError extends HttpError {
    constructor(message: string = 'Internal server error') {
        super(500, ErrorCode.INTERNAL_SERVER_ERROR, message);
    }
}

export class DatabaseError extends HttpError {
    constructor(message: string = 'Database operation failed', errors?: any[]) {
        super(500, ErrorCode.DATABASE_ERROR, message, errors);
    }
}

export class ServiceUnavailableError extends HttpError {
    constructor(message: string = 'Service unavailable') {
        super(503, ErrorCode.SERVICE_UNAVAILABLE, message);
    }
}

// Security Errors
export class CsrfError extends HttpError {
    constructor(message: string = 'CSRF token validation failed') {
        super(403, ErrorCode.CSRF_TOKEN_INVALID, message);
    }
}
