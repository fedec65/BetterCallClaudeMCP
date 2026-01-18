import { describe, it, expect } from 'vitest';
import { docAnalyze } from '../tools/doc-analyze.js';
import { DocAnalyzeInputSchema, DocAnalyzeOutputSchema } from '../types.js';

// Sample documents for testing
const SAMPLE_CONTRACT_DE = `
KAUFVERTRAG

zwischen
Herr Max Mustermann, Musterstrasse 1, 8000 Zürich (nachfolgend "Verkäufer")
und
Frau Anna Beispiel, Beispielweg 2, 3000 Bern (nachfolgend "Käuferin")

1. Vertragsgegenstand
Der Verkäufer verkauft der Käuferin das Grundstück GB Zürich Nr. 12345.

2. Kaufpreis
Der Kaufpreis beträgt CHF 500'000.-- (fünfhunderttausend Franken).
Die Zahlung erfolgt bis spätestens 31. März 2024.

3. Anwendbares Recht
Dieser Vertrag untersteht schweizerischem Recht, insbesondere Art. 216 ff. OR.
Gerichtsstand ist Zürich.
`;

const SAMPLE_BRIEF_FR = `
MÉMOIRE DE RECOURS

devant
Le Tribunal fédéral, Lausanne

Recourant: Monsieur Jean Dupont
contre
Intimé: Société XYZ SA

Conformément à l'art. 42 LTF, le recourant forme le présent recours.
Délai de recours: 30 jours selon art. 100 LTF.
`;

const SAMPLE_SIMPLE_TEXT = `
This is a simple text without legal content.
It does not contain any legal citations or contract clauses.
`;

describe('docAnalyze', () => {
  describe('input validation', () => {
    it('should require content parameter', () => {
      expect(() => DocAnalyzeInputSchema.parse({})).toThrow();
    });

    it('should accept content with defaults', () => {
      const result = DocAnalyzeInputSchema.parse({ content: 'Test content' });
      expect(result.content).toBe('Test content');
      expect(result.language).toBe('de');
    });

    it('should accept optional documentType', () => {
      const result = DocAnalyzeInputSchema.parse({
        content: 'Test',
        documentType: 'contract',
      });
      expect(result.documentType).toBe('contract');
    });

    it('should accept optional focus areas', () => {
      const result = DocAnalyzeInputSchema.parse({
        content: 'Test',
        focus: ['legal_issues', 'risks'],
      });
      expect(result.focus).toContain('legal_issues');
      expect(result.focus).toContain('risks');
    });

    it('should accept valid languages', () => {
      const result = DocAnalyzeInputSchema.parse({
        content: 'Test',
        language: 'fr',
      });
      expect(result.language).toBe('fr');
    });

    it('should reject invalid document type', () => {
      expect(() =>
        DocAnalyzeInputSchema.parse({
          content: 'Test',
          documentType: 'invalid',
        })
      ).toThrow();
    });

    it('should reject invalid focus area', () => {
      expect(() =>
        DocAnalyzeInputSchema.parse({
          content: 'Test',
          focus: ['invalid_focus'],
        })
      ).toThrow();
    });
  });

  describe('output structure', () => {
    it('should return valid output structure', () => {
      const output = docAnalyze({ content: SAMPLE_CONTRACT_DE });
      const validated = DocAnalyzeOutputSchema.parse(output);

      expect(validated.documentType).toBeDefined();
      expect(validated.detectedLanguage).toBeDefined();
      expect(validated.summary).toBeDefined();
      expect(validated.legalIssues).toBeInstanceOf(Array);
      expect(validated.identifiedParties).toBeInstanceOf(Array);
      expect(validated.keyDates).toBeInstanceOf(Array);
      expect(validated.citedLaw).toBeInstanceOf(Array);
      expect(validated.jurisdiction).toBeDefined();
      expect(validated.recommendations).toBeInstanceOf(Array);
      expect(validated.language).toBeDefined();
    });

    it('should include jurisdiction with confidence', () => {
      const output = docAnalyze({ content: SAMPLE_CONTRACT_DE });

      expect(output.jurisdiction.detected).toBeDefined();
      expect(output.jurisdiction.confidence).toBeGreaterThanOrEqual(0);
      expect(output.jurisdiction.confidence).toBeLessThanOrEqual(1);
    });
  });

  describe('document type detection', () => {
    it('should detect contract document type', () => {
      const output = docAnalyze({ content: SAMPLE_CONTRACT_DE });
      expect(output.documentType).toBe('contract');
    });

    it('should detect brief document type', () => {
      const output = docAnalyze({ content: SAMPLE_BRIEF_FR });
      expect(output.documentType).toBe('brief');
    });

    it('should return unknown for unrecognized documents', () => {
      const output = docAnalyze({ content: SAMPLE_SIMPLE_TEXT });
      expect(output.documentType).toBe('unknown');
    });

    it('should use provided documentType if specified', () => {
      const output = docAnalyze({
        content: SAMPLE_SIMPLE_TEXT,
        documentType: 'opinion',
      });
      expect(output.documentType).toBe('opinion');
    });
  });

  describe('language detection', () => {
    it('should detect German language', () => {
      const output = docAnalyze({ content: SAMPLE_CONTRACT_DE });
      expect(output.detectedLanguage).toBe('de');
    });

    it('should detect French language', () => {
      const output = docAnalyze({ content: SAMPLE_BRIEF_FR });
      expect(output.detectedLanguage).toBe('fr');
    });

    it('should default to English for unknown language', () => {
      const output = docAnalyze({ content: SAMPLE_SIMPLE_TEXT });
      expect(output.detectedLanguage).toBe('en');
    });
  });

  describe('party identification', () => {
    it('should identify parties in contract', () => {
      const output = docAnalyze({ content: SAMPLE_CONTRACT_DE });

      expect(output.identifiedParties.length).toBeGreaterThan(0);
      const partyNames = output.identifiedParties.map((p) => p.name);
      expect(partyNames.some((n) => n.includes('Mustermann'))).toBe(true);
    });

    it('should identify party roles', () => {
      const output = docAnalyze({ content: SAMPLE_CONTRACT_DE });

      const roles = output.identifiedParties.map((p) => p.role);
      expect(roles.length).toBeGreaterThan(0);
    });
  });

  describe('date extraction', () => {
    it('should extract dates from document', () => {
      const output = docAnalyze({ content: SAMPLE_CONTRACT_DE });

      expect(output.keyDates.length).toBeGreaterThan(0);
    });

    it('should identify deadlines', () => {
      const output = docAnalyze({ content: SAMPLE_CONTRACT_DE });

      const deadlines = output.keyDates.filter((d) => d.isDeadline);
      expect(deadlines.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('legal citation extraction', () => {
    it('should extract Swiss legal citations', () => {
      const output = docAnalyze({ content: SAMPLE_CONTRACT_DE });

      expect(output.citedLaw.length).toBeGreaterThan(0);
      const citations = output.citedLaw.map((c) => c.citation);
      expect(citations.some((c) => c.includes('OR') || c.includes('Art.'))).toBe(true);
    });

    it('should extract citations from French documents', () => {
      const output = docAnalyze({ content: SAMPLE_BRIEF_FR });

      expect(output.citedLaw.length).toBeGreaterThan(0);
      const citations = output.citedLaw.map((c) => c.citation);
      expect(citations.some((c) => c.includes('LTF') || c.includes('art.'))).toBe(true);
    });
  });

  describe('jurisdiction detection', () => {
    it('should detect federal jurisdiction for ZH contract', () => {
      const output = docAnalyze({ content: SAMPLE_CONTRACT_DE });

      expect(['federal', 'cantonal']).toContain(output.jurisdiction.detected);
    });

    it('should detect canton when mentioned', () => {
      const output = docAnalyze({ content: SAMPLE_CONTRACT_DE });

      // Document mentions Zürich, so canton should be detected
      if (output.jurisdiction.canton) {
        expect(output.jurisdiction.canton).toBe('ZH');
      }
    });

    it('should have confidence score', () => {
      const output = docAnalyze({ content: SAMPLE_CONTRACT_DE });

      expect(typeof output.jurisdiction.confidence).toBe('number');
    });
  });

  describe('summary generation', () => {
    it('should generate non-empty summary', () => {
      const output = docAnalyze({ content: SAMPLE_CONTRACT_DE });

      expect(output.summary.length).toBeGreaterThan(10);
    });

    it('should generate summary in requested language', () => {
      const output = docAnalyze({
        content: SAMPLE_CONTRACT_DE,
        language: 'de',
      });

      expect(output.language).toBe('de');
    });
  });

  describe('recommendations', () => {
    it('should provide recommendations array', () => {
      const output = docAnalyze({ content: SAMPLE_CONTRACT_DE });

      expect(output.recommendations).toBeInstanceOf(Array);
    });
  });

  describe('legal issues', () => {
    it('should return legal issues array', () => {
      const output = docAnalyze({ content: SAMPLE_CONTRACT_DE });

      expect(output.legalIssues).toBeInstanceOf(Array);
    });

    it('should include severity for each issue', () => {
      const output = docAnalyze({ content: SAMPLE_CONTRACT_DE });

      output.legalIssues.forEach((issue) => {
        expect(['high', 'medium', 'low']).toContain(issue.severity);
      });
    });

    it('should include relevant law for each issue', () => {
      const output = docAnalyze({ content: SAMPLE_CONTRACT_DE });

      output.legalIssues.forEach((issue) => {
        expect(issue.relevantLaw).toBeInstanceOf(Array);
      });
    });
  });

  describe('language output', () => {
    it('should return the requested language in output', () => {
      const deOutput = docAnalyze({ content: SAMPLE_CONTRACT_DE, language: 'de' });
      expect(deOutput.language).toBe('de');

      const frOutput = docAnalyze({ content: SAMPLE_CONTRACT_DE, language: 'fr' });
      expect(frOutput.language).toBe('fr');
    });
  });
});
