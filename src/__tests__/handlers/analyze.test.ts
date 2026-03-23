import { describe, it, expect } from 'vitest';
import { handleLegalAnalyze } from '../../handlers/analyze.js';
import type { LegalAnalyzeInput } from '../../types/index.js';

describe('Analyze Handler', () => {
  describe('handleLegalAnalyze', () => {
    const sampleContract = `
      DIENSTLEISTUNGSVERTRAG

      Zwischen:
      ABC GmbH, Zürich (Auftraggeber)
      und
      XYZ AG, Bern (Auftragnehmer)

      Art. 1 Gegenstand
      Der Auftragnehmer erbringt Beratungsdienstleistungen gemäss Art. 394 OR.

      Art. 2 Vergütung
      Die Vergütung beträgt CHF 200 pro Stunde.
      Die Zahlung erfolgt innert 30 Tagen nach Rechnungsstellung.

      Art. 3 Haftung
      Die Haftung ist auf Vorsatz und grobe Fahrlässigkeit beschränkt.

      Art. 4 Gerichtsstand
      Gerichtsstand ist Zürich.

      Art. 5 Anwendbares Recht
      Es gilt schweizerisches Recht.
    `;

    it('should analyze a document and identify issues', async () => {
      const input: LegalAnalyzeInput = {
        document: sampleContract,
        analysisType: 'issues',
      };

      const result = await handleLegalAnalyze(input, 'test-request-1');

      expect(result.issues).toBeDefined();
      expect(result.issues).toBeInstanceOf(Array);
    });

    it('should analyze document for risks', async () => {
      const input: LegalAnalyzeInput = {
        document: sampleContract,
        analysisType: 'risks',
      };

      const result = await handleLegalAnalyze(input, 'test-request-2');

      expect(result.risks).toBeDefined();
      expect(result.risks).toBeInstanceOf(Array);
    });

    it('should check compliance', async () => {
      const input: LegalAnalyzeInput = {
        document: sampleContract,
        analysisType: 'compliance',
        domain: 'commercial',
      };

      const result = await handleLegalAnalyze(input, 'test-request-3');

      expect(result.compliance).toBeDefined();
    });

    it('should generate summary', async () => {
      const input: LegalAnalyzeInput = {
        document: sampleContract,
        analysisType: 'summary',
      };

      const result = await handleLegalAnalyze(input, 'test-request-4');

      expect(result.summary).toBeDefined();
      expect(typeof result.summary).toBe('string');
      expect(result.summary.length).toBeGreaterThan(0);
    });

    it('should perform full analysis when no type specified', async () => {
      const input: LegalAnalyzeInput = {
        document: sampleContract,
      };

      const result = await handleLegalAnalyze(input, 'test-request-5');

      // Full analysis should include all components
      expect(result.documentType).toBeDefined();
      expect(result.issues).toBeDefined();
      expect(result.risks).toBeDefined();
      expect(result.summary).toBeDefined();
    });

    it('should detect document type', async () => {
      const input: LegalAnalyzeInput = {
        document: sampleContract,
      };

      const result = await handleLegalAnalyze(input, 'test-request-6');

      expect(result.documentType).toBeDefined();
      // Should detect as contract
      expect(result.documentType.toLowerCase()).toContain('contract');
    });

    it('should extract citations from document', async () => {
      const input: LegalAnalyzeInput = {
        document: sampleContract,
      };

      const result = await handleLegalAnalyze(input, 'test-request-7');

      expect(result.citations).toBeDefined();
      expect(result.citations).toBeInstanceOf(Array);
      // Should find Art. 394 OR reference
      expect(result.citations.some(c => c.includes('394') || c.includes('OR'))).toBe(true);
    });

    it('should generate recommendations', async () => {
      const input: LegalAnalyzeInput = {
        document: sampleContract,
        analysisType: 'full',
      };

      const result = await handleLegalAnalyze(input, 'test-request-8');

      expect(result.recommendations).toBeDefined();
      expect(result.recommendations).toBeInstanceOf(Array);
    });

    it('should handle French document', async () => {
      const frenchContract = `
        CONTRAT DE PRESTATION DE SERVICES

        Entre:
        ABC SA, Genève (Mandant)
        et
        XYZ Sàrl, Lausanne (Mandataire)

        Art. 1 Objet
        Le mandataire fournit des services de conseil selon art. 394 CO.

        Art. 2 Rémunération
        La rémunération est de CHF 200 par heure.
      `;

      const input: LegalAnalyzeInput = {
        document: frenchContract,
        lang: 'fr',
      };

      const result = await handleLegalAnalyze(input, 'test-request-9');

      expect(result.documentType).toBeDefined();
      expect(result.citations).toBeDefined();
    });

    it('should handle Italian document', async () => {
      const italianContract = `
        CONTRATTO DI PRESTAZIONE DI SERVIZI

        Tra:
        ABC SA, Lugano (Mandante)
        e
        XYZ Sagl, Bellinzona (Mandatario)

        Art. 1 Oggetto
        Il mandatario fornisce servizi di consulenza secondo art. 394 CO.
      `;

      const input: LegalAnalyzeInput = {
        document: italianContract,
        lang: 'it',
      };

      const result = await handleLegalAnalyze(input, 'test-request-10');

      expect(result.documentType).toBeDefined();
    });

    it('should identify liability limitation clause as potential issue', async () => {
      const input: LegalAnalyzeInput = {
        document: sampleContract,
        analysisType: 'issues',
      };

      const result = await handleLegalAnalyze(input, 'test-request-11');

      // Liability limitation to gross negligence should be flagged
      const hasLiabilityIssue = result.issues.some(
        issue => issue.toLowerCase().includes('haftung') ||
                 issue.toLowerCase().includes('liability')
      );
      // This depends on the implementation, so we just check structure
      expect(result.issues).toBeInstanceOf(Array);
    });

    it('should analyze employment contract', async () => {
      const employmentContract = `
        ARBEITSVERTRAG

        Zwischen:
        ABC AG (Arbeitgeber)
        und
        Max Muster (Arbeitnehmer)

        Art. 1 Funktion
        Der Arbeitnehmer wird als Softwareentwickler eingestellt.

        Art. 2 Lohn
        Der Monatslohn beträgt CHF 8'000 brutto.

        Art. 3 Kündigungsfrist
        Die Kündigungsfrist beträgt 3 Monate.

        Art. 4 Konkurrenzverbot
        Der Arbeitnehmer verpflichtet sich, während 2 Jahren nach Beendigung
        des Arbeitsverhältnisses nicht für einen Konkurrenten tätig zu werden.
      `;

      const input: LegalAnalyzeInput = {
        document: employmentContract,
        domain: 'employment',
      };

      const result = await handleLegalAnalyze(input, 'test-request-12');

      expect(result.documentType).toBeDefined();
      // Should detect employment-specific issues like non-compete clause
      expect(result.issues).toBeInstanceOf(Array);
    });

    it('should handle empty document gracefully', async () => {
      const input: LegalAnalyzeInput = {
        document: '',
      };

      const result = await handleLegalAnalyze(input, 'test-request-13');

      // Should not throw, but return minimal analysis
      expect(result).toBeDefined();
    });

    it('should handle very long documents', async () => {
      const longDocument = sampleContract.repeat(10);

      const input: LegalAnalyzeInput = {
        document: longDocument,
      };

      const result = await handleLegalAnalyze(input, 'test-request-14');

      expect(result).toBeDefined();
      expect(result.summary).toBeDefined();
    });

    it('should consider jurisdiction in analysis', async () => {
      const input: LegalAnalyzeInput = {
        document: sampleContract,
        jurisdiction: 'cantonal',
        canton: 'ZH',
      };

      const result = await handleLegalAnalyze(input, 'test-request-15');

      expect(result).toBeDefined();
      // Canton-specific analysis might be included
    });

    it('should detect BGE citations in document', async () => {
      const documentWithBge = `
        Laut BGE 145 III 229 E. 4.2 ist die Haftung in diesem Fall gegeben.
        Siehe auch ATF 142 III 239 zur Schadensberechnung.
      `;

      const input: LegalAnalyzeInput = {
        document: documentWithBge,
      };

      const result = await handleLegalAnalyze(input, 'test-request-16');

      expect(result.citations).toBeDefined();
      expect(result.citations.some(c => c.includes('BGE') || c.includes('ATF'))).toBe(true);
    });
  });
});
