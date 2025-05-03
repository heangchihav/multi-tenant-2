# Use a lightweight Node.js base image
FROM node:18-slim

# Install necessary tools
RUN apt-get update -y && apt-get install -y openssl curl && rm -rf /var/lib/apt/lists/*

# Create a non-root user
RUN groupadd -r appuser && useradd -r -g appuser -s /bin/false appuser

# Set the working directory
WORKDIR /app

# Copy package.json, package-lock.json, and tsconfig.json (needed for build)
COPY package*.json tsconfig.json ./

# Install dependencies (including Prisma Client)
RUN npm install && npm cache clean --force

# Copy the Prisma schema
COPY prisma ./prisma/

# Generate Prisma Client
RUN npx prisma generate

# Copy the rest of the application source code
COPY . .

# Build TypeScript application
RUN npm run build

# Remove development dependencies after build
RUN npm prune --production

# Ensure correct permissions for both app and home directory
RUN mkdir -p /app/logs && \
    mkdir -p /home/appuser && \
    chown -R appuser:appuser /app && \
    chown -R appuser:appuser /home/appuser && \
    chmod -R 755 /app && \
    chmod -R 755 /home/appuser

# Switch to non-root user
USER appuser

# Define healthcheck
HEALTHCHECK --interval=30s --timeout=3s \
    CMD curl -f http://localhost:3000/healthcheck || exit 1

# Expose the application's port
EXPOSE 3000

# Start the application with module-alias support
CMD ["node", "-r", "module-alias/register", "dist/server.js"]