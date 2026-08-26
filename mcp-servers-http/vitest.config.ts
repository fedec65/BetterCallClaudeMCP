import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

/**
 * Vitest resolution for the mcp-servers-src workspace aliases.
 *
 * esbuild.config.mjs declares runtime aliases like `@workflows` ->
 * `../mcp-servers/workflows/src` (added in Task 7). Vitest does not read
 * that file, so the alias is mirrored here. The trailing `.js` in
 * TypeScript ESM import specifiers (e.g. `@workflows/index.js`) is stripped
 * so Vite resolves the actual `.ts` source files.
 */
export default defineConfig({
  resolve: {
    alias: [
      {
        find: /^@workflows\/(.*)\.js$/,
        replacement: fileURLToPath(new URL('../mcp-servers/workflows/src/$1', import.meta.url)),
      },
      {
        find: /^@workflows$/,
        replacement: fileURLToPath(new URL('../mcp-servers/workflows/src/index.ts', import.meta.url)),
      },
    ],
  },
});
