import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getPool, ensureSchema, closePool } from '../db.js';
import {
  listAgents, validatePipelineTool, saveWorkflow, listWorkflows,
  getWorkflow, deleteWorkflow, logRun, WorkflowValidationError
} from '../tools.js';

const url = process.env.WORKFLOWS_TEST_DATABASE_URL;

describe.skipIf(!url)('tools (integration, needs WORKFLOWS_TEST_DATABASE_URL)', () => {
  const pool = () => getPool(url);
  const U = 'test-user-1';
  const base = {
    user_id: U,
    slug: 'it-workflow',
    name: 'IT Workflow',
    description: 'test workflow',
    pipeline: [
      { step: 1, agent_id: 'researcher', purpose: 'Recherche', checkpoint: false },
      { step: 2, agent_id: 'drafter', purpose: 'Redazione', checkpoint: true }
    ],
    output_spec: 'memo'
  };

  beforeAll(async () => { await ensureSchema(pool()); });
  afterAll(async () => {
    await pool().query('DELETE FROM workflow_runs');
    await pool().query('DELETE FROM workflows');
    await closePool();
  });

  it('listAgents returns the 16-entry manifest with types', async () => {
    const agents = await listAgents(pool());
    expect(agents).toHaveLength(16);
    const r = agents.find(a => a.agent_id === 'researcher');
    expect(r?.output_types).toContain('research_memo');
  });

  it('validatePipelineTool delegates to the pure validator', async () => {
    const ok = await validatePipelineTool(pool(), { pipeline: base.pipeline });
    expect(ok.valid).toBe(true);
    const bad = await validatePipelineTool(pool(), {
      pipeline: [{ step: 1, agent_id: 'ghost', purpose: 'x', checkpoint: false }]
    });
    expect(bad.valid).toBe(false);
    expect(bad.errors[0].code).toBe('unknown_agent');
  });

  it('saveWorkflow inserts, then upserts with version increment', async () => {
    const first = await saveWorkflow(pool(), base);
    expect(first.workflow.version).toBe(1);
    const second = await saveWorkflow(pool(), { ...base, description: 'v2', visibility: 'public' });
    expect(second.workflow.version).toBe(2);
    expect(second.workflow.description).toBe('v2');
    expect(second.workflow.id).toBe(first.workflow.id); // upsert, not new row
  });

  it('saveWorkflow rejects an invalid pipeline with WorkflowValidationError', async () => {
    await expect(
      saveWorkflow(pool(), {
        ...base, slug: 'bad-pipe',
        pipeline: [{ step: 1, agent_id: 'ghost', purpose: 'x', checkpoint: false }]
      })
    ).rejects.toBeInstanceOf(WorkflowValidationError);
  });

  it('listWorkflows scopes by user and visibility flags', async () => {
    await saveWorkflow(pool(), { ...base, slug: 'other-public', user_id: 'someone-else', visibility: 'public' });
    const mine = await listWorkflows(pool(), { user_id: U, include_team: false, include_public: false });
    expect(mine.map(w => w.slug).sort()).toEqual(['it-workflow']);
    const withPublic = await listWorkflows(pool(), { user_id: U, include_team: false, include_public: true });
    expect(withPublic.map(w => w.slug).sort()).toEqual(['it-workflow', 'other-public']);
  });

  it('getWorkflow returns own row and others public rows, not others private rows', async () => {
    await saveWorkflow(pool(), { ...base, slug: 'other-private', user_id: 'someone-else', visibility: 'private' });
    expect((await getWorkflow(pool(), { user_id: U, slug: 'it-workflow' }))?.name).toBe('IT Workflow');
    expect((await getWorkflow(pool(), { user_id: U, slug: 'other-public' }))?.visibility).toBe('public');
    expect(await getWorkflow(pool(), { user_id: U, slug: 'other-private' })).toBeNull();
  });

  it('deleteWorkflow is owner-only', async () => {
    expect((await deleteWorkflow(pool(), { user_id: 'intruder', slug: 'it-workflow' })).deleted).toBe(false);
    expect((await deleteWorkflow(pool(), { user_id: U, slug: 'it-workflow' })).deleted).toBe(true);
  });

  it('logRun inserts a run row linked to the workflow', async () => {
    const w = await saveWorkflow(pool(), base); // re-save after deletion test
    const run = await logRun(pool(), {
      workflow_id: w.workflow.id, user_id: U, status: 'completed', output_summary: 'done'
    });
    expect(run.run_id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('deleteWorkflow cascades to logged runs (ON DELETE CASCADE)', async () => {
    const w = await saveWorkflow(pool(), { ...base, slug: 'cascade-me' });
    await logRun(pool(), {
      workflow_id: w.workflow.id, user_id: U, status: 'completed', output_summary: 'run'
    });
    expect((await deleteWorkflow(pool(), { user_id: U, slug: 'cascade-me' })).deleted).toBe(true);
    const runs = await pool().query(
      'SELECT count(*)::int AS n FROM workflow_runs WHERE workflow_id = $1', [w.workflow.id]
    );
    expect(runs.rows[0].n).toBe(0);
  });
});
