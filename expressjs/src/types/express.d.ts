import { User } from "@prisma/client";
import express from "express";

declare global {
  namespace Express {
    export interface Request {
      user?: User;
      userInfo?: {
        ipAddress: string;
        userAgent: string;
        latitude?: number;
        longitude?: number;
        // Add other fields as necessary
      };
    }
    export interface AuthInfo {
      accessToken?: string;
      refreshToken?: string;
    }
  }
}
