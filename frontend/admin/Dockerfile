# Single-stage build for development
FROM node:18-alpine

WORKDIR /app

# Install dependencies using npm
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy source files
COPY . .

# Build static site into dist at build time
RUN npx expo export --platform web --output-dir dist

# Create a script to clear the volume and copy new build on container start
RUN echo '#!/bin/sh' > /app/entrypoint.sh && \
    echo 'echo "Clearing previous build from volume..."' >> /app/entrypoint.sh && \
    echo 'rm -rf /volume-dist/* || true' >> /app/entrypoint.sh && \
    echo 'echo "Copying fresh build to volume..."' >> /app/entrypoint.sh && \
    echo 'cp -r /app/dist/* /volume-dist/' >> /app/entrypoint.sh && \
    echo 'echo "Build copied successfully!"' >> /app/entrypoint.sh && \
    echo 'tail -f /dev/null' >> /app/entrypoint.sh && \
    chmod +x /app/entrypoint.sh

# Use the entrypoint script to ensure volume is updated
CMD ["/app/entrypoint.sh"]