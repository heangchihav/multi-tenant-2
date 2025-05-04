FROM nginx:latest

# Install inotify-tools for monitoring file changes
RUN apt-get update && apt-get install -y inotify-tools && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Copy default configuration
COPY nginx.conf /etc/nginx/nginx.conf
COPY conf.d /etc/nginx/conf.d

# Create directory for tenant configs
RUN mkdir -p /etc/nginx/tenant.d

# Set up entrypoint script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
