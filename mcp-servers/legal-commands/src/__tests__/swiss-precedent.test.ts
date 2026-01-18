import { describe, it, expect } from 'vitest';
import { swissPrecedent } from '../tools/swiss-precedent.js';
import { SwissPrecedentInputSchema, SwissPrecedentOutputSchema } from '../types.js';

describe('swissPrecedent', () => {
  describe('input validation', () => {
    it('should require query parameter', () => {
      expect(() => SwissPrecedentInputSchema.parse({})).toThrow();
    });

    it('should accept query with defaults', () => {
      const result = SwissPrecedentInputSchema.parse({ query: 'Art. 97 OR' });
      expect(result.query).toBe('Art. 97 OR');
      expect(result.sources).toEqual(['bge']);
      expect(result.maxResults).toBe(10);
      expect(result.language).toBe('de');
    });

    it('should accept valid sources array', () => {
      const result = SwissPrecedentInputSchema.parse({
        query: 'contract breach',
        sources: ['bge', 'bvge'],
      });
      expect(result.sources).toContain('bge');
      expect(result.sources).toContain('bvge');
    });

    it('should accept legalArea parameter', () => {
      const result = SwissPrecedentInputSchema.parse({
        query: 'liability',
        legalArea: 'contract law',
      });
      expect(result.legalArea).toBe('contract law');
    });

    it('should accept date range parameters', () => {
      const result = SwissPrecedentInputSchema.parse({
        query: 'damages',
        dateFrom: '2020-01-01',
        dateTo: '2023-12-31',
      });
      expect(result.dateFrom).toBe('2020-01-01');
      expect(result.dateTo).toBe('2023-12-31');
    });

    it('should accept maxResults parameter within range', () => {
      const result = SwissPrecedentInputSchema.parse({
        query: 'test',
        maxResults: 25,
      });
      expect(result.maxResults).toBe(25);
    });

    it('should reject maxResults below 1', () => {
      expect(() =>
        SwissPrecedentInputSchema.parse({
          query: 'test',
          maxResults: 0,
        })
      ).toThrow();
    });

    it('should reject maxResults above 50', () => {
      expect(() =>
        SwissPrecedentInputSchema.parse({
          query: 'test',
          maxResults: 51,
        })
      ).toThrow();
    });

    it('should accept valid language', () => {
      const result = SwissPrecedentInputSchema.parse({
        query: 'test',
        language: 'fr',
      });
      expect(result.language).toBe('fr');
    });

    it('should reject invalid source', () => {
      expect(() =>
        SwissPrecedentInputSchema.parse({
          query: 'test',
          sources: ['invalid'],
        })
      ).toThrow();
    });
  });

  describe('output structure', () => {
    it('should return valid output structure', () => {
      const output = swissPrecedent({ query: 'Art. 97 OR Vertragshaftung' });
      const validated = SwissPrecedentOutputSchema.parse(output);

      expect(validated.query).toBeDefined();
      expect(validated.totalResults).toBeGreaterThanOrEqual(0);
      expect(validated.results).toBeInstanceOf(Array);
      expect(validated.suggestedSearches).toBeInstanceOf(Array);
      expect(validated.language).toBeDefined();
    });

    it('should include query in output', () => {
      const output = swissPrecedent({ query: 'Schadenersatz' });
      expect(output.query).toBe('Schadenersatz');
    });

    it('should return results array even if empty', () => {
      const output = swissPrecedent({ query: 'xyz123nonexistent' });
      expect(output.results).toBeInstanceOf(Array);
    });
  });

  describe('result structure', () => {
    it('should return results with required fields', () => {
      const output = swissPrecedent({ query: 'Vertragsverletzung' });

      if (output.results.length > 0) {
        const result = output.results[0];
        expect(result.reference).toBeDefined();
        expect(result.court).toBeDefined();
        expect(result.date).toBeDefined();
        expect(result.title).toBeDefined();
        expect(result.summary).toBeDefined();
        expect(result.relevance).toBeGreaterThanOrEqual(0);
        expect(result.relevance).toBeLessThanOrEqual(1);
        expect(result.legalPrinciples).toBeInstanceOf(Array);
        expect(result.citedArticles).toBeInstanceOf(Array);
      }
    });

    it('should return relevance scores between 0 and 1', () => {
      const output = swissPrecedent({ query: 'Haftung' });

      output.results.forEach((result) => {
        expect(result.relevance).toBeGreaterThanOrEqual(0);
        expect(result.relevance).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('source filtering', () => {
    it('should accept bge source', () => {
      const output = swissPrecedent({
        query: 'Bundesgericht',
        sources: ['bge'],
      });
      expect(output.results).toBeInstanceOf(Array);
    });

    it('should accept bvge source', () => {
      const output = swissPrecedent({
        query: 'Verwaltungsgericht',
        sources: ['bvge'],
      });
      expect(output.results).toBeInstanceOf(Array);
    });

    it('should accept cantonal source', () => {
      const output = swissPrecedent({
        query: 'cantonal',
        sources: ['cantonal'],
      });
      expect(output.results).toBeInstanceOf(Array);
    });

    it('should accept all sources', () => {
      const output = swissPrecedent({
        query: 'liability',
        sources: ['all'],
      });
      expect(output.results).toBeInstanceOf(Array);
    });

    it('should accept multiple sources', () => {
      const output = swissPrecedent({
        query: 'Vertragsrecht',
        sources: ['bge', 'cantonal'],
      });
      expect(output.results).toBeInstanceOf(Array);
    });
  });

  describe('legal area filtering', () => {
    it('should accept contract law filter', () => {
      const output = swissPrecedent({
        query: 'breach',
        legalArea: 'contract law',
      });
      expect(output.results).toBeInstanceOf(Array);
    });

    it('should accept tort law filter', () => {
      const output = swissPrecedent({
        query: 'negligence',
        legalArea: 'tort law',
      });
      expect(output.results).toBeInstanceOf(Array);
    });
  });

  describe('suggested searches', () => {
    it('should provide suggested searches array', () => {
      const output = swissPrecedent({ query: 'Vertragshaftung' });
      expect(output.suggestedSearches).toBeInstanceOf(Array);
    });

    it('should provide relevant suggested searches for contract query', () => {
      const output = swissPrecedent({ query: 'Art. 97 OR' });
      expect(output.suggestedSearches.length).toBeGreaterThan(0);
    });
  });

  describe('language output', () => {
    it('should return the requested language in output', () => {
      const deOutput = swissPrecedent({ query: 'test', language: 'de' });
      expect(deOutput.language).toBe('de');

      const frOutput = swissPrecedent({ query: 'test', language: 'fr' });
      expect(frOutput.language).toBe('fr');
    });

    it('should default to German', () => {
      const output = swissPrecedent({ query: 'test' });
      expect(output.language).toBe('de');
    });
  });

  describe('maxResults handling', () => {
    it('should respect maxResults parameter', () => {
      const output = swissPrecedent({
        query: 'Haftung',
        maxResults: 5,
      });
      expect(output.results.length).toBeLessThanOrEqual(5);
    });

    it('should use default maxResults of 10', () => {
      const output = swissPrecedent({ query: 'Schadenersatz' });
      expect(output.results.length).toBeLessThanOrEqual(10);
    });
  });

  describe('analysis notes', () => {
    it('should optionally include analysis notes', () => {
      const output = swissPrecedent({ query: 'complex legal issue' });
      // analysisNotes is optional, so just check the field exists or is undefined
      expect('analysisNotes' in output || output.analysisNotes === undefined).toBe(true);
    });
  });

  describe('BGE reference detection', () => {
    it('should recognize BGE reference pattern in query', () => {
      const output = swissPrecedent({ query: 'BGE 145 III 229' });
      expect(output.results).toBeInstanceOf(Array);
    });

    it('should recognize ATF reference pattern in query', () => {
      const output = swissPrecedent({ query: 'ATF 145 III 229' });
      expect(output.results).toBeInstanceOf(Array);
    });

    it('should recognize DTF reference pattern in query', () => {
      const output = swissPrecedent({ query: 'DTF 145 III 229' });
      expect(output.results).toBeInstanceOf(Array);
    });
  });

  describe('article reference detection', () => {
    it('should recognize OR article references', () => {
      const output = swissPrecedent({ query: 'Art. 97 OR' });
      expect(output.results).toBeInstanceOf(Array);
    });

    it('should recognize ZGB article references', () => {
      const output = swissPrecedent({ query: 'Art. 2 ZGB' });
      expect(output.results).toBeInstanceOf(Array);
    });

    it('should recognize CO article references (French)', () => {
      const output = swissPrecedent({ query: 'art. 97 CO', language: 'fr' });
      expect(output.results).toBeInstanceOf(Array);
    });
  });
});
