# TAS/CAS Jurisprudence - plain Node runtime.
#
# The previous scrape-based implementation required a Chromium browser
# (Playwright image base). The rewrite uses the public JSON API at
# jurisprudence.tas-cas.org, so a slim Node image is sufficient.
FROM node:22-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY dist ./dist

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

CMD ["node", "dist/index.js"]
