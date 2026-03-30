# Simple Dockerfile using official Playwright image
FROM mcr.microsoft.com/playwright:v1.40.0-jammy

WORKDIR /app

# Copy package files
COPY package*.json ./

# Tell Playwright to use browsers pre-installed in the Docker image
# The official Playwright Docker image installs browsers to /ms-playwright/
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright/

# Skip Playwright's browser download during npm install - use Docker image browsers
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

# Install dependencies (skip Playwright browser download since image has them)
RUN npm ci --only=production

# Remove npm-downloaded browsers and create proper directory structure
# npm expects chromium_headless_shell-1208 but Docker image has chromium-1091
# Create the expected directory structure and symlink to actual browsers
RUN rm -rf /root/.cache/ms-playwright && \
    mkdir -p /root/.cache/ms-playwright && \
    ln -s /ms-playwright/chromium-1091/chrome-linux /root/.cache/ms-playwright/chromium-1091 && \
    ln -s /ms-playwright/chromium-1091/chrome-linux /root/.cache/ms-playwright/chromium_headless_shell-1208

# Copy built application
COPY dist ./dist

# Expose port (Railway sets PORT env var)
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

# Start the server
CMD ["node", "dist/index.js"]
