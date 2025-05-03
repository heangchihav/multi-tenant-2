import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { secret } from "@/config/secret";
import { UnauthorizedError } from "@/errors/HttpErrors";

const CSRF_TOKEN_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours
const CSRF_COOKIE_NAME = "CSRF-TOKEN";
const CSRF_HEADER_NAME = "X-CSRF-TOKEN";
const HMAC_SECRET = secret.csrfSecret || "supersecrethmackey";  // Replace with a strong secret


// Extend the Session interface to include our CSRF token
declare module "express-session" {
    interface SessionData {
        csrfToken?: string;
        csrfTokenSignature?: string;
    }
}
// Generate a random CSRF token
const generateCsrfToken = (): string => {
    return crypto.randomBytes(32).toString("hex");
};

// Generate an HMAC signature for a given token
const signToken = (token: string): string => {
    return crypto.createHmac("sha256", HMAC_SECRET).update(token).digest("hex");
};

// Helper function to set CSRF token in response
const setCsrfToken = (req: Request, res: Response, csrfToken: string, sendJson: boolean = true): void => {
    // Store original token and HMAC signature in session
    if (req.session) {
        req.session.csrfToken = csrfToken;
        req.session.csrfTokenSignature = signToken(csrfToken);
    }

    // Set CSRF token as a cookie
    res.cookie(CSRF_COOKIE_NAME, csrfToken, {
        httpOnly: true,
        secure: secret.nodeEnv === "production",
        sameSite: "strict",
        maxAge: CSRF_TOKEN_EXPIRY
    });

    // Send CSRF token in a custom header
    res.setHeader(CSRF_HEADER_NAME, csrfToken);

    if (sendJson) {
        res.json({ csrfToken });
    }
};

// Middleware for CSRF protection
export const csrfMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    try {
        if (!req.session) {
            console.warn("Session not available!");
            return next(new UnauthorizedError("Session not available"));
        }

        const sessionToken = req.session.csrfToken;
        const sessionSignature = req.session.csrfTokenSignature;
        const csrfCookie = req.cookies?.[CSRF_COOKIE_NAME];
        const csrfHeader = req.headers[CSRF_HEADER_NAME.toLowerCase()] as string;
        const csrfBody = req.body?.csrfToken;  // Check token in body for JSON APIs

        // Automatically generate a new token if none exists in session
        if (!sessionToken || !sessionSignature) {
            const newToken = generateCsrfToken();
            setCsrfToken(req, res, newToken, false);  // Set token silently without JSON response
            console.log("Generated new CSRF token for first-time request.");
        }

        // Update session token variables if they were just set
        const currentToken = req.session.csrfToken!;
        const currentSignature = req.session.csrfTokenSignature!;

        // Validate token for non-GET requests
        if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method.toUpperCase())) {
            console.log("CSRF Header:", csrfHeader);
            console.log("CSRF Cookie:", csrfCookie);
            console.log("CSRF Body:", csrfBody);
            console.log("Expected Token (from session):", currentToken);

            // Check token in this order: Header > Body > Cookie > Session (for first-time requests)
            const tokenToValidate = csrfHeader || csrfBody || csrfCookie || currentToken;

            if (!tokenToValidate || tokenToValidate !== currentToken) {
                console.warn("Invalid CSRF token detected!");
                return next(new UnauthorizedError("Invalid CSRF token"));
            }

            // Validate the HMAC signature of the token
            if (signToken(currentToken) !== currentSignature) {
                console.warn("Invalid CSRF token signature!");
                return next(new UnauthorizedError("Invalid CSRF token"));
            }

            // Refresh token silently if valid
            setCsrfToken(req, res, currentToken, false);
            return next();
        }

        // Ensure CSRF cookie is set for GET requests
        if (!req.cookies?.[CSRF_COOKIE_NAME] && currentToken) {
            setCsrfToken(req, res, currentToken, false);
        }

        return next();
    } catch (error) {
        console.error("CSRF Middleware Error:", error);
        return next(new UnauthorizedError("CSRF protection error"));
    }
};
