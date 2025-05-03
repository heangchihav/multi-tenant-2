import { Strategy as JwtStrategy, ExtractJwt, StrategyOptions } from "passport-jwt";
import passport from "passport";
import prisma from "@/libs/prisma";
import { secret } from "@/config/secret";
import { CustomJwtPayload } from "@/types/CustomJwtPayload";
import { Request } from "express";
import { extractToken } from "@/helpers/extractToken";

/**
 * Custom Token Extractor Function
 * - Extracts token from multiple sources: Headers, Cookies, Body
 */
const extractJwtToken = (req: Request): string | null => {
    return (
        ExtractJwt.fromAuthHeaderAsBearerToken()(req) ||
        extractToken(req.cookies?.accessToken) ||
        extractToken(req.body?.accessToken) ||
        extractToken(req.headers?.accessToken as string)
    );
};

/**
 * Passport JWT Strategy Options
 */
const jwtOptions: StrategyOptions = {
    jwtFromRequest: extractJwtToken,
    secretOrKey: secret.accessTokenSecret,
};

/**
 * Passport JWT Strategy
 */
passport.use(
    new JwtStrategy(jwtOptions, async (jwtPayload: CustomJwtPayload, done) => {
        try {
            const userId = jwtPayload.userId;

            // Ensure userId is a valid number before querying database
            if (!userId || typeof userId !== "number") {
                console.warn("Invalid JWT payload: Missing or incorrect userId", jwtPayload);
                return done(null, false, { message: "Invalid token payload" });
            }

            // Fetch user from database
            const user = await prisma.user.findUnique({ where: { id: userId } });

            if (!user) {
                console.warn("User not found for given token userId:", userId);
                return done(null, false, { message: "User not found" });
            }

            return done(null, user);
        } catch (error) {
            console.error("Error in Passport-JWT strategy:", error);
            return done(new Error("Internal server error"), false);
        }
    })
);

export default passport;
