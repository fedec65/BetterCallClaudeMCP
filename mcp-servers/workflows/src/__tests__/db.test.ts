import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getPool, ensureSchema, closePool } from '../db.js';

const url = process.env.WORKFLOWS_TEST_DATABASE_URL;
const run = !!url;

describe.skipIf(!run)('db (integration, needs WORKFLOWS_TEST_DATABASE_URL)', () => {
  beforeAll(async () => {
    await ensureSchema(getPool(url));
  });
  afterAll(async () => {
    const pool = getPool(url);
    await pool.query('DROP TABLE IF EXISTS workflow_runs, workflows, agents_manifest');
    await closePool();
  });

  it('creates the three tables and seeds the 16-agent manifest', async () => {
    const pool = getPool(url);
    const tables = await pool.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' ORDER BY table_name`
    );
    expect(tables.rows.map(r => r.table_name)).toEqual(
      expect.arrayContaining(['agents_manifest', 'workflows', 'workflow_runs'])
    );
    const agents = await pool.query('SELECT count(*)::int AS n FROM agents_manifest');
    expect(agents.rows[0].n).toBe(16);
  });

  it('ensureSchema is idempotent (second run keeps seed, no error)', async () => {
    await ensureSchema(getPool(url));
    const agents = await getPool(url).query('SELECT count(*)::int AS n FROM agents_manifest');
    expect(agents.rows[0].n).toBe(16);
  });
});

describe('getPool (unit)', () => {
  it('throws a clear error when DATABASE_URL is missing', async () => {
    await closePool();
    const saved = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;
    expect(() => getPool()).toThrow('DATABASE_URL');
    if (saved) process.env.DATABASE_URL = saved;
  });

  it('forces relaxed SSL for remote hosts without sslmode', async () => {
    await closePool();
    const pool = getPool('postgres://user:pass@db.example.com:5432/app');
    expect(pool.options.ssl).toEqual({ rejectUnauthorized: false });
  });

  it('honors an explicit sslmode instead of forcing SSL', async () => {
    await closePool();
    const pool = getPool('postgres://user:pass@postgres.railway.internal:5432/app?sslmode=disable');
    expect(pool.options.ssl).toBeUndefined();
  });

  it('does not set SSL for localhost', async () => {
    await closePool();
    const pool = getPool('postgres://user:pass@localhost:5432/app');
    expect(pool.options.ssl).toBeUndefined();
  });
});
