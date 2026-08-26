import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // Integration suites share one Postgres; parallel workers race in
    // ensureSchema (CREATE TABLE IF NOT EXISTS is not concurrency-safe).
    fileParallelism: false
  }
});
