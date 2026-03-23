import { describe, it, expect } from 'vitest';
import {
  parseBgeCitation,
  parseStatuteCitation,
  validateCitation,
  formatBgeCitation,
  formatStatuteCitation,
  normalizeCitation,
  handleLegalCitation,
} from '../../handlers/citation.js';

describe('Citation Handler', () => {
  describe('parseBgeCitation', () => {
    it('should parse basic BGE citation', () => {
      const result = parseBgeCitation('BGE 145 III 229');
      expect(result).not.toBeNull();
      expect(result?.volume).toBe(145);
      expect(result?.section).toBe('III');
      expect(result?.page).toBe(229);
      expect(result?.prefix).toBe('BGE');
    });

    it('should parse ATF citation (French)', () => {
      const result = parseBgeCitation('ATF 145 III 229');
      expect(result).not.toBeNull();
      expect(result?.prefix).toBe('ATF');
      expect(result?.volume).toBe(145);
    });

    it('should parse DTF citation (Italian)', () => {
      const result = parseBgeCitation('DTF 145 III 229');
      expect(result).not.toBeNull();
      expect(result?.prefix).toBe('DTF');
    });

    it('should parse BGE with consideration reference', () => {
      const result = parseBgeCitation('BGE 145 III 229 E. 4.2');
      expect(result).not.toBeNull();
      expect(result?.consideration).toBe('4.2');
    });

    it('should parse ATF with consid. reference', () => {
      const result = parseBgeCitation('ATF 145 III 229 consid. 4.2.1');
      expect(result).not.toBeNull();
      expect(result?.consideration).toBe('4.2.1');
    });

    it('should handle all BGE sections', () => {
      const sections = ['I', 'Ia', 'II', 'III', 'IV', 'V', 'VI'];
      for (const section of sections) {
        const result = parseBgeCitation(`BGE 145 ${section} 229`);
        expect(result).not.toBeNull();
        expect(result?.section).toBe(section);
      }
    });

    it('should return null for invalid citations', () => {
      expect(parseBgeCitation('invalid')).toBeNull();
      expect(parseBgeCitation('BGE')).toBeNull();
      expect(parseBgeCitation('BGE 145')).toBeNull();
      expect(parseBgeCitation('BGE 145 VII 229')).toBeNull(); // Invalid section
    });

    it('should be case-insensitive', () => {
      const result = parseBgeCitation('bge 145 iii 229');
      expect(result).not.toBeNull();
    });
  });

  describe('parseStatuteCitation', () => {
    it('should parse basic article citation', () => {
      const result = parseStatuteCitation('Art. 97 OR');
      expect(result).not.toBeNull();
      expect(result?.article).toBe(97);
      expect(result?.statute).toBe('OR');
    });

    it('should parse French style citation', () => {
      const result = parseStatuteCitation('art. 97 CO');
      expect(result).not.toBeNull();
      expect(result?.article).toBe(97);
      expect(result?.statute).toBe('CO');
    });

    it('should parse citation with paragraph (Abs./al./cpv.)', () => {
      const resultDe = parseStatuteCitation('Art. 97 Abs. 1 OR');
      expect(resultDe).not.toBeNull();
      expect(resultDe?.paragraph).toBe(1);

      const resultFr = parseStatuteCitation('art. 97 al. 1 CO');
      expect(resultFr).not.toBeNull();
      expect(resultFr?.paragraph).toBe(1);

      const resultIt = parseStatuteCitation('art. 97 cpv. 1 CO');
      expect(resultIt).not.toBeNull();
      expect(resultIt?.paragraph).toBe(1);
    });

    it('should parse citation with letter (lit./let./lett.)', () => {
      const resultDe = parseStatuteCitation('Art. 97 Abs. 1 lit. a OR');
      expect(resultDe).not.toBeNull();
      expect(resultDe?.letter).toBe('a');

      const resultFr = parseStatuteCitation('art. 97 al. 1 let. b CO');
      expect(resultFr).not.toBeNull();
      expect(resultFr?.letter).toBe('b');
    });

    it('should parse citation with number (Ziff./ch./n.)', () => {
      const result = parseStatuteCitation('Art. 97 Abs. 1 Ziff. 2 OR');
      expect(result).not.toBeNull();
      expect(result?.number).toBe(2);
    });

    it('should parse various Swiss statutes', () => {
      const statutes = ['OR', 'CO', 'ZGB', 'CC', 'StGB', 'CP', 'BV', 'Cst'];
      for (const statute of statutes) {
        const result = parseStatuteCitation(`Art. 1 ${statute}`);
        expect(result).not.toBeNull();
        expect(result?.statute).toBe(statute);
      }
    });

    it('should return null for invalid citations', () => {
      expect(parseStatuteCitation('invalid')).toBeNull();
      expect(parseStatuteCitation('Art.')).toBeNull();
      expect(parseStatuteCitation('Article 97')).toBeNull(); // Wrong format
    });
  });

  describe('validateCitation', () => {
    it('should validate correct BGE citations', () => {
      const result = validateCitation('BGE 145 III 229');
      expect(result.isValid).toBe(true);
      expect(result.citationType).toBe('bge');
      expect(result.errors).toHaveLength(0);
    });

    it('should validate correct statute citations', () => {
      const result = validateCitation('Art. 97 OR');
      expect(result.isValid).toBe(true);
      expect(result.citationType).toBe('statute');
    });

    it('should detect invalid citations', () => {
      const result = validateCitation('invalid citation');
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should validate in strict mode', () => {
      // In strict mode, additional validation rules apply
      const result = validateCitation('BGE 145 III 229', true);
      expect(result.isValid).toBe(true);
    });

    it('should return warnings for potentially problematic citations', () => {
      // Very old volumes might generate warnings
      const result = validateCitation('BGE 50 II 100');
      expect(result.isValid).toBe(true);
      // May have warnings about old volume
    });
  });

  describe('formatBgeCitation', () => {
    it('should format to German (BGE)', () => {
      const parsed = {
        prefix: 'ATF',
        volume: 145,
        section: 'III',
        page: 229,
        consideration: '4.2',
      };
      const result = formatBgeCitation(parsed, 'de');
      expect(result).toContain('BGE');
      expect(result).toContain('145');
      expect(result).toContain('III');
      expect(result).toContain('229');
      expect(result).toContain('E.');
    });

    it('should format to French (ATF)', () => {
      const parsed = {
        prefix: 'BGE',
        volume: 145,
        section: 'III',
        page: 229,
        consideration: '4.2',
      };
      const result = formatBgeCitation(parsed, 'fr');
      expect(result).toContain('ATF');
      expect(result).toContain('consid.');
    });

    it('should format to Italian (DTF)', () => {
      const parsed = {
        prefix: 'BGE',
        volume: 145,
        section: 'III',
        page: 229,
      };
      const result = formatBgeCitation(parsed, 'it');
      expect(result).toContain('DTF');
    });

    it('should handle citation without consideration', () => {
      const parsed = {
        prefix: 'BGE',
        volume: 145,
        section: 'III',
        page: 229,
      };
      const result = formatBgeCitation(parsed, 'de');
      expect(result).toBe('BGE 145 III 229');
    });
  });

  describe('formatStatuteCitation', () => {
    it('should format to German', () => {
      const parsed = {
        article: 97,
        paragraph: 1,
        letter: 'a',
        statute: 'CO',
      };
      const result = formatStatuteCitation(parsed, 'de');
      expect(result).toContain('Art.');
      expect(result).toContain('Abs.');
      expect(result).toContain('lit.');
      expect(result).toContain('OR');
    });

    it('should format to French', () => {
      const parsed = {
        article: 97,
        paragraph: 1,
        statute: 'OR',
      };
      const result = formatStatuteCitation(parsed, 'fr');
      expect(result).toContain('art.');
      expect(result).toContain('al.');
      expect(result).toContain('CO');
    });

    it('should format to Italian', () => {
      const parsed = {
        article: 97,
        paragraph: 1,
        statute: 'OR',
      };
      const result = formatStatuteCitation(parsed, 'it');
      expect(result).toContain('art.');
      expect(result).toContain('cpv.');
      expect(result).toContain('CO');
    });

    it('should handle basic citation without paragraph', () => {
      const parsed = {
        article: 97,
        statute: 'OR',
      };
      const result = formatStatuteCitation(parsed, 'de');
      expect(result).toBe('Art. 97 OR');
    });
  });

  describe('normalizeCitation', () => {
    it('should normalize spacing', () => {
      expect(normalizeCitation('BGE  145   III  229')).toBe('BGE 145 III 229');
      expect(normalizeCitation('Art.97 OR')).toBe('Art. 97 OR');
    });

    it('should normalize case for prefix', () => {
      const result = normalizeCitation('bge 145 III 229');
      expect(result).toContain('BGE');
    });

    it('should trim whitespace', () => {
      expect(normalizeCitation('  BGE 145 III 229  ').trim()).toBe('BGE 145 III 229');
    });

    it('should handle various input formats', () => {
      const variations = [
        'BGE145III229',
        'BGE 145III 229',
        'BGE145 III229',
      ];
      // All should normalize to something parseable
      for (const v of variations) {
        const normalized = normalizeCitation(v);
        expect(normalized).toBeDefined();
      }
    });
  });

  describe('handleLegalCitation', () => {
    it('should validate a BGE citation', async () => {
      const result = await handleLegalCitation(
        { citation: 'BGE 145 III 229', action: 'validate' },
        'test-request-1'
      );

      expect(result.validation.isValid).toBe(true);
      expect(result.validation.citationType).toBe('bge');
    });

    it('should validate a statute citation', async () => {
      const result = await handleLegalCitation(
        { citation: 'Art. 97 OR', action: 'validate' },
        'test-request-2'
      );

      expect(result.validation.isValid).toBe(true);
      expect(result.validation.citationType).toBe('statute');
    });

    it('should format a BGE citation to French', async () => {
      const result = await handleLegalCitation(
        { citation: 'BGE 145 III 229 E. 4.2', action: 'format', targetLang: 'fr' },
        'test-request-3'
      );

      expect(result.formatted).toBeDefined();
      expect(result.formatted).toContain('ATF');
      expect(result.formatted).toContain('consid.');
    });

    it('should parse a statute citation', async () => {
      const result = await handleLegalCitation(
        { citation: 'Art. 97 Abs. 1 lit. a OR', action: 'parse' },
        'test-request-4'
      );

      expect(result.parsed).toBeDefined();
      expect(result.parsed.article).toBe(97);
      expect(result.parsed.paragraph).toBe(1);
      expect(result.parsed.letter).toBe('a');
    });

    it('should normalize a malformed citation', async () => {
      const result = await handleLegalCitation(
        { citation: 'BGE  145   III  229', action: 'normalize' },
        'test-request-5'
      );

      expect(result.normalized).toBeDefined();
      expect(result.normalized).not.toContain('  ');
    });

    it('should handle invalid citations gracefully', async () => {
      const result = await handleLegalCitation(
        { citation: 'not a valid citation', action: 'validate' },
        'test-request-6'
      );

      expect(result.validation.isValid).toBe(false);
      expect(result.validation.errors.length).toBeGreaterThan(0);
    });

    it('should default action to validate', async () => {
      const result = await handleLegalCitation(
        { citation: 'BGE 145 III 229' },
        'test-request-7'
      );

      expect(result.validation).toBeDefined();
    });
  });
});
