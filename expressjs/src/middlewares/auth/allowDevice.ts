import { User, AllowedAccess } from "@prisma/client";
import geoip from "geoip-lite";
import { secret } from "@/config/secret";
import { NextFunction, Request, Response, RequestHandler } from "express";
import Logger from "@/config/logger";
import {
    HttpError,
    ForbiddenError,
    InternalServerError
} from "@/errors";
import { extractUserIP } from "@/helpers/extractUserIP";
import { extractUserAgentDetails } from "@/helpers/extractUserAgentDetails";
import prisma from "@/libs/prisma";

// Fetch user's access rules from `AllowedAccess`
export const fetchAllowedAccess = async (userId: number): Promise<AllowedAccess | null> => {
    return await prisma.allowedAccess.findUnique({ where: { userId } });
};

// Check if the user's IP is allowed
export const isIPAllowed = (allowedAccess: AllowedAccess | null, userIP: string): boolean => {
    if (!allowedAccess || (!allowedAccess.whitelistedIPs.length && !allowedAccess.blacklistedIPs.length)) return true;
    if (allowedAccess.whitelistedIPs.includes(userIP)) return true;
    if (allowedAccess.blacklistedIPs.includes(userIP)) return false;
    return true;
};

// Check if the user's country is allowed
export const isCountryAllowed = (allowedAccess: AllowedAccess | null, ip: string): boolean => {
    const geo = geoip.lookup(ip);

    if (!geo) {
        if (secret.nodeEnv === "development") {
            console.warn("Geo lookup failed, but bypassing country check in development mode.");
            return true;
        }
        return false;
    }

    const userCountry = geo.country;

    if (!allowedAccess || (!allowedAccess.whitelistedCountries.length && !allowedAccess.blacklistedCountries.length)) return true;
    if (allowedAccess.blacklistedCountries.includes(userCountry)) return false;
    if (allowedAccess.whitelistedCountries.includes(userCountry)) return true;

    return false;
};

// Check if the user's OS is allowed
export const isOSAllowed = (allowedAccess: AllowedAccess | null, os: any): boolean => {
    const osName = os.name;

    if (!allowedAccess || (!allowedAccess.whitelistedOS.length && !allowedAccess.blacklistedOS.length)) return true;
    if (allowedAccess.blacklistedOS.includes(osName)) return false;
    if (allowedAccess.whitelistedOS.includes(osName)) return true;

    return false;
};

// Check if the user's User Agent is allowed
export const isUserAgentAllowed = (allowedAccess: AllowedAccess | null, userAgent: string): boolean => {
    if (!allowedAccess || (!allowedAccess.whitelistedUserAgents.length && !allowedAccess.blacklistedUserAgents.length)) return true;
    if (allowedAccess.blacklistedUserAgents.includes(userAgent)) return false;
    if (allowedAccess.whitelistedUserAgents.includes(userAgent)) return true;

    return false;
};

// Middleware to enforce access rules
export const allowDeviceMiddleware: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = req.user as User;
        if (!user) {
            return next();
        }

        const userIP = extractUserIP(req);
        const userAgent = req.headers["user-agent"] || "Unknown";
        const os = extractUserAgentDetails(req.headers["user-agent"] || "Unknown").os;

        // Fetch AllowedAccess settings
        const allowedAccess = await fetchAllowedAccess(user.id);

        Logger.info({
            message: "Device validation attempt",
            data: {
                userId: user.id,
                ip: userIP,
                userAgent: userAgent,
                os: os.name,
            },
        });

        // IP validation
        if (!isIPAllowed(allowedAccess, userIP)) {
            Logger.warn({
                message: "IP access denied",
                data: {
                    userId: user.id,
                    ip: userIP,
                    whitelisted: allowedAccess?.whitelistedIPs || [],
                    blacklisted: allowedAccess?.blacklistedIPs || [],
                },
            });

            throw new ForbiddenError(`Access denied: IP ${userIP} is ${allowedAccess?.whitelistedIPs.length ? "not in whitelist" : "in blacklist"}`);
        }

        // Country validation
        if (!isCountryAllowed(allowedAccess, userIP)) {
            const geo = geoip.lookup(userIP);
            Logger.warn({
                message: "Country access denied",
                data: {
                    userId: user.id,
                    ip: userIP,
                    country: geo?.country,
                    whitelisted: allowedAccess?.whitelistedCountries || [],
                    blacklisted: allowedAccess?.blacklistedCountries || [],
                },
            });

            throw new ForbiddenError(`Access denied: Country ${geo?.country || "Unknown"} is ${allowedAccess?.whitelistedCountries.length ? "not in whitelist" : "in blacklist"}`);
        }

        // User Agent validation
        if (!isUserAgentAllowed(allowedAccess, userAgent)) {
            Logger.warn({
                message: "User agent access denied",
                data: {
                    userId: user.id,
                    userAgent: userAgent,
                    whitelisted: allowedAccess?.whitelistedUserAgents || [],
                    blacklisted: allowedAccess?.blacklistedUserAgents || [],
                },
            });

            throw new ForbiddenError(`Access denied: Browser ${userAgent} is ${allowedAccess?.whitelistedUserAgents.length ? "not in whitelist" : "in blacklist"}`);
        }

        // OS validation
        if (!isOSAllowed(allowedAccess, os)) {
            Logger.warn({
                message: "OS access denied",
                data: {
                    userId: user.id,
                    os: os.name,
                    whitelisted: allowedAccess?.whitelistedOS || [],
                    blacklisted: allowedAccess?.blacklistedOS || [],
                },
            });

            throw new ForbiddenError(`Access denied: Operating system ${os.name} is ${allowedAccess?.whitelistedOS.length ? "not in whitelist" : "in blacklist"}`);
        }

        Logger.info({
            message: "Device validation successful",
            data: {
                userId: user.id,
                ip: userIP,
                userAgent: userAgent,
                os: os.name,
            },
        });

        next();
    } catch (error) {
        if (error instanceof HttpError) {
            return next(error);
        }

        Logger.error({
            message: "Unexpected error in device validation",
            error: error instanceof Error ? error.message : "Unknown error",
            stack: error instanceof Error ? error.stack : undefined,
        });

        return next(new InternalServerError("An unexpected error occurred during device validation"));
    }
};
