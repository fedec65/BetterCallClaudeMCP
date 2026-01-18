import { describe, it, expect } from 'vitest';
import { convertCitation } from '../tools/convert-citation.js';

describe('convertCitation', () => {
  describe('BGE format conversions', () => {
    describe('language conversion', () => {
      it('should convert BGE citation to French (ATF)', () => {
        const result = convertCitation({
          citation: 'BGE 145 III 229',
          toFormat: 'bge',
          targetLanguage: 'fr',
        });
        expect(result.success).toBe(true);
        expect(result.converted).toBe('ATF 145 III 229');
        expect(result.fromFormat).toBe('bge');
        expect(result.toFormat).toBe('bge');
        expect(result.targetLanguage).toBe('fr');
      });

      it('should convert BGE citation to Italian (DTF)', () => {
        const result = convertCitation({
          citation: 'BGE 145 III 229',
          toFormat: 'bge',
          targetLanguage: 'it',
        });
        expect(result.success).toBe(true);
        expect(result.converted).toBe('DTF 145 III 229');
      });

      it('should convert ATF citation to German (BGE)', () => {
        const result = convertCitation({
          citation: 'ATF 140 II 315',
          toFormat: 'bge',
          targetLanguage: 'de',
        });
        expect(result.success).toBe(true);
        expect(result.converted).toBe('BGE 140 II 315');
      });

      it('should convert DTF citation to French (ATF)', () => {
        const result = convertCitation({
          citation: 'DTF 138 I 1',
          toFormat: 'bge',
          targetLanguage: 'fr',
        });
        expect(result.success).toBe(true);
        expect(result.converted).toBe('ATF 138 I 1');
      });

      it('should convert BGE with consideration to French', () => {
        const result = convertCitation({
          citation: 'BGE 145 III 229 E. 4.2',
          toFormat: 'bge',
          targetLanguage: 'fr',
        });
        expect(result.success).toBe(true);
        expect(result.converted).toBe('ATF 145 III 229 consid. 4.2');
      });

      it('should convert ATF with consideration to German', () => {
        const result = convertCitation({
          citation: 'ATF 145 III 229 consid. 4.2.1',
          toFormat: 'bge',
          targetLanguage: 'de',
        });
        expect(result.success).toBe(true);
        expect(result.converted).toBe('BGE 145 III 229 E. 4.2.1');
      });

      it('should convert BGE to English (uses BGE prefix)', () => {
        const result = convertCitation({
          citation: 'ATF 145 III 229',
          toFormat: 'bge',
          targetLanguage: 'en',
        });
        expect(result.success).toBe(true);
        expect(result.converted).toBe('BGE 145 III 229');
      });
    });

    describe('same format conversion (normalization)', () => {
      it('should normalize lowercase BGE citation', () => {
        const result = convertCitation({
          citation: 'bge 145 iii 229',
          toFormat: 'bge',
          targetLanguage: 'de',
        });
        expect(result.success).toBe(true);
        expect(result.converted).toBe('BGE 145 III 229');
      });

      it('should normalize extra whitespace', () => {
        const result = convertCitation({
          citation: 'BGE  145   III  229',
          toFormat: 'bge',
          targetLanguage: 'de',
        });
        expect(result.success).toBe(true);
        expect(result.converted).toBe('BGE 145 III 229');
      });
    });
  });

  describe('Statute format conversions', () => {
    describe('language conversion', () => {
      it('should convert German statute to French', () => {
        const result = convertCitation({
          citation: 'Art. 97 OR',
          toFormat: 'statute',
          targetLanguage: 'fr',
        });
        expect(result.success).toBe(true);
        expect(result.converted).toBe('art. 97 CO');
      });

      it('should convert German statute to Italian', () => {
        const result = convertCitation({
          citation: 'Art. 97 OR',
          toFormat: 'statute',
          targetLanguage: 'it',
        });
        expect(result.success).toBe(true);
        expect(result.converted).toBe('art. 97 CO');
      });

      it('should convert French statute to German', () => {
        const result = convertCitation({
          citation: 'art. 97 CO',
          toFormat: 'statute',
          targetLanguage: 'de',
        });
        expect(result.success).toBe(true);
        expect(result.converted).toBe('Art. 97 OR');
      });

      it('should convert statute with paragraph to French', () => {
        const result = convertCitation({
          citation: 'Art. 97 Abs. 1 OR',
          toFormat: 'statute',
          targetLanguage: 'fr',
        });
        expect(result.success).toBe(true);
        expect(result.converted).toBe('art. 97 al. 1 CO');
      });

      it('should convert statute with paragraph to German', () => {
        const result = convertCitation({
          citation: 'art. 97 al. 1 CO',
          toFormat: 'statute',
          targetLanguage: 'de',
        });
        expect(result.success).toBe(true);
        expect(result.converted).toBe('Art. 97 Abs. 1 OR');
      });

      it('should convert statute with paragraph and letter', () => {
        const result = convertCitation({
          citation: 'Art. 8 Abs. 1 lit. a ZGB',
          toFormat: 'statute',
          targetLanguage: 'fr',
        });
        expect(result.success).toBe(true);
        expect(result.converted).toBe('art. 8 al. 1 let. a CC');
      });

      it('should convert statute with all components to French', () => {
        const result = convertCitation({
          citation: 'Art. 50 Abs. 3 lit. b Ziff. 2 OR',
          toFormat: 'statute',
          targetLanguage: 'fr',
        });
        expect(result.success).toBe(true);
        expect(result.converted).toBe('art. 50 al. 3 let. b ch. 2 CO');
      });

      it('should convert statute with all components to German', () => {
        const result = convertCitation({
          citation: 'art. 50 al. 3 let. b ch. 2 CO',
          toFormat: 'statute',
          targetLanguage: 'de',
        });
        expect(result.success).toBe(true);
        expect(result.converted).toBe('Art. 50 Abs. 3 lit. b Ziff. 2 OR');
      });

      it('should convert Criminal Code citation', () => {
        const result = convertCitation({
          citation: 'Art. 111 StGB',
          toFormat: 'statute',
          targetLanguage: 'fr',
        });
        expect(result.success).toBe(true);
        expect(result.converted).toBe('art. 111 CP');
      });

      it('should convert Federal Constitution citation', () => {
        const result = convertCitation({
          citation: 'Art. 8 BV',
          toFormat: 'statute',
          targetLanguage: 'fr',
        });
        expect(result.success).toBe(true);
        expect(result.converted).toBe('art. 8 Cst');
      });

      it('should convert Civil Code citation', () => {
        const result = convertCitation({
          citation: 'art. 1 CC',
          toFormat: 'statute',
          targetLanguage: 'de',
        });
        expect(result.success).toBe(true);
        expect(result.converted).toBe('Art. 1 ZGB');
      });

      it('should convert statute to English', () => {
        const result = convertCitation({
          citation: 'Art. 97 Abs. 1 OR',
          toFormat: 'statute',
          targetLanguage: 'en',
        });
        expect(result.success).toBe(true);
        expect(result.converted).toBe('Art. 97 para. 1 CO');
      });
    });
  });

  describe('Auto-detection of source format', () => {
    it('should auto-detect BGE format', () => {
      const result = convertCitation({
        citation: 'BGE 145 III 229',
        toFormat: 'bge',
        targetLanguage: 'fr',
      });
      expect(result.success).toBe(true);
      expect(result.fromFormat).toBe('bge');
    });

    it('should auto-detect statute format', () => {
      const result = convertCitation({
        citation: 'Art. 97 OR',
        toFormat: 'statute',
        targetLanguage: 'fr',
      });
      expect(result.success).toBe(true);
      expect(result.fromFormat).toBe('statute');
    });

    it('should use provided fromFormat if specified', () => {
      const result = convertCitation({
        citation: 'BGE 145 III 229',
        fromFormat: 'bge',
        toFormat: 'bge',
        targetLanguage: 'fr',
      });
      expect(result.success).toBe(true);
      expect(result.fromFormat).toBe('bge');
    });
  });

  describe('Format mismatch handling', () => {
    it('should return warning when converting BGE to statute format', () => {
      const result = convertCitation({
        citation: 'BGE 145 III 229',
        toFormat: 'statute',
      });
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('Cannot convert');
    });

    it('should return warning when converting statute to BGE format', () => {
      const result = convertCitation({
        citation: 'Art. 97 OR',
        toFormat: 'bge',
      });
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('Cannot convert');
    });
  });

  describe('Error handling', () => {
    it('should return error for empty citation', () => {
      const result = convertCitation({
        citation: '',
        toFormat: 'bge',
      });
      expect(result.success).toBe(false);
      expect(result.converted).toBeNull();
      expect(result.error).toBeDefined();
    });

    it('should return error for invalid citation format', () => {
      const result = convertCitation({
        citation: 'This is not a valid citation',
        toFormat: 'bge',
      });
      expect(result.success).toBe(false);
      expect(result.converted).toBeNull();
      expect(result.error).toBeDefined();
    });

    it('should return original citation in output', () => {
      const result = convertCitation({
        citation: 'BGE 145 III 229',
        toFormat: 'bge',
        targetLanguage: 'fr',
      });
      expect(result.original).toBe('BGE 145 III 229');
    });

    it('should return original citation even on error', () => {
      const result = convertCitation({
        citation: 'invalid',
        toFormat: 'bge',
      });
      expect(result.original).toBe('invalid');
    });
  });

  describe('Default language behavior', () => {
    it('should default to German for BGE without targetLanguage', () => {
      const result = convertCitation({
        citation: 'ATF 145 III 229',
        toFormat: 'bge',
      });
      expect(result.success).toBe(true);
      // When no targetLanguage specified, should normalize to German
      expect(result.converted).toBe('BGE 145 III 229');
    });

    it('should default to German for statute without targetLanguage', () => {
      const result = convertCitation({
        citation: 'art. 97 CO',
        toFormat: 'statute',
      });
      expect(result.success).toBe(true);
      expect(result.converted).toBe('Art. 97 OR');
    });
  });

  describe('Edge cases', () => {
    it('should preserve section code case (Ia)', () => {
      const result = convertCitation({
        citation: 'BGE 120 Ia 50',
        toFormat: 'bge',
        targetLanguage: 'fr',
      });
      expect(result.success).toBe(true);
      expect(result.converted).toBe('ATF 120 Ia 50');
    });

    it('should handle lowercase input and normalize', () => {
      const result = convertCitation({
        citation: 'art. 97 abs. 1 or',
        toFormat: 'statute',
        targetLanguage: 'de',
      });
      expect(result.success).toBe(true);
      expect(result.converted).toBe('Art. 97 Abs. 1 OR');
    });

    it('should handle complex consideration references', () => {
      const result = convertCitation({
        citation: 'BGE 145 III 229 E. 4.2.1.3',
        toFormat: 'bge',
        targetLanguage: 'fr',
      });
      expect(result.success).toBe(true);
      expect(result.converted).toBe('ATF 145 III 229 consid. 4.2.1.3');
    });
  });

  describe('Doctrine format handling', () => {
    it('should return error for doctrine toFormat (not yet supported)', () => {
      const result = convertCitation({
        citation: 'BGE 145 III 229',
        toFormat: 'doctrine',
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain('doctrine');
    });
  });
});
