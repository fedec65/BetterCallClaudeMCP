# Multi-stage build for Railway
# Stage 1: Build the application
FROM node:20-bookworm AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY src ./src

# Build TypeScript
RUN npm run build

# Stage 2: Production image with Playwright
FROM node:20-bookworm AS runner

WORKDIR /app

# Copy package files
COPY package*.json ./

# Copy built files
COPY --from=builder /app/dist ./dist

# Install only production dependencies
RUN npm ci --only=production

# Install curl for health checks and Playwright browsers with dependencies
RUN apt-get update && apt-get install -y curl && \
    npx playwright install chromium --with-deps && \
    rm -rf /var/lib/apt/lists/*

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
