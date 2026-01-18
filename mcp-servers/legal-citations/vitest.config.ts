import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
  resolve: {
    alias: {
      // Allow .js imports to resolve to .ts files
    },
  },
  esbuild: {
    target: 'node18',
  },
});
