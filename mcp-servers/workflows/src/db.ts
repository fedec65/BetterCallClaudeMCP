import { Pool } from 'pg';
import { SCHEMA_SQL } from './sql.js';
import { AGENTS_MANIFEST } from './manifest.js';

let pool: Pool | null = null;
let schemaReady: Promise<void> | null = null;

export function getPool(connectionString?: string): Pool {
  if (!pool) {
    const cs = connectionString ?? process.env.DATABASE_URL;
    if (!cs) {
      throw new Error(
        'DATABASE_URL environment variable is not set — workflows-ch needs a Postgres connection string'
      );
    }
    // Local Postgres (dev/test containers) has no SSL; managed Postgres (Railway) requires it.
    // An explicit sslmode in the connection string wins: an `ssl` option here would
    // override it and break e.g. Railway private-network Postgres (`sslmode=disable`).
    const isLocal = /^(postgres(ql)?:\/\/)?[^@/]*@?(localhost|127\.0\.0\.1|\[::1\])(:|\/|$)/.test(cs);
    const hasSslmode = /[?&]sslmode=/.test(cs);
    pool = new Pool({
      connectionString: cs,
      max: 5,
      ssl: isLocal || hasSslmode ? undefined : { rejectUnauthorized: false }
    });
  }
  return pool;
}

/**
 * Idempotent schema + manifest seed. Memoized: runs once per process
 * (cold start), which fits the stateless per-request server model of
 * mcp-servers-http. Safe to call concurrently.
 */
export function ensureSchema(p: Pool = getPool()): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      await p.query(SCHEMA_SQL);
      for (const a of AGENTS_MANIFEST) {
        await p.query(
          `INSERT INTO agents_manifest
             (agent_id, display_name, input_types, output_types, mcp_servers, is_terminal)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (agent_id) DO NOTHING`,
          [a.agent_id, a.display_name, a.input_types, a.output_types, a.mcp_servers, a.is_terminal]
        );
      }
    })();
    schemaReady.catch(() => {
      schemaReady = null; // allow retry on next request if the DB was briefly unavailable
    });
  }
  return schemaReady;
}

/** Test teardown / hot reload: closes the pool and resets singletons. */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    schemaReady = null;
  }
}
