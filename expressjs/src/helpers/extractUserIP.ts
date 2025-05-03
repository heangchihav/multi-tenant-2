import { Request } from "express";
import requestIp from "request-ip";

// Extract user IP from the request
export const extractUserIP = (req: Request): string => {
  const clientIp = requestIp.getClientIp(req);
  const forwardedFor = req.headers["x-forwarded-for"];

  // Ensure forwardedFor is a string before calling split and trim
  let forwardedIp: string | undefined;
  if (typeof forwardedFor === "string") {
    forwardedIp = forwardedFor.split(",")[0]?.trim() || undefined;
  }

  return clientIp || forwardedIp || req.socket.remoteAddress || "";
};
