# Simple Dockerfile using official Playwright image
# v1.0.2 - Added debug logging for browser path
FROM mcr.microsoft.com/playwright:v1.40.0-jammy

WORKDIR /app

# Copy package files
COPY package*.json ./

# Skip Playwright's browser download during npm install - use Docker image browsers
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

# Install dependencies (skip Playwright browser download since image has them)
RUN npm ci --only=production

# Copy built application
COPY dist ./dist

# Expose port (Railway sets PORT env var)
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

# Start the server
CMD ["node", "dist/index.js"]
