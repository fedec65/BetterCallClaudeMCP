# Multi-stage build for Railway
# Stage 1: Install dependencies andFROM node:20-bookworm AS builder

WORKDIR /app

# Copy package files
COPY mcp-servers/tas-jurisprudence/package*.json ./

# Install all dependencies
RUN npm ci

# Stage 2: Copy built files andFROM node:20-bookworm AS runner

WORKDIR /app

# Copy built files
COPY mcp-servers/tas-jurisprudence/dist ./dist

# Install Playwright browsers
RUN npx playwright install chromium --with-deps

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# Expose port
EXPOSE 8080

# Set environment
ENV NODE_ENV=production
ENV PORT=8080

# Start the server
CMD ["npm", "start"]
