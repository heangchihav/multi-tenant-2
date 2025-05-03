export enum ErrorCode {
    // Authentication & Authorization
    UNAUTHORIZED = 'UNAUTHORIZED',
    FORBIDDEN = 'FORBIDDEN',
    INVALID_TOKEN = 'INVALID_TOKEN',
    TOKEN_EXPIRED = 'TOKEN_EXPIRED',
    USER_NOT_FOUND = 'USER_NOT_FOUND',
    INCORRECT_PASSWORD = 'INCORRECT_PASSWORD',
    USERNAME_EXISTS = 'USERNAME_EXISTS',
    
    // Resource Errors
    NOT_FOUND = 'NOT_FOUND',
    DUPLICATE_ENTRY = 'DUPLICATE_ENTRY',
    VALIDATION_ERROR = 'VALIDATION_ERROR',
    UNPROCESSABLE_ENTITY = 'UNPROCESSABLE_ENTITY',
    BAD_REQUEST = 'BAD_REQUEST',
    
    // Server Errors
    INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
    INTERNAL_ERROR = 'INTERNAL_ERROR',
    DATABASE_ERROR = 'DATABASE_ERROR',
    SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
    
    // Rate Limiting
    TOO_MANY_REQUESTS = 'TOO_MANY_REQUESTS',
    
    // Security
    CSRF_TOKEN_MISSING = 'CSRF_TOKEN_MISSING',
    CSRF_TOKEN_INVALID = 'CSRF_TOKEN_INVALID',
    SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY'
}

export interface ErrorResponse {
    message: string;
    errorCode: ErrorCode;
    statusCode: number;
    errors?: any;
    timestamp: string;
    path?: string;
    stack?: string;
}
