# Stage 1: Build the static website
FROM node:18-alpine

WORKDIR /app

# Install dependencies using npm
COPY package.json package-lock.json ./

# Install without dev dependencies
RUN npm ci --omit=dev

# Copy source files
COPY . .

# Build Expo static web
RUN npx expo export --platform web

# Keep container running to serve files
CMD ["tail", "-f", "/dev/null"]
