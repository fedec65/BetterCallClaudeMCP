import type { Pool } from 'pg';
import { validatePipeline } from './validate.js';
import type { AgentManifestEntry, ValidationError, ValidationResult } from './validate.js';
import type {
  PipelineStep, Visibility,
  ValidatePipelineInput, SaveWorkflowInput, ListWorkflowsInput,
  GetWorkflowInput, DeleteWorkflowInput, LogRunInput
} from './types.js';

export interface WorkflowRow {
  id: string;
  user_id: string;
  slug: string;
  name: string;
  description: string;
  pipeline: PipelineStep[];
  output_spec: string;
  visibility: Visibility;
  status: string;
  version: number;
  created_at: string;
  updated_at: string;
}

export class WorkflowValidationError extends Error {
  constructor(public readonly errors: ValidationError[]) {
    super(`Pipeline validation failed: ${errors.map(e => e.message).join('; ')}`);
    this.name = 'WorkflowValidationError';
  }
}

export async function listAgents(pool: Pool): Promise<AgentManifestEntry[]> {
  const { rows } = await pool.query(
    `SELECT agent_id, display_name, input_types, output_types, mcp_servers, is_terminal
     FROM agents_manifest ORDER BY agent_id`
  );
  return rows;
}

export async function validatePipelineTool(
  pool: Pool,
  input: ValidatePipelineInput
): Promise<ValidationResult> {
  const manifest = await listAgents(pool);
  return validatePipeline(input.pipeline, manifest);
}

export async function saveWorkflow(
  pool: Pool,
  input: SaveWorkflowInput
): Promise<{ saved: true; workflow: WorkflowRow }> {
  const validation = await validatePipelineTool(pool, { pipeline: input.pipeline });
  if (!validation.valid) throw new WorkflowValidationError(validation.errors);
  const { rows } = await pool.query(
    `INSERT INTO workflows (user_id, slug, name, description, pipeline, output_spec, visibility)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (user_id, slug) DO UPDATE SET
       name        = EXCLUDED.name,
       description = EXCLUDED.description,
       pipeline    = EXCLUDED.pipeline,
       output_spec = EXCLUDED.output_spec,
       visibility  = EXCLUDED.visibility,
       version     = workflows.version + 1,
       updated_at  = now()
     RETURNING *`,
    [
      input.user_id, input.slug, input.name, input.description,
      JSON.stringify(input.pipeline), input.output_spec, input.visibility ?? 'private'
    ]
  );
  return { saved: true, workflow: rows[0] };
}

export async function listWorkflows(
  pool: Pool,
  input: ListWorkflowsInput
): Promise<Array<Pick<WorkflowRow, 'slug' | 'name' | 'description' | 'visibility' | 'version' | 'updated_at'>>> {
  const { rows } = await pool.query(
    `SELECT slug, name, description, visibility, version, updated_at
     FROM workflows
     WHERE status = 'active'
       AND (user_id = $1
            OR (visibility = 'team'   AND $2)
            OR (visibility = 'public' AND $3))
     ORDER BY updated_at DESC`,
    [input.user_id, input.include_team, input.include_public]
  );
  return rows;
}

export async function getWorkflow(
  pool: Pool,
  input: GetWorkflowInput
): Promise<WorkflowRow | null> {
  const { rows } = await pool.query(
    `SELECT * FROM workflows
     WHERE slug = $1 AND status != 'archived'
       AND (user_id = $2 OR visibility IN ('team', 'public'))`,
    [input.slug, input.user_id]
  );
  return rows[0] ?? null;
}

export async function deleteWorkflow(
  pool: Pool,
  input: DeleteWorkflowInput
): Promise<{ deleted: boolean }> {
  const { rowCount } = await pool.query(
    `DELETE FROM workflows WHERE user_id = $1 AND slug = $2`,
    [input.user_id, input.slug]
  );
  return { deleted: (rowCount ?? 0) > 0 };
}

export async function logRun(
  pool: Pool,
  input: LogRunInput
): Promise<{ run_id: string }> {
  const { rows } = await pool.query(
    `INSERT INTO workflow_runs (workflow_id, user_id, status, output_summary, completed_at)
     VALUES ($1, $2, $3, $4, CASE WHEN $3 = 'running' THEN NULL ELSE now() END)
     RETURNING id`,
    [input.workflow_id, input.user_id, input.status, input.output_summary ?? null]
  );
  return { run_id: rows[0].id };
}
