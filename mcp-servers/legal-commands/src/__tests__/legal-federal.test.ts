import { describe, it, expect } from 'vitest';
import { legalFederal } from '../tools/legal-federal.js';
import { LegalFederalInputSchema, LegalFederalOutputSchema } from '../types.js';

describe('legalFederal', () => {
  describe('input validation', () => {
    it('should accept empty input with defaults', () => {
      const result = LegalFederalInputSchema.parse({});
      expect(result.action).toBe('activate');
      expect(result.language).toBe('de');
    });

    it('should accept activate action', () => {
      const result = LegalFederalInputSchema.parse({ action: 'activate' });
      expect(result.action).toBe('activate');
    });

    it('should accept status action', () => {
      const result = LegalFederalInputSchema.parse({ action: 'status' });
      expect(result.action).toBe('status');
    });

    it('should accept valid language', () => {
      const result = LegalFederalInputSchema.parse({ language: 'fr' });
      expect(result.language).toBe('fr');
    });

    it('should reject invalid action', () => {
      expect(() => LegalFederalInputSchema.parse({ action: 'invalid' })).toThrow();
    });

    it('should reject invalid language', () => {
      expect(() => LegalFederalInputSchema.parse({ language: 'invalid' })).toThrow();
    });
  });

  describe('output structure', () => {
    it('should return valid output structure', () => {
      const output = legalFederal({});
      const validated = LegalFederalOutputSchema.parse(output);

      expect(validated.mode).toBe('federal');
      expect(validated.status).toBeDefined();
      expect(validated.message).toBeDefined();
      expect(validated.applicableLaw).toBeInstanceOf(Array);
      expect(validated.primarySources).toBeInstanceOf(Array);
      expect(validated.language).toBeDefined();
    });

    it('should always return federal mode', () => {
      const output = legalFederal({});
      expect(output.mode).toBe('federal');
    });
  });

  describe('activate action', () => {
    it('should return activated status when activating', () => {
      const output = legalFederal({ action: 'activate' });
      expect(output.status).toBe('activated');
    });

    it('should include activation message in German by default', () => {
      const output = legalFederal({ action: 'activate' });
      expect(output.message).toContain('Bundesrecht');
    });

    it('should include activation message in French when requested', () => {
      const output = legalFederal({ action: 'activate', language: 'fr' });
      expect(output.message).toContain('fédéral');
    });

    it('should include activation message in Italian when requested', () => {
      const output = legalFederal({ action: 'activate', language: 'it' });
      expect(output.message).toContain('federale');
    });

    it('should include activation message in English when requested', () => {
      const output = legalFederal({ action: 'activate', language: 'en' });
      expect(output.message).toContain('Federal');
    });
  });

  describe('status action', () => {
    it('should return status information', () => {
      const output = legalFederal({ action: 'status' });
      expect(['activated', 'already_active']).toContain(output.status);
    });
  });

  describe('applicable law', () => {
    it('should list federal statutes', () => {
      const output = legalFederal({});

      expect(output.applicableLaw).toContain('BV');
      expect(output.applicableLaw).toContain('ZGB');
      expect(output.applicableLaw).toContain('OR');
      expect(output.applicableLaw).toContain('StGB');
    });

    it('should list at least 4 federal statutes', () => {
      const output = legalFederal({});
      expect(output.applicableLaw.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('primary sources', () => {
    it('should include Bundesgericht as primary source', () => {
      const output = legalFederal({});
      expect(output.primarySources.some(s =>
        s.toLowerCase().includes('bundesgericht') ||
        s.toLowerCase().includes('bge') ||
        s.toLowerCase().includes('federal')
      )).toBe(true);
    });

    it('should list at least 2 primary sources', () => {
      const output = legalFederal({});
      expect(output.primarySources.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('language output', () => {
    it('should return the requested language in output', () => {
      const deOutput = legalFederal({ language: 'de' });
      expect(deOutput.language).toBe('de');

      const frOutput = legalFederal({ language: 'fr' });
      expect(frOutput.language).toBe('fr');

      const itOutput = legalFederal({ language: 'it' });
      expect(itOutput.language).toBe('it');

      const enOutput = legalFederal({ language: 'en' });
      expect(enOutput.language).toBe('en');
    });
  });
});
