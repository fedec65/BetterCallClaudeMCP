import { z } from 'zod';

export const PipelineStepSchema = z.object({
  step: z.number().int().positive(),
  agent_id: z.string().min(1),
  purpose: z.string().min(1).max(500),
  checkpoint: z.boolean().default(false)
});
export type PipelineStep = z.infer<typeof PipelineStepSchema>;

export const PipelineSchema = z.array(PipelineStepSchema).min(1);

export const VisibilitySchema = z.enum(['private', 'team', 'public']);
export type Visibility = z.infer<typeof VisibilitySchema>;

export const UserIdSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9._@-]+$/, 'user_id may contain letters, digits, dot, underscore, dash and @');

export const SlugSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9][a-z0-9-]*$/, 'slug must be kebab-case (lowercase letters, digits, dashes)');

export const ValidatePipelineInputSchema = z.object({
  pipeline: PipelineSchema
});
export type ValidatePipelineInput = z.infer<typeof ValidatePipelineInputSchema>;

export const SaveWorkflowInputSchema = z.object({
  user_id: UserIdSchema,
  slug: SlugSchema,
  name: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  pipeline: PipelineSchema,
  output_spec: z.string().min(1).max(2000),
  visibility: VisibilitySchema.default('private')
});
export type SaveWorkflowInput = z.infer<typeof SaveWorkflowInputSchema>;

export const ListWorkflowsInputSchema = z.object({
  user_id: UserIdSchema,
  include_team: z.boolean().default(false),
  include_public: z.boolean().default(false)
});
export type ListWorkflowsInput = z.infer<typeof ListWorkflowsInputSchema>;

export const GetWorkflowInputSchema = z.object({
  user_id: UserIdSchema,
  slug: SlugSchema
});
export type GetWorkflowInput = z.infer<typeof GetWorkflowInputSchema>;

export const DeleteWorkflowInputSchema = GetWorkflowInputSchema;
export type DeleteWorkflowInput = GetWorkflowInput;

export const LogRunInputSchema = z.object({
  workflow_id: z.string().uuid(),
  user_id: UserIdSchema,
  status: z.enum(['running', 'completed', 'failed', 'abandoned']),
  output_summary: z.string().max(4000).optional()
});
export type LogRunInput = z.infer<typeof LogRunInputSchema>;
