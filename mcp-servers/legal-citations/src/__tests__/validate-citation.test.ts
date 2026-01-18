import { describe, it, expect } from 'vitest';
import {
  ValidateCitationInputSchema,
  type ValidateCitationInput,
} from '../types.js';
import { validateCitation } from '../tools/validate-citation.js';

describe('ValidateCitationInputSchema', () => {
  it('should accept valid minimal input', () => {
    const input = { citation: 'BGE 145 III 229' };
    const result = ValidateCitationInputSchema.parse(input);
    expect(result.citation).toBe('BGE 145 III 229');
    expect(result.strict).toBe(false); // default
  });

  it('should accept input with all options', () => {
    const input: ValidateCitationInput = {
      citation: 'BGE 145 III 229',
      strict: true,
      citationType: 'bge',
    };
    const result = ValidateCitationInputSchema.parse(input);
    expect(result).toEqual(input);
  });

  it('should reject empty citation', () => {
    expect(() => ValidateCitationInputSchema.parse({ citation: '' })).toThrow();
  });

  it('should accept all citation types', () => {
    const types = ['bge', 'statute', 'doctrine'];
    for (const citationType of types) {
      const result = ValidateCitationInputSchema.parse({
        citation: 'test',
        citationType,
      });
      expect(result.citationType).toBe(citationType);
    }
  });
});

describe('validateCitation', () => {
  describe('BGE citation validation', () => {
    it('should validate correct German BGE citation', () => {
      const result = validateCitation({ citation: 'BGE 145 III 229' });
      expect(result.valid).toBe(true);
      expect(result.citationType).toBe('bge');
      expect(result.errors).toHaveLength(0);
    });

    it('should validate correct French ATF citation', () => {
      const result = validateCitation({ citation: 'ATF 140 II 315' });
      expect(result.valid).toBe(true);
      expect(result.citationType).toBe('bge');
      expect(result.errors).toHaveLength(0);
    });

    it('should validate correct Italian DTF citation', () => {
      const result = validateCitation({ citation: 'DTF 138 I 1' });
      expect(result.valid).toBe(true);
      expect(result.citationType).toBe('bge');
      expect(result.errors).toHaveLength(0);
    });

    it('should validate BGE with consideration', () => {
      const result = validateCitation({ citation: 'BGE 145 III 229 E. 4.2' });
      expect(result.valid).toBe(true);
      expect(result.citationType).toBe('bge');
    });

    it('should validate BGE with French consideration prefix', () => {
      const result = validateCitation({
        citation: 'ATF 140 II 315 consid. 3.1',
      });
      expect(result.valid).toBe(true);
      expect(result.citationType).toBe('bge');
    });

    it('should validate all BGE sections', () => {
      const sections = ['I', 'Ia', 'II', 'III', 'IV', 'V', 'VI'];
      for (const section of sections) {
        const result = validateCitation({ citation: `BGE 145 ${section} 100` });
        expect(result.valid).toBe(true);
        expect(result.citationType).toBe('bge');
      }
    });

    it('should reject invalid BGE section', () => {
      const result = validateCitation({ citation: 'BGE 145 VII 229' });
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject BGE without spaces', () => {
      const result = validateCitation({ citation: 'BGE145III229' });
      expect(result.valid).toBe(false);
    });

    it('should reject BGE with missing volume', () => {
      const result = validateCitation({ citation: 'BGE III 229' });
      expect(result.valid).toBe(false);
    });

    it('should normalize spacing in valid BGE', () => {
      const result = validateCitation({ citation: 'BGE  145   III    229' });
      expect(result.valid).toBe(true);
      expect(result.normalized).toBe('BGE 145 III 229');
    });

    it('should provide suggestions for common typos', () => {
      const result = validateCitation({ citation: 'BGE 145 II' });
      expect(result.valid).toBe(false);
      expect(result.suggestions).toBeDefined();
    });
  });

  describe('Statute citation validation', () => {
    it('should validate simple statute citation', () => {
      const result = validateCitation({ citation: 'Art. 97 OR' });
      expect(result.valid).toBe(true);
      expect(result.citationType).toBe('statute');
      expect(result.errors).toHaveLength(0);
    });

    it('should validate statute with paragraph', () => {
      const result = validateCitation({ citation: 'Art. 123 Abs. 2 OR' });
      expect(result.valid).toBe(true);
      expect(result.citationType).toBe('statute');
    });

    it('should validate French statute citation', () => {
      const result = validateCitation({ citation: 'art. 97 al. 1 CO' });
      expect(result.valid).toBe(true);
      expect(result.citationType).toBe('statute');
    });

    it('should validate Italian statute citation', () => {
      const result = validateCitation({ citation: 'art. 97 cpv. 1 CO' });
      expect(result.valid).toBe(true);
      expect(result.citationType).toBe('statute');
    });

    it('should validate statute with letter', () => {
      const result = validateCitation({ citation: 'Art. 8 lit. a ZGB' });
      expect(result.valid).toBe(true);
      expect(result.citationType).toBe('statute');
    });

    it('should validate statute with paragraph and letter', () => {
      const result = validateCitation({
        citation: 'Art. 123 Abs. 2 lit. b OR',
      });
      expect(result.valid).toBe(true);
      expect(result.citationType).toBe('statute');
    });

    it('should validate statute with number', () => {
      const result = validateCitation({
        citation: 'Art. 123 Abs. 2 Ziff. 3 OR',
      });
      expect(result.valid).toBe(true);
      expect(result.citationType).toBe('statute');
    });

    it('should validate common Swiss statutes', () => {
      const statutes = ['OR', 'CO', 'ZGB', 'CC', 'StGB', 'CP', 'BV', 'Cst'];
      for (const statute of statutes) {
        const result = validateCitation({ citation: `Art. 1 ${statute}` });
        expect(result.valid).toBe(true);
        expect(result.citationType).toBe('statute');
      }
    });

    it('should reject statute without article number', () => {
      const result = validateCitation({ citation: 'Art. OR' });
      expect(result.valid).toBe(false);
    });

    it('should reject statute without statute abbreviation', () => {
      const result = validateCitation({ citation: 'Art. 97' });
      expect(result.valid).toBe(false);
    });

    it('should normalize statute citation', () => {
      const result = validateCitation({ citation: 'art.  97   OR' });
      expect(result.valid).toBe(true);
      expect(result.normalized).toBe('Art. 97 OR');
    });
  });

  describe('Auto-detection', () => {
    it('should auto-detect BGE citation', () => {
      const result = validateCitation({ citation: 'BGE 145 III 229' });
      expect(result.citationType).toBe('bge');
    });

    it('should auto-detect statute citation', () => {
      const result = validateCitation({ citation: 'Art. 97 OR' });
      expect(result.citationType).toBe('statute');
    });

    it('should use citationType hint when provided', () => {
      const result = validateCitation({
        citation: 'Art. 97 OR',
        citationType: 'statute',
      });
      expect(result.citationType).toBe('statute');
    });

    it('should return null citationType for invalid citation', () => {
      const result = validateCitation({ citation: 'invalid citation format' });
      expect(result.valid).toBe(false);
      expect(result.citationType).toBeNull();
    });
  });

  describe('Error handling', () => {
    it('should return descriptive error for empty input', () => {
      const result = validateCitation({ citation: '   ' });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === 'EMPTY_CITATION')).toBe(true);
    });

    it('should return error for unrecognized format', () => {
      const result = validateCitation({ citation: 'random text here' });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === 'UNRECOGNIZED_FORMAT')).toBe(
        true
      );
    });

    it('should return error for invalid BGE section', () => {
      const result = validateCitation({ citation: 'BGE 145 VII 229' });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === 'INVALID_SECTION')).toBe(
        true
      );
    });

    it('should include position in error when applicable', () => {
      const result = validateCitation({ citation: 'BGE 145 VII 229' });
      const sectionError = result.errors.find(
        (e) => e.code === 'INVALID_SECTION'
      );
      expect(sectionError?.position).toBeDefined();
    });
  });

  describe('Strict mode', () => {
    it('should accept strict option', () => {
      const result = validateCitation({
        citation: 'BGE 145 III 229',
        strict: true,
      });
      expect(result.valid).toBe(true);
    });

    it('should validate volume range in strict mode', () => {
      const result = validateCitation({
        citation: 'BGE 999 III 229',
        strict: true,
      });
      // In strict mode, should warn about unlikely volume number
      expect(result.valid).toBe(true); // Still syntactically valid
      // But may have warnings about volume range
    });
  });

  describe('Edge cases', () => {
    it('should handle leading/trailing whitespace', () => {
      const result = validateCitation({ citation: '  BGE 145 III 229  ' });
      expect(result.valid).toBe(true);
      expect(result.normalized).toBe('BGE 145 III 229');
    });

    it('should handle case variations in prefix', () => {
      const result = validateCitation({ citation: 'bge 145 III 229' });
      expect(result.valid).toBe(true);
      expect(result.normalized).toBe('BGE 145 III 229');
    });

    it('should handle case variations in section', () => {
      const result = validateCitation({ citation: 'BGE 145 iii 229' });
      expect(result.valid).toBe(true);
      expect(result.normalized).toBe('BGE 145 III 229');
    });

    it('should handle tab characters', () => {
      const result = validateCitation({ citation: 'BGE\t145\tIII\t229' });
      expect(result.valid).toBe(true);
    });

    it('should handle newlines', () => {
      const result = validateCitation({ citation: 'BGE 145\nIII 229' });
      expect(result.valid).toBe(true);
    });
  });
});
