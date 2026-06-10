# Multi-stage build for the HTTP MCP aggregator.
#
# The aggregator bundles source files from sibling workspaces via path
# aliases (see esbuild.config.mjs), so the build context MUST be the repo
# root. In Railway: set Root Directory = "/" and Dockerfile Path =
# "mcp-servers-http/Dockerfile".

# ---- Stage 1: build ----
FROM node:22-slim AS build

WORKDIR /repo

# Install all workspace deps first (layer-cache friendly).
COPY package.json package-lock.json ./
COPY mcp-servers/tsconfig.json ./mcp-servers/
COPY mcp-servers-http/package.json ./mcp-servers-http/
COPY mcp-servers/bge-search/package.json ./mcp-servers/bge-search/
COPY mcp-servers/entscheidsuche/package.json ./mcp-servers/entscheidsuche/
COPY mcp-servers/fedlex-sparql/package.json ./mcp-servers/fedlex-sparql/
COPY mcp-servers/legal-citations/package.json ./mcp-servers/legal-citations/
COPY mcp-servers/legal-persona/package.json ./mcp-servers/legal-persona/
COPY mcp-servers/onlinekommentar/package.json ./mcp-servers/onlinekommentar/
COPY mcp-servers/tas-jurisprudence/package.json ./mcp-servers/tas-jurisprudence/
COPY mcp-servers/shared/package.json ./mcp-servers/shared/
COPY mcp-servers/integration-tests/package.json ./mcp-servers/integration-tests/
COPY packages/widgets-common/package.json ./packages/widgets-common/

RUN npm ci --ignore-scripts

# Copy sources.
COPY mcp-servers/ ./mcp-servers/
COPY mcp-servers-http/ ./mcp-servers-http/
COPY packages/widgets-common/ ./packages/widgets-common/

# Build widgets (generates embedded-widgets.ts consumed by the HTTP aggregator).
RUN npm run build --workspace=@bettercallclaude/widgets-common

# Build the HTTP aggregator bundle.
RUN npm run build --workspace=bettercallclaude-mcp-http

# ---- Stage 2: runtime ----
FROM node:22-slim

WORKDIR /app

# Install only the runtime deps that were marked external in the bundle
# (playwright + related). Keep dev deps out of the image.
COPY mcp-servers-http/package.json ./
RUN npm install --omit=dev --no-package-lock

COPY --from=build /repo/mcp-servers-http/dist/ ./dist/

EXPOSE 3000
CMD ["node", "dist/index.js"]
