import { Request, Response } from "express";
import prisma from "@/libs/prisma";
import { hash } from "bcryptjs";
import { BadRequestError } from "@/errors/HttpErrors";
import { SignUpSchema } from "@/schema/signUp";
import { generateAccessToken } from "@/helpers/generateAccessToken";
import { generateRefreshToken } from "@/helpers/generateRefreshToken";
import { secret } from "@/config/secret";
import { extractUserAgentDetails } from "@/helpers/extractUserAgentDetails";
import { extractUserIP } from "@/helpers/extractUserIP";

/**
 * @method POST
 * @path /api/auth/signup
 */
export const signup = async (req: Request, res: Response) => {
  // Extract user device & browser details
  const userAgent = req.headers["user-agent"] || "Unknown";
  const deviceDetails = extractUserAgentDetails(userAgent);
  const deviceName = `${deviceDetails.device.model || 'unknown'} - ${deviceDetails.device.vendor || 'unknown'}`;
  const deviceType = deviceDetails.device.type || 'unknown';
  const browser = `${deviceDetails.browser.name || 'unknown'} ${deviceDetails.browser.version || ''}`;
  const os = `${deviceDetails.os.name || 'unknown'} ${deviceDetails.os.version || ''}`;
  const ip = extractUserIP(req);

  try {
    SignUpSchema.parse(req.body);
    const { username, password, merchantId } = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: { username: username },
    });

    if (existingUser) {
      throw new BadRequestError("Username already exists");
    }

    // Use a consistent salt rounds value and handle bcrypt more efficiently
    const SALT_ROUNDS = 10;
    const passwordHash = await hash(password, SALT_ROUNDS);

    // Create new user with transaction
    const result = await prisma.$transaction(async (prisma) => {
      const newUser = await prisma.user.create({
        data: {
          merchantId,
          username,
          passwordHash,
          role: "USER",
        },
      });

      // Create refresh token entry with device details
      const refreshTokenEntry = await prisma.refreshToken.create({
        data: {
          userId: newUser.id,
          deviceName,
          deviceType,
          browser,
          os,
          ip,
        },
      });

      // Generate JWT tokens
      const refreshToken = generateRefreshToken(refreshTokenEntry);
      const accessToken = generateAccessToken(refreshTokenEntry.userId);

      // Set tokens in secure cookies
      res.cookie("refreshToken", `Bearer ${refreshToken}`, {
        httpOnly: true,
        secure: secret.nodeEnv === "production",
        sameSite: "strict",
      });

      res.cookie("accessToken", `Bearer ${accessToken}`, {
        httpOnly: true,
        secure: secret.nodeEnv === "production",
        sameSite: "strict",
      });

      res.setHeader("accessToken", `Bearer ${accessToken}`);
      res.setHeader("refreshToken", `Bearer ${refreshToken}`);

      // Send response
      return res.status(201).json({
        success: true,
        message: "User created successfully",
        user: newUser,
        accessToken: `Bearer ${accessToken}`,
        refreshToken: `Bearer ${refreshToken}`,
        deviceInfo: {
          name: deviceName,
          type: deviceType,
          browser,
          os,
          ip,
        },
      });
    });
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    } else {
      throw new Error("An unknown error occurred");
    }
  }
};
