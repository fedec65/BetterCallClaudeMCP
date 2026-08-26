import { describe, it, expect } from 'vitest';
import {
  SaveWorkflowInputSchema,
  ListWorkflowsInputSchema,
  SlugSchema,
  UserIdSchema,
  PipelineSchema
} from '../types.js';

describe('PipelineSchema', () => {
  it('accepts a valid pipeline and defaults checkpoint to false', () => {
    const r = PipelineSchema.safeParse([
      { step: 1, agent_id: 'researcher', purpose: 'Recherche' },
      { step: 2, agent_id: 'drafter', purpose: 'Entwurf', checkpoint: true }
    ]);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data[0].checkpoint).toBe(false);
      expect(r.data[1].checkpoint).toBe(true);
    }
  });

  it('rejects an empty pipeline', () => {
    expect(PipelineSchema.safeParse([]).success).toBe(false);
  });

  it('rejects a step without agent_id', () => {
    expect(
      PipelineSchema.safeParse([{ step: 1, purpose: 'x' }]).success
    ).toBe(false);
  });
});

describe('SlugSchema', () => {
  it('accepts kebab-case', () => {
    expect(SlugSchema.safeParse('my-workflow-2').success).toBe(true);
  });
  it('rejects spaces, uppercase and leading dash', () => {
    expect(SlugSchema.safeParse('My Workflow').success).toBe(false);
    expect(SlugSchema.safeParse('-bad').success).toBe(false);
  });
});

describe('UserIdSchema', () => {
  it('accepts emails and tokens', () => {
    expect(UserIdSchema.safeParse('joe@firm.ch').success).toBe(true);
    expect(UserIdSchema.safeParse('firm-zh-7f3a9c').success).toBe(true);
  });
  it('rejects empty and whitespace', () => {
    expect(UserIdSchema.safeParse('').success).toBe(false);
    expect(UserIdSchema.safeParse('a b').success).toBe(false);
  });
});

describe('SaveWorkflowInputSchema', () => {
  const base = {
    user_id: 'joe@firm.ch',
    slug: 'pip-devis',
    name: 'PIP Devis',
    description: 'Recherche puis redaction',
    pipeline: [{ step: 1, agent_id: 'researcher', purpose: 'Recherche BGE' }],
    output_spec: 'Memo juridique avec citations BGE'
  };
  it('applies visibility default private', () => {
    const r = SaveWorkflowInputSchema.safeParse(base);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.visibility).toBe('private');
  });
  it('rejects bad visibility', () => {
    expect(
      SaveWorkflowInputSchema.safeParse({ ...base, visibility: 'world' }).success
    ).toBe(false);
  });
});

describe('ListWorkflowsInputSchema', () => {
  it('defaults include flags to false', () => {
    const r = ListWorkflowsInputSchema.safeParse({ user_id: 'u1' });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.include_team).toBe(false);
      expect(r.data.include_public).toBe(false);
    }
  });
});
