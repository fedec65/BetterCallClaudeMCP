import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import {
  getPool, ensureSchema,
  listAgents, validatePipelineTool, saveWorkflow, listWorkflows,
  getWorkflow, deleteWorkflow, logRun, claimUserId, WorkflowValidationError,
  SaveWorkflowInputSchema, ListWorkflowsInputSchema, GetWorkflowInputSchema,
  DeleteWorkflowInputSchema, LogRunInputSchema, ValidatePipelineInputSchema,
  ClaimUserIdInputSchema
} from '@workflows/index.js';

const PIPELINE_STEP = {
  type: 'object',
  properties: {
    step: { type: 'integer', minimum: 1 },
    agent_id: { type: 'string', description: 'One of the agent_ids returned by list_agents' },
    purpose: { type: 'string' },
    checkpoint: { type: 'boolean', description: 'Pause for user confirmation after this step' }
  },
  required: ['step', 'agent_id', 'purpose']
} as const;

const USER_ID = {
  type: 'string',
  description: 'Stable caller identifier (plugin user_id setting; self-asserted)'
} as const;

export function createWorkflowsChServer(): Server {
  const server = new Server(
    { name: 'workflows-ch', version: '1.1.0' },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: 'list_agents',
        description:
          'List the Swiss plugin agents available for custom workflow pipelines, with the data types each accepts as input and produces as output.',
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: { type: 'object', properties: {} }
      },
      {
        name: 'validate_pipeline',
        description:
          'Validate a workflow pipeline without saving it: checks that every agent exists in the Swiss manifest and that consecutive steps have compatible output/input types. Returns {valid, errors}.',
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
          type: 'object',
          properties: { pipeline: { type: 'array', items: PIPELINE_STEP, minItems: 1 } },
          required: ['pipeline']
        }
      },
      {
        name: 'save_workflow',
        description:
          'Validate and save (upsert on user_id+slug) a reusable custom workflow. Fails with validation errors if the pipeline is invalid.',
        annotations: { readOnlyHint: false, destructiveHint: false },
        inputSchema: {
          type: 'object',
          properties: {
            user_id: USER_ID,
            slug: { type: 'string', description: 'kebab-case identifier, unique per user' },
            name: { type: 'string' },
            description: { type: 'string' },
            pipeline: { type: 'array', items: PIPELINE_STEP, minItems: 1 },
            output_spec: { type: 'string', description: 'What the final step should produce' },
            visibility: { type: 'string', enum: ['private', 'team', 'public'], default: 'private' }
          },
          required: ['user_id', 'slug', 'name', 'description', 'pipeline', 'output_spec']
        }
      },
      {
        name: 'list_workflows',
        description:
          'List the caller\'s saved custom workflows (optionally including team/public ones).',
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
          type: 'object',
          properties: {
            user_id: USER_ID,
            include_team: { type: 'boolean', default: false },
            include_public: { type: 'boolean', default: false }
          },
          required: ['user_id']
        }
      },
      {
        name: 'get_workflow',
        description: 'Fetch the full definition of one saved workflow (own, team or public).',
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
          type: 'object',
          properties: { user_id: USER_ID, slug: { type: 'string' } },
          required: ['user_id', 'slug']
        }
      },
      {
        name: 'delete_workflow',
        description: 'Delete one of the caller\'s own workflows (owner-only).',
        annotations: { readOnlyHint: false, destructiveHint: true },
        inputSchema: {
          type: 'object',
          properties: { user_id: USER_ID, slug: { type: 'string' } },
          required: ['user_id', 'slug']
        }
      },
      {
        name: 'claim_user_id',
        description: 'Reserve a user_id namespace. Returns claimed:true if you got it, false if already taken.',
        annotations: { readOnlyHint: false, destructiveHint: false },
        inputSchema: {
          type: 'object',
          properties: { user_id: USER_ID },
          required: ['user_id']
        }
      },
      {
        name: 'log_run',
        description: 'Record a workflow execution in the audit trail (workflow_runs).',
        annotations: { readOnlyHint: false, destructiveHint: false },
        inputSchema: {
          type: 'object',
          properties: {
            workflow_id: { type: 'string', format: 'uuid' },
            user_id: USER_ID,
            status: { type: 'string', enum: ['running', 'completed', 'failed', 'abandoned'] },
            output_summary: { type: 'string' }
          },
          required: ['workflow_id', 'user_id', 'status']
        }
      }
    ]
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    try {
      // Validate arguments at the boundary BEFORE any DB access, so invalid
      // input returns a zod error envelope even when DATABASE_URL is unset.
      switch (name) {
        case 'list_agents': {
          await ensureSchema();
          const pool = getPool();
          return json(await listAgents(pool));
        }
        case 'validate_pipeline': {
          const input = ValidatePipelineInputSchema.parse(args);
          await ensureSchema();
          return json(await validatePipelineTool(getPool(), input));
        }
        case 'save_workflow': {
          const input = SaveWorkflowInputSchema.parse(args);
          await ensureSchema();
          return json(await saveWorkflow(getPool(), input));
        }
        case 'list_workflows': {
          const input = ListWorkflowsInputSchema.parse(args);
          await ensureSchema();
          return json(await listWorkflows(getPool(), input));
        }
        case 'get_workflow': {
          const input = GetWorkflowInputSchema.parse(args);
          await ensureSchema();
          const row = await getWorkflow(getPool(), input);
          if (!row) throw new Error('Workflow not found (or not visible to this user_id)');
          return json(row);
        }
        case 'delete_workflow': {
          const input = DeleteWorkflowInputSchema.parse(args);
          await ensureSchema();
          return json(await deleteWorkflow(getPool(), input));
        }
        case 'log_run': {
          const input = LogRunInputSchema.parse(args);
          await ensureSchema();
          return json(await logRun(getPool(), input));
        }
        case 'claim_user_id': {
          const input = ClaimUserIdInputSchema.parse(args);
          await ensureSchema();
          return json(await claimUserId(getPool(), input));
        }
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      const payload =
        error instanceof WorkflowValidationError
          ? { valid: false, errors: error.errors }
          : error instanceof z.ZodError
            ? { error: 'invalid_input', issues: error.issues }
            : { error: error instanceof Error ? error.message : String(error) };
      return { content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }], isError: true };
    }
  });

  return server;
}

function json(value: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }] };
}
