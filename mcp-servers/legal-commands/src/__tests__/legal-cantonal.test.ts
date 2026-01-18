import { describe, it, expect } from 'vitest';
import { legalCantonal } from '../tools/legal-cantonal.js';
import { LegalCantonalInputSchema, LegalCantonalOutputSchema } from '../types.js';

describe('legalCantonal', () => {
  describe('input validation', () => {
    it('should require canton parameter', () => {
      expect(() => LegalCantonalInputSchema.parse({})).toThrow();
    });

    it('should accept valid canton codes', () => {
      const cantons = ['ZH', 'BE', 'GE', 'BS', 'VD', 'TI'] as const;
      cantons.forEach(canton => {
        const result = LegalCantonalInputSchema.parse({ canton });
        expect(result.canton).toBe(canton);
      });
    });

    it('should reject invalid canton code', () => {
      expect(() => LegalCantonalInputSchema.parse({ canton: 'XX' })).toThrow();
    });

    it('should use activate action by default', () => {
      const result = LegalCantonalInputSchema.parse({ canton: 'ZH' });
      expect(result.action).toBe('activate');
    });

    it('should accept status action', () => {
      const result = LegalCantonalInputSchema.parse({ canton: 'ZH', action: 'status' });
      expect(result.action).toBe('status');
    });

    it('should use German language by default', () => {
      const result = LegalCantonalInputSchema.parse({ canton: 'ZH' });
      expect(result.language).toBe('de');
    });

    it('should accept valid languages', () => {
      const result = LegalCantonalInputSchema.parse({ canton: 'GE', language: 'fr' });
      expect(result.language).toBe('fr');
    });
  });

  describe('output structure', () => {
    it('should return valid output structure', () => {
      const output = legalCantonal({ canton: 'ZH' });
      const validated = LegalCantonalOutputSchema.parse(output);

      expect(validated.mode).toBe('cantonal');
      expect(validated.canton).toBe('ZH');
      expect(validated.cantonName).toBeDefined();
      expect(validated.status).toBeDefined();
      expect(validated.message).toBeDefined();
      expect(validated.primaryLanguage).toBeDefined();
      expect(validated.applicableLaw).toBeInstanceOf(Array);
      expect(validated.primarySources).toBeInstanceOf(Array);
      expect(validated.courtSystem).toBeDefined();
      expect(validated.language).toBeDefined();
    });

    it('should always return cantonal mode', () => {
      const output = legalCantonal({ canton: 'ZH' });
      expect(output.mode).toBe('cantonal');
    });
  });

  describe('canton-specific information', () => {
    describe('Zürich (ZH)', () => {
      it('should return Zürich canton information', () => {
        const output = legalCantonal({ canton: 'ZH' });
        expect(output.canton).toBe('ZH');
        expect(output.cantonName).toContain('Zürich');
        expect(output.primaryLanguage).toBe('de');
      });

      it('should include ZH court system', () => {
        const output = legalCantonal({ canton: 'ZH' });
        expect(output.courtSystem.supreme).toBeDefined();
        expect(output.courtSystem.firstInstance).toBeDefined();
      });
    });

    describe('Genève (GE)', () => {
      it('should return Geneva canton information', () => {
        const output = legalCantonal({ canton: 'GE' });
        expect(output.canton).toBe('GE');
        expect(output.cantonName).toContain('Genève');
        expect(output.primaryLanguage).toBe('fr');
      });

      it('should include GE court system', () => {
        const output = legalCantonal({ canton: 'GE' });
        expect(output.courtSystem.supreme).toBeDefined();
        expect(output.courtSystem.firstInstance).toBeDefined();
      });
    });

    describe('Bern (BE)', () => {
      it('should return Bern canton information', () => {
        const output = legalCantonal({ canton: 'BE' });
        expect(output.canton).toBe('BE');
        expect(output.cantonName).toContain('Bern');
        // Bern is bilingual, default to German
        expect(['de', 'fr']).toContain(output.primaryLanguage);
      });
    });

    describe('Basel-Stadt (BS)', () => {
      it('should return Basel canton information', () => {
        const output = legalCantonal({ canton: 'BS' });
        expect(output.canton).toBe('BS');
        expect(output.cantonName).toContain('Basel');
        expect(output.primaryLanguage).toBe('de');
      });
    });

    describe('Vaud (VD)', () => {
      it('should return Vaud canton information', () => {
        const output = legalCantonal({ canton: 'VD' });
        expect(output.canton).toBe('VD');
        expect(output.cantonName).toContain('Vaud');
        expect(output.primaryLanguage).toBe('fr');
      });
    });

    describe('Ticino (TI)', () => {
      it('should return Ticino canton information', () => {
        const output = legalCantonal({ canton: 'TI' });
        expect(output.canton).toBe('TI');
        expect(output.cantonName).toContain('Ticino');
        expect(output.primaryLanguage).toBe('it');
      });
    });
  });

  describe('activate action', () => {
    it('should return activated status when activating', () => {
      const output = legalCantonal({ canton: 'ZH', action: 'activate' });
      expect(output.status).toBe('activated');
    });

    it('should include activation message', () => {
      const output = legalCantonal({ canton: 'ZH', action: 'activate' });
      expect(output.message.length).toBeGreaterThan(0);
    });
  });

  describe('status action', () => {
    it('should return status information', () => {
      const output = legalCantonal({ canton: 'ZH', action: 'status' });
      expect(['activated', 'already_active']).toContain(output.status);
    });
  });

  describe('applicable law', () => {
    it('should list cantonal statutes for ZH', () => {
      const output = legalCantonal({ canton: 'ZH' });
      expect(output.applicableLaw.length).toBeGreaterThan(0);
    });

    it('should list cantonal statutes for GE', () => {
      const output = legalCantonal({ canton: 'GE' });
      expect(output.applicableLaw.length).toBeGreaterThan(0);
    });
  });

  describe('primary sources', () => {
    it('should list cantonal primary sources', () => {
      const output = legalCantonal({ canton: 'ZH' });
      expect(output.primarySources.length).toBeGreaterThan(0);
    });
  });

  describe('court system', () => {
    it('should include supreme court', () => {
      const output = legalCantonal({ canton: 'ZH' });
      expect(output.courtSystem.supreme).toBeDefined();
      expect(output.courtSystem.supreme.length).toBeGreaterThan(0);
    });

    it('should include first instance court', () => {
      const output = legalCantonal({ canton: 'ZH' });
      expect(output.courtSystem.firstInstance).toBeDefined();
      expect(output.courtSystem.firstInstance.length).toBeGreaterThan(0);
    });

    it('should optionally include specialized courts', () => {
      const output = legalCantonal({ canton: 'ZH' });
      // Specialized courts are optional, just check it doesn't error
      expect(output.courtSystem).toBeDefined();
    });
  });

  describe('language output', () => {
    it('should return the requested language in output', () => {
      const deOutput = legalCantonal({ canton: 'ZH', language: 'de' });
      expect(deOutput.language).toBe('de');

      const frOutput = legalCantonal({ canton: 'GE', language: 'fr' });
      expect(frOutput.language).toBe('fr');
    });

    it('should adapt messages to requested language', () => {
      const deOutput = legalCantonal({ canton: 'ZH', language: 'de' });
      const frOutput = legalCantonal({ canton: 'ZH', language: 'fr' });

      expect(deOutput.message).not.toBe(frOutput.message);
    });
  });
});
