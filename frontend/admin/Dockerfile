# Stage 1: Build the static website
FROM node:18-alpine

WORKDIR /app

# Install dependencies using npm
COPY package.json package-lock.json ./

# Install without dev dependencies
RUN npm ci --omit=dev

# Copy source files
COPY . .

# Build static site into dist at build time
RUN npx expo export --platform web --output-dir dist

# Keep container alive so named volume stays populated
CMD ["tail", "-f", "/dev/null"]