import { describe, it, expect } from 'vitest';
import { validatePipeline } from '../validate.js';
import { AGENTS_MANIFEST } from '../manifest.js';
import type { PipelineStep } from '../types.js';

const step = (n: number, agent_id: string): PipelineStep => ({
  step: n,
  agent_id,
  purpose: 'test',
  checkpoint: false
});

describe('validatePipeline', () => {
  it('accepts all 5 fixed plugin templates (regression: manifest must support them)', () => {
    const templates: string[][] = [
      ['researcher', 'strategist', 'risk', 'drafter'],            // litigation-prep
      ['researcher', 'compliance', 'corporate', 'risk', 'drafter'], // due-diligence
      ['researcher', 'drafter', 'compliance', 'citation'],        // contract-lifecycle
      ['researcher', 'realestate', 'compliance', 'drafter'],      // real-estate-closing
      ['advocate', 'adversary', 'judicial']                       // adversarial-review
    ];
    for (const t of templates) {
      const r = validatePipeline(t.map((a, i) => step(i + 1, a)), AGENTS_MANIFEST);
      expect(r.errors, `template ${t.join('->')} must validate`).toEqual([]);
      expect(r.valid).toBe(true);
    }
  });

  it('flags unknown_agent', () => {
    const r = validatePipeline([step(1, 'not-an-agent')], AGENTS_MANIFEST);
    expect(r.valid).toBe(false);
    expect(r.errors[0].code).toBe('unknown_agent');
  });

  it('flags incompatible_chaining when output/input types do not intersect', () => {
    // judicial expects arguments_for/arguments_against; researcher outputs neither
    const r = validatePipeline(
      [step(1, 'researcher'), step(2, 'judicial')],
      AGENTS_MANIFEST
    );
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.code === 'incompatible_chaining')).toBe(true);
  });

  it('flags non_sequential_steps', () => {
    const r = validatePipeline([step(1, 'researcher'), step(7, 'drafter')], AGENTS_MANIFEST);
    expect(r.errors.some(e => e.code === 'non_sequential_steps' && e.step === 7)).toBe(true);
  });

  it('skips chaining check when a neighbor is unknown', () => {
    const r = validatePipeline([step(1, 'ghost'), step(2, 'judicial')], AGENTS_MANIFEST);
    expect(r.errors.filter(e => e.code === 'incompatible_chaining')).toEqual([]);
  });

  it('manifest covers exactly the 16 chainable stage agents', () => {
    expect(AGENTS_MANIFEST.map(a => a.agent_id).sort()).toEqual(
      [
        'advocate', 'adversary', 'cantonal', 'citation', 'compliance',
        'corporate', 'data-protection', 'drafter', 'fiscal', 'judicial',
        'procedure', 'realestate', 'researcher', 'risk', 'strategist',
        'translator'
      ].sort()
    );
  });
});
