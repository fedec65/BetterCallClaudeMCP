import { build } from 'esbuild';
import { existsSync } from 'fs';
import { resolve, dirname } from 'path';

/**
 * Plugin: resolve .js imports to .ts source files.
 *
 * TypeScript ESM convention uses `.js` extensions in import specifiers
 * (e.g. `import { Foo } from './foo.js'`) which reference the compiled output.
 * When bundling from TypeScript source, esbuild needs to find the actual `.ts` files.
 *
 * This plugin intercepts `.js` imports that point into `mcp-servers-src/` and
 * rewrites them to `.ts` if the `.ts` file exists.
 */
const tsResolvePlugin = {
  name: 'ts-resolve',
  setup(build) {
    build.onResolve({ filter: /\.js$/ }, (args) => {
      // Only handle relative imports
      if (!args.path.startsWith('.') && !args.path.startsWith('/')) return null;

      const resolvedDir = args.resolveDir;
      if (!resolvedDir) return null;

      const fullPath = resolve(resolvedDir, args.path);

      // Only rewrite if the .js file doesn't exist but a .ts file does
      if (!existsSync(fullPath)) {
        const tsPath = fullPath.replace(/\.js$/, '.ts');
        if (existsSync(tsPath)) {
          return { path: tsPath };
        }
      }
      return null;
    });
  },
};

await build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'esm',
  outfile: 'dist/index.js',
  sourcemap: true,
  minify: false,
  // Keep heavy native/optional-dep packages out of the bundle so esbuild
  // doesn't have to resolve dynamic requires. The tas-jurisprudence rewrite
  // no longer needs playwright at runtime, so the externals list is
  // currently empty.
  external: [],
  plugins: [tsResolvePlugin],
  banner: {
    js: `
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
`.trim(),
  },
  alias: {
    '@legal-citations': '../mcp-servers/legal-citations/src',
    '@onlinekommentar': '../mcp-servers/onlinekommentar/src',
    '@fedlex-sparql': '../mcp-servers/fedlex-sparql/src',
    '@legal-persona': '../mcp-servers/legal-persona/src',
    '@tas-jurisprudence': '../mcp-servers/tas-jurisprudence/src',
  },
});

console.log('Build complete: dist/index.js');
