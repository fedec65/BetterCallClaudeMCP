FROM node:22-slim
WORKDIR /app

# Install runtime deps that were marked external in the esbuild bundle
# (playwright + its internal packages). Keeping dev deps out of the image.
COPY package.json ./
RUN npm install --omit=dev --no-package-lock

COPY dist/ ./dist/

EXPOSE 3000
CMD ["node", "dist/index.js"]
