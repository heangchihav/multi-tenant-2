#!/bin/bash
set -e

# Create necessary directories
mkdir -p /var/run/nginx

# Start Nginx in the foreground in a separate process
nginx -g "daemon off;" &
NGINX_PID=$!

# Save PID to file for proper reloading
echo $NGINX_PID > /var/run/nginx/nginx.pid

echo "Nginx started with PID: $NGINX_PID"
echo "Watching for changes in /etc/nginx/tenant.d"

# Monitor the tenant.d directory for changes
while true; do
  # Wait for file system events in the tenant.d directory
  inotifywait -e create,modify,delete,move -r /etc/nginx/tenant.d
  
  echo "Configuration change detected, reloading Nginx..."
  # Use the PID we saved
  nginx -s reload
  
  # Small delay to avoid excessive reloads
  sleep 1
done

# Keep the script running
wait $NGINX_PID
