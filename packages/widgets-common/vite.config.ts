import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { resolve } from 'path';

// Build a single widget at a time via WIDGET env var.
// Usage: WIDGET=jurisprudence-browser vite build
const widget = process.env.WIDGET || 'jurisprudence-browser';

export default defineConfig({
  plugins: [viteSingleFile()],
  root: resolve(__dirname, `src/widgets/${widget}`),
  build: {
    outDir: resolve(__dirname, `dist/${widget}`),
    emptyOutDir: true,
  },
});
