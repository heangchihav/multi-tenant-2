# Add base image for Nginx
FROM nginx:stable

# Install inotify-tools for monitoring file changes
RUN apt-get update && apt-get install -y inotify-tools dos2unix \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Copy default configuration
COPY nginx.conf /etc/nginx/nginx.conf
COPY conf.d /etc/nginx/conf.d

# Copy and normalize entrypoint script
COPY entrypoint.sh /entrypoint.sh
RUN dos2unix /entrypoint.sh && chmod +x /entrypoint.sh

# Create directory for tenant configs
RUN mkdir -p /etc/nginx/tenant.d

ENTRYPOINT ["/entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
