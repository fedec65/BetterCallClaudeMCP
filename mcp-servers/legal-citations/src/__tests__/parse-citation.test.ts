import { describe, it, expect } from 'vitest';
import { parseCitation } from '../tools/parse-citation.js';

describe('parseCitation', () => {
  describe('BGE citation parsing', () => {
    it('should parse standard BGE citation', () => {
      const result = parseCitation({ citation: 'BGE 145 III 229' });
      expect(result.success).toBe(true);
      expect(result.parsed).toEqual({
        type: 'bge',
        prefix: 'BGE',
        volume: 145,
        section: 'III',
        page: 229,
        language: 'de',
      });
      expect(result.normalized).toBe('BGE 145 III 229');
    });

    it('should parse ATF citation (French)', () => {
      const result = parseCitation({ citation: 'ATF 140 II 315' });
      expect(result.success).toBe(true);
      expect(result.parsed).toEqual({
        type: 'bge',
        prefix: 'ATF',
        volume: 140,
        section: 'II',
        page: 315,
        language: 'fr',
      });
    });

    it('should parse DTF citation (Italian)', () => {
      const result = parseCitation({ citation: 'DTF 138 I 1' });
      expect(result.success).toBe(true);
      expect(result.parsed).toEqual({
        type: 'bge',
        prefix: 'DTF',
        volume: 138,
        section: 'I',
        page: 1,
        language: 'it',
      });
    });

    it('should parse BGE with consideration reference', () => {
      const result = parseCitation({ citation: 'BGE 145 III 229 E. 4.2' });
      expect(result.success).toBe(true);
      expect(result.parsed).toEqual({
        type: 'bge',
        prefix: 'BGE',
        volume: 145,
        section: 'III',
        page: 229,
        consideration: '4.2',
        language: 'de',
      });
    });

    it('should parse ATF with consid. reference', () => {
      const result = parseCitation({ citation: 'ATF 145 III 229 consid. 4.2.1' });
      expect(result.success).toBe(true);
      expect(result.parsed).toEqual({
        type: 'bge',
        prefix: 'ATF',
        volume: 145,
        section: 'III',
        page: 229,
        consideration: '4.2.1',
        language: 'fr',
      });
    });

    it('should parse BGE with Ia section', () => {
      const result = parseCitation({ citation: 'BGE 120 Ia 50' });
      expect(result.success).toBe(true);
      expect(result.parsed).toEqual({
        type: 'bge',
        prefix: 'BGE',
        volume: 120,
        section: 'Ia',
        page: 50,
        language: 'de',
      });
    });

    it('should handle lowercase section input', () => {
      const result = parseCitation({ citation: 'BGE 145 iii 229' });
      expect(result.success).toBe(true);
      expect(result.parsed?.type).toBe('bge');
      if (result.parsed?.type === 'bge') {
        expect(result.parsed.section).toBe('III');
      }
    });

    it('should normalize extra whitespace', () => {
      const result = parseCitation({ citation: 'BGE  145   III  229' });
      expect(result.success).toBe(true);
      expect(result.normalized).toBe('BGE 145 III 229');
    });
  });

  describe('Statute citation parsing', () => {
    it('should parse simple statute citation', () => {
      const result = parseCitation({ citation: 'Art. 97 OR' });
      expect(result.success).toBe(true);
      expect(result.parsed).toEqual({
        type: 'statute',
        article: 97,
        statute: 'OR',
        language: 'de',
      });
      expect(result.normalized).toBe('Art. 97 OR');
    });

    it('should parse statute with paragraph', () => {
      const result = parseCitation({ citation: 'Art. 123 Abs. 2 OR' });
      expect(result.success).toBe(true);
      expect(result.parsed).toEqual({
        type: 'statute',
        article: 123,
        paragraph: 2,
        statute: 'OR',
        language: 'de',
      });
    });

    it('should parse statute with paragraph and letter', () => {
      const result = parseCitation({ citation: 'Art. 8 Abs. 1 lit. a ZGB' });
      expect(result.success).toBe(true);
      expect(result.parsed).toEqual({
        type: 'statute',
        article: 8,
        paragraph: 1,
        letter: 'a',
        statute: 'ZGB',
        language: 'de',
      });
    });

    it('should parse statute with all components', () => {
      const result = parseCitation({ citation: 'Art. 50 Abs. 3 lit. b Ziff. 2 OR' });
      expect(result.success).toBe(true);
      expect(result.parsed).toEqual({
        type: 'statute',
        article: 50,
        paragraph: 3,
        letter: 'b',
        number: 2,
        statute: 'OR',
        language: 'de',
      });
    });

    it('should parse French statute citation (CO)', () => {
      const result = parseCitation({ citation: 'art. 97 al. 1 CO' });
      expect(result.success).toBe(true);
      expect(result.parsed).toEqual({
        type: 'statute',
        article: 97,
        paragraph: 1,
        statute: 'CO',
        language: 'fr',
      });
    });

    it('should parse Italian statute citation', () => {
      const result = parseCitation({ citation: 'art. 97 cpv. 1 CO' });
      expect(result.success).toBe(true);
      expect(result.parsed).toEqual({
        type: 'statute',
        article: 97,
        paragraph: 1,
        statute: 'CO',
        language: 'it',
      });
    });

    it('should handle different statute abbreviations', () => {
      const testCases = [
        { input: 'Art. 1 ZGB', statute: 'ZGB' },
        { input: 'Art. 1 StGB', statute: 'StGB' },
        { input: 'Art. 1 BV', statute: 'BV' },
        { input: 'Art. 1 ZPO', statute: 'ZPO' },
        { input: 'Art. 1 StPO', statute: 'StPO' },
      ];

      for (const tc of testCases) {
        const result = parseCitation({ citation: tc.input });
        expect(result.success).toBe(true);
        if (result.parsed?.type === 'statute') {
          expect(result.parsed.statute).toBe(tc.statute);
        }
      }
    });

    it('should normalize statute citation format', () => {
      const result = parseCitation({ citation: 'art. 97 abs. 1 lit. A or' });
      expect(result.success).toBe(true);
      // Normalized should use standard formatting
      expect(result.normalized).toBe('Art. 97 Abs. 1 lit. a OR');
    });
  });

  describe('Error handling', () => {
    it('should return error for empty citation', () => {
      const result = parseCitation({ citation: '' });
      expect(result.success).toBe(false);
      expect(result.parsed).toBeNull();
      expect(result.error).toBeDefined();
    });

    it('should return error for invalid citation format', () => {
      const result = parseCitation({ citation: 'This is not a citation' });
      expect(result.success).toBe(false);
      expect(result.parsed).toBeNull();
      expect(result.error).toBeDefined();
    });

    it('should return error for invalid BGE section', () => {
      const result = parseCitation({ citation: 'BGE 145 VII 229' });
      expect(result.success).toBe(false);
      expect(result.error).toContain('section');
    });

    it('should return error for statute without article number', () => {
      const result = parseCitation({ citation: 'Art. OR' });
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should return original citation in output', () => {
      const result = parseCitation({ citation: 'BGE 145 III 229' });
      expect(result.original).toBe('BGE 145 III 229');
    });

    it('should return original citation even on error', () => {
      const result = parseCitation({ citation: 'invalid' });
      expect(result.original).toBe('invalid');
    });
  });

  describe('Type hints', () => {
    it('should respect BGE type hint', () => {
      const result = parseCitation({
        citation: 'BGE 145 III 229',
        citationType: 'bge',
      });
      expect(result.success).toBe(true);
      expect(result.parsed?.type).toBe('bge');
    });

    it('should respect statute type hint', () => {
      const result = parseCitation({
        citation: 'Art. 97 OR',
        citationType: 'statute',
      });
      expect(result.success).toBe(true);
      expect(result.parsed?.type).toBe('statute');
    });

    it('should return error when type hint conflicts with content', () => {
      const result = parseCitation({
        citation: 'BGE 145 III 229',
        citationType: 'statute',
      });
      expect(result.success).toBe(false);
    });
  });
});
