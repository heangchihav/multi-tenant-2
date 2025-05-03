import { NextFunction, Request, Response } from "express";
import { UnauthorizedError } from "@/errors/HttpErrors";
import passport from "@/libs/authStrategies/jwtStrategy";
import jwt, { JsonWebTokenError, TokenExpiredError } from "jsonwebtoken";
import prisma from "@/libs/prisma";
import { secret } from "@/config/secret";
import { generateAccessToken } from "@/helpers/generateAccessToken";
import { generateRefreshToken } from "@/helpers/generateRefreshToken";
import { CustomJwtPayload } from "@/types/CustomJwtPayload";
import { User } from "@prisma/client";
import { extractToken } from "@/helpers/extractToken";
import { extractUserAgentDetails } from "@/helpers/extractUserAgentDetails";
import { extractUserIP } from "@/helpers/extractUserIP";

const excludedRoutes = [
  "/api/v1/auth/login",
  "/api/v1/auth/signup",
  "/api/v1/healthcheck",
  "/"
];

interface AuthInfo {
  name?: string;
  message?: string;
}

type AuthError = JsonWebTokenError | TokenExpiredError | Error | null;

/**
 * Authentication Middleware
 */
export const authMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  if (excludedRoutes.includes(req.path)) {
    console.log("Skipping authentication for:", req.path);
    return next();
  }

  const userAgent = req.headers["user-agent"] || "Unknown";
  const deviceDetails = extractUserAgentDetails(userAgent);
  const ip = extractUserIP(req);

  try {
    passport.authenticate("jwt", { session: false }, async (err: AuthError, user: User | false, info?: AuthInfo) => {
      if (err) {
        console.error("JWT verification error:", err);
        return next(new UnauthorizedError("Invalid token"));
      }

      // Extract refresh token
      let refreshToken = extractToken(req.headers.refreshtoken as string) ||
        extractToken(req.cookies?.refreshToken) ||
        extractToken(req.body?.refreshToken);

      if (!refreshToken) {
        console.error("No refresh token provided");
        return next(new UnauthorizedError("Refresh token is required"));
      }

      try {
        const decodedRefresh = jwt.verify(refreshToken, secret.refreshTokenSecret) as CustomJwtPayload;
        const userRefreshToken = await prisma.refreshToken.findUnique({ where: { id: decodedRefresh.id } });

        if (!userRefreshToken) {
          console.error("Refresh token not found in the database");
          res.clearCookie("refreshToken");
          return next(new UnauthorizedError("Invalid refresh token"));
        }

        /** ✅ CASE 1: User is already authenticated **/
        if (user) {
          console.log("User authenticated:", user.id);

          // Rotate refresh token
          const newRefreshTokenEntry = await prisma.refreshToken.create({
            data: { userId: user.id, deviceName: deviceDetails.device.model || 'unknown', deviceType: deviceDetails.device.type || 'unknown', browser: deviceDetails.browser.name || 'unknown', os: deviceDetails.os.name || 'unknown', ip }
          });

          const newRefreshToken = generateRefreshToken(newRefreshTokenEntry);
          res.cookie("refreshToken", `Bearer ${newRefreshToken}`, { httpOnly: true, secure: secret.nodeEnv === "production", sameSite: "strict" });
          res.setHeader("refreshToken", `Bearer ${newRefreshToken}`);

          // Delete old refresh token AFTER issuing the new one
          await prisma.refreshToken.delete({ where: { id: userRefreshToken.id } });

          req.user = user;
          return next();
        }

        /** ✅ CASE 2: Access token expired, so refresh it **/
        if (info?.name === "TokenExpiredError") {
          console.log("Access token expired. Refreshing tokens...");

          const newAccessToken = generateAccessToken(userRefreshToken.userId);
          const newRefreshTokenEntry = await prisma.refreshToken.create({
            data: { userId: userRefreshToken.userId, deviceName: deviceDetails.device.model || 'unknown', deviceType: deviceDetails.device.type || 'unknown', browser: deviceDetails.browser.name || 'unknown', os: deviceDetails.os.name || 'unknown', ip }
          });

          const newRefreshToken = generateRefreshToken(newRefreshTokenEntry);
          const userData = await prisma.user.findUnique({ where: { id: userRefreshToken.userId } });

          if (!userData) {
            console.error("User not found after token refresh");
            return next(new UnauthorizedError("User not found"));
          }

          // Set new tokens
          res.cookie("refreshToken", `Bearer ${newRefreshToken}`, { httpOnly: true, secure: secret.nodeEnv === "production", sameSite: "strict" });
          res.cookie("accessToken", `Bearer ${newAccessToken}`, { httpOnly: true, secure: secret.nodeEnv === "production", sameSite: "strict" });
          res.setHeader("accessToken", `Bearer ${newAccessToken}`);
          res.setHeader("refreshToken", `Bearer ${newRefreshToken}`);

          // Delete old refresh token AFTER issuing new one
          await prisma.refreshToken.delete({ where: { id: userRefreshToken.id } });

          req.user = userData;
          return next();
        }

      } catch (refreshError) {
        console.error("Refresh token verification error:", refreshError);
        res.clearCookie("refreshToken");
        return next(new UnauthorizedError("Invalid refresh token"));
      }

      console.error("JWT Authentication failed:", info);
      return next(new UnauthorizedError(info?.message || "Invalid access token"));
    })(req, res, next);

  } catch (error) {
    console.error("Authentication middleware error:", error);
    return next(error);
  }
};
