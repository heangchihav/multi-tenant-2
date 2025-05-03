import { Request, Response, NextFunction } from "express";
import Logger from "@/config/logger";
import { extractUserIP } from "@/helpers/extractUserIP";
import { extractUserAgentDetails } from "@/helpers/extractUserAgentDetails";
import { sanitizeSensitiveInfo } from "@/helpers/sanitizeSensitiveInfo";
import { v4 as uuidv4 } from 'uuid';
// Middleware for logging device info
export const logRequest = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {

        // Get request ID from cookie or header or generate new one
        const requestId = req.cookies['x-request-id'] || req.headers['x-request-id'] || uuidv4();

        // Set request ID cookie if not exists
        if (!req.cookies['x-request-id']) {
            res.cookie('x-request-id', requestId, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict'
            });
        }
        // Add request ID to response headers
        res.setHeader('X-Request-ID', requestId);
        const startTime = process.hrtime();
        const user = (req as any).user;
        const userAgent = req.headers["user-agent"] || "Unknown";
        const userIP = extractUserIP(req);
        const { device, os, browser } = extractUserAgentDetails(userAgent);
        const { latitude, longitude } = req.query;
        const requestedRoute = req.originalUrl || req.url || "Unknown";
        const method = req.method;
        let statusCode: number;
        let responseBody: string = "No response body"; // Default value
        // Sanitize headers
        const sanitizedHeaders: Record<string, string> = {};
        const sensitiveHeaders = new Set(['authorization', 'cookie', 'x-api-key']);

        Object.entries(req.headers).forEach(([key, value]) => {
            if (typeof key === "string") {
                // Convert undefined or non-string values into a string
                const headerValue = value !== undefined
                    ? Array.isArray(value)
                        ? value[0] || "" // Use the first array element or an empty string
                        : String(value)  // Convert to string
                    : ""; // Default to an empty string if undefined

                // Assign to sanitizedHeaders while handling sensitive headers
                sanitizedHeaders[key] = sensitiveHeaders.has(key.toLowerCase())
                    ? "[REDACTED]"
                    : headerValue;
            }
        });

        // Override the response send method to capture the response body
        const originalSend = res.send.bind(res);
        res.send = function (this: Response, body: any) {
            statusCode = res.statusCode;
            try {
                if (typeof body === "string") {
                    const bodyObj = JSON.parse(body);
                    responseBody = JSON.stringify(sanitizeSensitiveInfo(bodyObj));
                } else {
                    responseBody = JSON.stringify(sanitizeSensitiveInfo(body));
                }
            } catch (error) {
                Logger.error("Error sanitizing response body:", error);
            }

            // Call the original send method and return its result
            return originalSend(body); // Return the result of the original send
        };

        // Log the request and response details after the response is finished
        res.on("finish", () => {
            try {
                const [seconds, nanoseconds] = process.hrtime(startTime);
                const duration = seconds * 1000 + nanoseconds / 1000000; // Convert to milliseconds
                const logData = {
                    type: "express_request",
                    request_id: requestId,
                    service: "expressjs",
                    timestamp: new Date().toISOString(),
                    duration_ms: duration,
                    request: {
                        method,
                        path: requestedRoute,
                        headers: sanitizedHeaders,
                        body: JSON.stringify(sanitizeSensitiveInfo(req.body)) || "No request body",
                        query_params: req.query
                    },
                    response: {
                        status_code: statusCode || 500,
                        body: responseBody
                    },
                    client: {
                        ip: userIP,
                        user_agent: userAgent,
                        device,
                        os,
                        browser,
                        geo: {
                            latitude: latitude ? parseFloat(latitude as string) : undefined,
                            longitude: longitude ? parseFloat(longitude as string) : undefined
                        }
                    },
                    user: {
                        id: user?.id || "Unauthenticated",
                        roles: user?.roles || []
                    },
                    performance: {
                        duration_ms: duration,
                        slow_request: duration > 1000 // Flag requests taking more than 1 second
                    }
                };

                // Store log data for the LogForwarder middleware
                res.locals.logData = logData;

                // Also log locally
                Logger.info(logData);
            } catch (error) {
                Logger.error("Error capturing user device information:", error);
            }
        });
        // Proceed to the next middleware if all checks pass
        next();
    } catch (error) {
        Logger.error("Error in logRequest", error);
        next(error);
    }
};
