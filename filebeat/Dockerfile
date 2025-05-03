FROM docker.elastic.co/beats/filebeat:8.11.1

USER root

# Create necessary directories
RUN mkdir -p /usr/share/filebeat/logs /usr/share/filebeat/config/certs

# Copy Filebeat configuration
COPY ./config/filebeat.yml /usr/share/filebeat/filebeat.yml

# Set permissions
RUN chown root:root /usr/share/filebeat/filebeat.yml && \
    chmod go-w /usr/share/filebeat/filebeat.yml && \
    mkdir -p /app/fastapi/logs && \
    chown -R root:root /app/fastapi/logs && \
    chmod -R go-w /app/fastapi/logs

# Set data directory permissions
RUN mkdir -p /usr/share/filebeat/data && \
    chown -R root:root /usr/share/filebeat/data && \
    chmod -R 0750 /usr/share/filebeat/data

# Set logs directory permissions
RUN chown -R root:root /usr/share/filebeat/logs && \
    chmod -R 0750 /usr/share/filebeat/logs

USER filebeat

HEALTHCHECK --interval=30s --timeout=3s --start-period=1m CMD filebeat test config && filebeat test output
