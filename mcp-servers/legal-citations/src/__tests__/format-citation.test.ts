import { describe, it, expect } from 'vitest';
import { formatCitation } from '../tools/format-citation.js';

describe('formatCitation', () => {
  describe('BGE citation formatting', () => {
    describe('full style', () => {
      it('should format BGE citation to German', () => {
        const result = formatCitation({
          citation: 'BGE 145 III 229',
          targetLanguage: 'de',
          style: 'full',
        });
        expect(result.success).toBe(true);
        expect(result.formatted).toBe('BGE 145 III 229');
        expect(result.targetLanguage).toBe('de');
        expect(result.style).toBe('full');
      });

      it('should format BGE citation to French (ATF)', () => {
        const result = formatCitation({
          citation: 'BGE 145 III 229',
          targetLanguage: 'fr',
          style: 'full',
        });
        expect(result.success).toBe(true);
        expect(result.formatted).toBe('ATF 145 III 229');
      });

      it('should format BGE citation to Italian (DTF)', () => {
        const result = formatCitation({
          citation: 'BGE 145 III 229',
          targetLanguage: 'it',
          style: 'full',
        });
        expect(result.success).toBe(true);
        expect(result.formatted).toBe('DTF 145 III 229');
      });

      it('should format ATF citation to German (BGE)', () => {
        const result = formatCitation({
          citation: 'ATF 140 II 315',
          targetLanguage: 'de',
          style: 'full',
        });
        expect(result.success).toBe(true);
        expect(result.formatted).toBe('BGE 140 II 315');
      });

      it('should format BGE with consideration to German', () => {
        const result = formatCitation({
          citation: 'ATF 145 III 229 consid. 4.2',
          targetLanguage: 'de',
          style: 'full',
        });
        expect(result.success).toBe(true);
        expect(result.formatted).toBe('BGE 145 III 229 E. 4.2');
      });

      it('should format BGE with consideration to French', () => {
        const result = formatCitation({
          citation: 'BGE 145 III 229 E. 4.2',
          targetLanguage: 'fr',
          style: 'full',
        });
        expect(result.success).toBe(true);
        expect(result.formatted).toBe('ATF 145 III 229 consid. 4.2');
      });
    });

    describe('short style', () => {
      it('should format BGE citation in short style (German)', () => {
        const result = formatCitation({
          citation: 'BGE 145 III 229',
          targetLanguage: 'de',
          style: 'short',
        });
        expect(result.success).toBe(true);
        expect(result.formatted).toBe('BGE 145 III 229');
      });

      it('should format BGE with consideration in short style (omits consideration)', () => {
        const result = formatCitation({
          citation: 'BGE 145 III 229 E. 4.2',
          targetLanguage: 'de',
          style: 'short',
        });
        expect(result.success).toBe(true);
        expect(result.formatted).toBe('BGE 145 III 229');
      });
    });

    describe('inline style', () => {
      it('should format BGE citation in inline style', () => {
        const result = formatCitation({
          citation: 'BGE 145 III 229',
          targetLanguage: 'de',
          style: 'inline',
        });
        expect(result.success).toBe(true);
        // Inline style uses volume/page format
        expect(result.formatted).toBe('145 III 229');
      });
    });
  });

  describe('Statute citation formatting', () => {
    describe('full style', () => {
      it('should format statute citation to German', () => {
        const result = formatCitation({
          citation: 'Art. 97 OR',
          targetLanguage: 'de',
          style: 'full',
        });
        expect(result.success).toBe(true);
        expect(result.formatted).toBe('Art. 97 OR');
      });

      it('should format statute citation to French', () => {
        const result = formatCitation({
          citation: 'Art. 97 OR',
          targetLanguage: 'fr',
          style: 'full',
        });
        expect(result.success).toBe(true);
        expect(result.formatted).toBe('art. 97 CO');
      });

      it('should format statute citation to Italian', () => {
        const result = formatCitation({
          citation: 'Art. 97 OR',
          targetLanguage: 'it',
          style: 'full',
        });
        expect(result.success).toBe(true);
        expect(result.formatted).toBe('art. 97 CO');
      });

      it('should format statute with paragraph to German', () => {
        const result = formatCitation({
          citation: 'art. 97 al. 1 CO',
          targetLanguage: 'de',
          style: 'full',
        });
        expect(result.success).toBe(true);
        expect(result.formatted).toBe('Art. 97 Abs. 1 OR');
      });

      it('should format statute with paragraph to French', () => {
        const result = formatCitation({
          citation: 'Art. 97 Abs. 1 OR',
          targetLanguage: 'fr',
          style: 'full',
        });
        expect(result.success).toBe(true);
        expect(result.formatted).toBe('art. 97 al. 1 CO');
      });

      it('should format statute with paragraph and letter', () => {
        const result = formatCitation({
          citation: 'Art. 8 Abs. 1 lit. a ZGB',
          targetLanguage: 'fr',
          style: 'full',
        });
        expect(result.success).toBe(true);
        expect(result.formatted).toBe('art. 8 al. 1 let. a CC');
      });

      it('should format statute with all components', () => {
        const result = formatCitation({
          citation: 'Art. 50 Abs. 3 lit. b Ziff. 2 OR',
          targetLanguage: 'fr',
          style: 'full',
        });
        expect(result.success).toBe(true);
        expect(result.formatted).toBe('art. 50 al. 3 let. b ch. 2 CO');
      });

      it('should format Criminal Code citation', () => {
        const result = formatCitation({
          citation: 'Art. 111 StGB',
          targetLanguage: 'fr',
          style: 'full',
        });
        expect(result.success).toBe(true);
        expect(result.formatted).toBe('art. 111 CP');
      });

      it('should format Federal Constitution citation', () => {
        const result = formatCitation({
          citation: 'Art. 8 BV',
          targetLanguage: 'fr',
          style: 'full',
        });
        expect(result.success).toBe(true);
        expect(result.formatted).toBe('art. 8 Cst');
      });
    });

    describe('short style', () => {
      it('should format statute in short style (omits paragraph/letter)', () => {
        const result = formatCitation({
          citation: 'Art. 97 Abs. 1 lit. a OR',
          targetLanguage: 'de',
          style: 'short',
        });
        expect(result.success).toBe(true);
        expect(result.formatted).toBe('Art. 97 OR');
      });
    });

    describe('inline style', () => {
      it('should format statute in inline style', () => {
        const result = formatCitation({
          citation: 'Art. 97 OR',
          targetLanguage: 'de',
          style: 'inline',
        });
        expect(result.success).toBe(true);
        // Inline style: article number + statute abbreviation
        expect(result.formatted).toBe('97 OR');
      });
    });
  });

  describe('Error handling', () => {
    it('should return error for empty citation', () => {
      const result = formatCitation({
        citation: '',
        targetLanguage: 'de',
        style: 'full',
      });
      expect(result.success).toBe(false);
      expect(result.formatted).toBeNull();
      expect(result.error).toBeDefined();
    });

    it('should return error for invalid citation format', () => {
      const result = formatCitation({
        citation: 'This is not a valid citation',
        targetLanguage: 'de',
        style: 'full',
      });
      expect(result.success).toBe(false);
      expect(result.formatted).toBeNull();
      expect(result.error).toBeDefined();
    });

    it('should return original citation in output', () => {
      const result = formatCitation({
        citation: 'BGE 145 III 229',
        targetLanguage: 'fr',
        style: 'full',
      });
      expect(result.original).toBe('BGE 145 III 229');
    });

    it('should return original citation even on error', () => {
      const result = formatCitation({
        citation: 'invalid',
        targetLanguage: 'de',
        style: 'full',
      });
      expect(result.original).toBe('invalid');
    });
  });

  describe('English output', () => {
    it('should format BGE citation to English (uses BGE prefix)', () => {
      const result = formatCitation({
        citation: 'ATF 145 III 229',
        targetLanguage: 'en',
        style: 'full',
      });
      expect(result.success).toBe(true);
      expect(result.formatted).toBe('BGE 145 III 229');
    });

    it('should format statute citation to English', () => {
      const result = formatCitation({
        citation: 'Art. 97 OR',
        targetLanguage: 'en',
        style: 'full',
      });
      expect(result.success).toBe(true);
      expect(result.formatted).toBe('Art. 97 CO');
    });

    it('should format statute with paragraph to English', () => {
      const result = formatCitation({
        citation: 'Art. 97 Abs. 1 OR',
        targetLanguage: 'en',
        style: 'full',
      });
      expect(result.success).toBe(true);
      expect(result.formatted).toBe('Art. 97 para. 1 CO');
    });
  });

  describe('Edge cases', () => {
    it('should preserve section code case', () => {
      const result = formatCitation({
        citation: 'BGE 120 Ia 50',
        targetLanguage: 'de',
        style: 'full',
      });
      expect(result.success).toBe(true);
      expect(result.formatted).toBe('BGE 120 Ia 50');
    });

    it('should handle lowercase input', () => {
      const result = formatCitation({
        citation: 'bge 145 iii 229',
        targetLanguage: 'de',
        style: 'full',
      });
      expect(result.success).toBe(true);
      expect(result.formatted).toBe('BGE 145 III 229');
    });

    it('should normalize extra whitespace', () => {
      const result = formatCitation({
        citation: 'BGE  145   III  229',
        targetLanguage: 'de',
        style: 'full',
      });
      expect(result.success).toBe(true);
      expect(result.formatted).toBe('BGE 145 III 229');
    });
  });
});
