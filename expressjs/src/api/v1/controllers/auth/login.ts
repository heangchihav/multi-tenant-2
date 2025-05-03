import { Request, Response } from "express";
import prisma from "@/libs/prisma";
import { compareSync } from "bcryptjs";
import { BadRequestError, NotFoundError } from "@/errors/HttpErrors";
import { LoginSchema } from "@/schema/login";
import { generateAccessToken } from "@/helpers/generateAccessToken";
import { generateRefreshToken } from "@/helpers/generateRefreshToken";
import { secret } from "@/config/secret";
import { extractUserIP } from "@/helpers/extractUserIP";
import { extractUserAgentDetails } from "@/helpers/extractUserAgentDetails";

export const login = async (req: Request, res: Response) => {
  // Validate request body
  LoginSchema.parse(req.body);
  const { username, password } = req.body;

  // Find user in the database
  const foundUser = await prisma.user.findFirst({ where: { username } });

  if (!foundUser) {
    throw new NotFoundError("User not found");
  }

  // Validate password
  if (!compareSync(password, foundUser.passwordHash!)) {
    throw new BadRequestError("Incorrect password");
  }

  // Extract user device & browser details
  const userAgent = req.headers["user-agent"] || "Unknown";
  const deviceDetails = extractUserAgentDetails(userAgent);
  const deviceName = `${deviceDetails.device.model || 'unknown'} - ${deviceDetails.device.vendor || 'unknown'}`;
  const deviceType = deviceDetails.device.type || 'unknown';
  const browser = `${deviceDetails.browser.name || 'unknown'} ${deviceDetails.browser.version || ''}`;
  const os = `${deviceDetails.os.name || 'unknown'} ${deviceDetails.os.version || ''}`;
  const ip = extractUserIP(req);

  // Create refresh token entry with device details
  const refreshTokenEntry = await prisma.refreshToken.create({
    data: {
      userId: foundUser.id,
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
  return res.json({
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
};
