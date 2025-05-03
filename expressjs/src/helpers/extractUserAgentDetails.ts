import { UAParser } from "ua-parser-js";

// Extract user agent details (device, OS, browser)
export const extractUserAgentDetails = (userAgent: string) => {
  const parser = new UAParser(userAgent);
  const device = parser.getDevice();
  const os = parser.getOS();
  const browser = parser.getBrowser();

  return {
    os,
    browser,
    device
  };
};
