import type { PipelineStep } from './types.js';

export interface AgentManifestEntry {
  agent_id: string;
  display_name: string;
  input_types: string[];
  output_types: string[];
  mcp_servers: string[];
  is_terminal: boolean;
}

export type ValidationErrorCode =
  | 'unknown_agent'
  | 'incompatible_chaining'
  | 'non_sequential_steps';

export interface ValidationError {
  code: ValidationErrorCode;
  step?: number;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export function validatePipeline(
  pipeline: PipelineStep[],
  manifest: AgentManifestEntry[]
): ValidationResult {
  const errors: ValidationError[] = [];
  const byId = new Map(manifest.map(a => [a.agent_id, a]));

  pipeline.forEach((s, i) => {
    if (s.step !== i + 1) {
      errors.push({
        code: 'non_sequential_steps',
        step: s.step,
        message: `Steps must be numbered sequentially: expected step ${i + 1}, got ${s.step}`
      });
    }
    if (!byId.has(s.agent_id)) {
      errors.push({
        code: 'unknown_agent',
        step: s.step,
        message: `Unknown agent '${s.agent_id}' — not in the Swiss plugin agents manifest`
      });
    }
  });

  for (let i = 0; i < pipeline.length - 1; i++) {
    const from = byId.get(pipeline[i].agent_id);
    const to = byId.get(pipeline[i + 1].agent_id);
    if (!from || !to) continue; // unknown_agent already reported
    const compatible = from.output_types.some(t => to.input_types.includes(t));
    if (!compatible) {
      errors.push({
        code: 'incompatible_chaining',
        step: pipeline[i + 1].step,
        message:
          `'${from.agent_id}' produces [${from.output_types.join(', ')}], ` +
          `none of which '${to.agent_id}' accepts [${to.input_types.join(', ')}]`
      });
    }
  }

  return { valid: errors.length === 0, errors };
}
