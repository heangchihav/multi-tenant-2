/**
 * Extracts and normalizes a Bearer token from various sources.
 */

export const extractToken = (token?: string | null): string | null => {
    if (!token || typeof token !== "string") return null;
    return token.startsWith("Bearer ") ? token.split(" ")[1] || null : token;
};
