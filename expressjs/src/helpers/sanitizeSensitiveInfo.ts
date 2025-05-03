// Helper function to sanitize sensitive information
export const sanitizeSensitiveInfo = (
  data: Record<string, any>
): Record<string, any> => {
  const sanitizedData = { ...data };

  // List of sensitive fields to mask
  const sensitiveFields = [
    "password",
    "passwordHash",
    "secret",
    "token",
    // "accessToken",
    // "refreshToken",
    // "csrfToken",
  ];

  // Replace sensitive fields with asterisks or another placeholder
  for (const field of sensitiveFields) {
    if (sanitizedData[field]) {
      sanitizedData[field] = "****"; // Mask the sensitive data
    }
  }

  return sanitizedData;
};

