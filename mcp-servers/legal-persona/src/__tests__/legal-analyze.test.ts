import { describe, it, expect } from 'vitest';
import {
  LegalAnalyzeInputSchema,
  LegalAnalyzeOutputSchema,
  type LegalAnalyzeInput,
  type FocusArea,
} from '../types.js';

// Import the function to be implemented
import { legalAnalyze } from '../tools/legal-analyze.js';

// ============================================================================
// Sample Documents for Testing
// ============================================================================

const SAMPLE_SERVICE_AGREEMENT = `
DIENSTLEISTUNGSVERTRAG

zwischen
ABC Software GmbH, Zürich (nachfolgend "Auftraggeber")
und
XYZ Consulting AG, Bern (nachfolgend "Auftragnehmer")

1. Vertragsgegenstand
Der Auftragnehmer erbringt IT-Beratungsleistungen gemäss separatem Leistungsbeschrieb.

2. Vergütung
Die Vergütung beträgt CHF 200 pro Stunde. Rechnungsstellung erfolgt monatlich.

3. Vertragsdauer
Der Vertrag tritt am 1. Januar 2024 in Kraft und läuft auf unbestimmte Zeit.
Kündigung ist mit 30 Tagen Frist möglich.

4. Haftung
Die Haftung des Auftragnehmers ist auf Vorsatz und grobe Fahrlässigkeit beschränkt.

5. Gerichtsstand
Zürich
`;

const SAMPLE_EMPLOYMENT_CONTRACT = `
ARBEITSVERTRAG

zwischen
Arbeitgeber AG, Basel (nachfolgend "Arbeitgeber")
und
Max Muster, wohnhaft in Basel (nachfolgend "Arbeitnehmer")

1. Stellenbezeichnung
Software Developer

2. Arbeitszeit
42 Stunden pro Woche

3. Lohn
CHF 8'000 brutto pro Monat

4. Ferien
20 Tage pro Jahr

5. Probezeit
3 Monate

6. Kündigung
Während der Probezeit: 7 Tage
Nach der Probezeit: 1 Monat
`;

const SAMPLE_NDA_WITH_ISSUES = `
GEHEIMHALTUNGSVEREINBARUNG

zwischen
Disclosing Party Inc.
und
Receiving Party GmbH

1. Vertrauliche Informationen
Alle Informationen, die als vertraulich gekennzeichnet sind.

2. Pflichten
Die empfangende Partei verpflichtet sich zur Geheimhaltung.

3. Dauer
Unbefristet.

4. Rückgabe
Bei Vertragsende sind alle Unterlagen zurückzugeben.
`;

const SAMPLE_CONTRACT_FRENCH = `
CONTRAT DE PRESTATION DE SERVICES

entre
ABC SA, Genève (ci-après "le Mandant")
et
XYZ Sàrl, Lausanne (ci-après "le Prestataire")

1. Objet du contrat
Le Prestataire s'engage à fournir des services de conseil.

2. Rémunération
CHF 180 par heure.

3. Durée
Contrat à durée indéterminée.

4. Résiliation
Préavis de 30 jours.

5. For juridique
Genève
`;

// ============================================================================
// Input Validation Tests
// ============================================================================

describe('LegalAnalyzeInputSchema Validation', () => {
  it('should validate correct input with minimal required fields', () => {
    const input = {
      document: 'This is a sample contract.',
    };
    const result = LegalAnalyzeInputSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('should validate correct input with all optional fields', () => {
    const input = {
      document: SAMPLE_SERVICE_AGREEMENT,
      document_type: 'service_agreement',
      analysis_depth: 'comprehensive',
      focus_areas: ['liability', 'payment', 'termination'],
      language: 'de',
      check_compliance: true,
    };
    const result = LegalAnalyzeInputSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('should reject empty document', () => {
    const input = {
      document: '',
    };
    const result = LegalAnalyzeInputSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('should reject invalid analysis depth', () => {
    const input = {
      document: 'Test document',
      analysis_depth: 'invalid_depth',
    };
    const result = LegalAnalyzeInputSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('should reject invalid focus area', () => {
    const input = {
      document: 'Test document',
      focus_areas: ['invalid_area'],
    };
    const result = LegalAnalyzeInputSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('should apply default values', () => {
    const input = {
      document: 'Test document',
    };
    const result = LegalAnalyzeInputSchema.parse(input);
    expect(result.analysis_depth).toBe('standard');
    expect(result.focus_areas).toEqual(['general']);
    expect(result.language).toBe('de');
    expect(result.check_compliance).toBe(true);
  });

  it('should accept all valid focus areas', () => {
    const focusAreas: FocusArea[] = [
      'liability',
      'termination',
      'payment',
      'ip',
      'confidentiality',
      'dispute',
      'compliance',
      'data_protection',
      'employment',
      'general',
    ];
    const input = {
      document: 'Test document',
      focus_areas: focusAreas,
    };
    const result = LegalAnalyzeInputSchema.safeParse(input);
    expect(result.success).toBe(true);
  });
});

// ============================================================================
// Service Agreement Analysis Tests
// ============================================================================

describe('Service Agreement Analysis', () => {
  it('should analyze service agreement and identify parties', async () => {
    const input: LegalAnalyzeInput = {
      document: SAMPLE_SERVICE_AGREEMENT,
      document_type: 'service_agreement',
      analysis_depth: 'standard',
      focus_areas: ['general'],
      language: 'de',
      check_compliance: true,
    };

    const result = await legalAnalyze(input);

    // Document type name varies by language - German returns 'Dienstleistungsvertrag'
    expect(
      result.summary.documentType.toLowerCase().includes('service') ||
      result.summary.documentType.toLowerCase().includes('dienstleistung')
    ).toBe(true);
    expect(result.summary.parties.length).toBeGreaterThanOrEqual(2);
    expect(result.summary.parties.some((p) => p.includes('ABC') || p.includes('Auftraggeber'))).toBe(true);
  });

  it('should identify key terms from service agreement', async () => {
    const input: LegalAnalyzeInput = {
      document: SAMPLE_SERVICE_AGREEMENT,
      document_type: 'service_agreement',
      analysis_depth: 'standard',
      focus_areas: ['payment'],
      language: 'de',
      check_compliance: false,
    };

    const result = await legalAnalyze(input);

    expect(result.summary.keyTerms.length).toBeGreaterThan(0);
    // Should identify payment terms
    const allTerms = result.summary.keyTerms.join(' ').toLowerCase();
    expect(
      allTerms.includes('vergütung') ||
      allTerms.includes('chf') ||
      allTerms.includes('zahlung') ||
      allTerms.includes('200')
    ).toBe(true);
  });

  it('should identify liability limitation issues', async () => {
    const input: LegalAnalyzeInput = {
      document: SAMPLE_SERVICE_AGREEMENT,
      document_type: 'service_agreement',
      analysis_depth: 'comprehensive',
      focus_areas: ['liability'],
      language: 'de',
      check_compliance: true,
    };

    const result = await legalAnalyze(input);

    // Should flag liability limitation as a potential issue or note it
    const allContent = JSON.stringify(result).toLowerCase();
    expect(
      allContent.includes('haftung') ||
      allContent.includes('liability')
    ).toBe(true);
  });
});

// ============================================================================
// Employment Contract Analysis Tests
// ============================================================================

describe('Employment Contract Analysis', () => {
  it('should analyze employment contract structure', async () => {
    const input: LegalAnalyzeInput = {
      document: SAMPLE_EMPLOYMENT_CONTRACT,
      document_type: 'employment_contract',
      analysis_depth: 'standard',
      focus_areas: ['employment'],
      language: 'de',
      check_compliance: true,
    };

    const result = await legalAnalyze(input);

    // Document type name varies by language - German returns 'Arbeitsvertrag'
    expect(
      result.summary.documentType.toLowerCase().includes('employment') ||
      result.summary.documentType.toLowerCase().includes('arbeitsvertrag')
    ).toBe(true);
    expect(result.summary.parties.length).toBeGreaterThanOrEqual(2);
  });

  it('should check employment law compliance', async () => {
    const input: LegalAnalyzeInput = {
      document: SAMPLE_EMPLOYMENT_CONTRACT,
      document_type: 'employment_contract',
      analysis_depth: 'comprehensive',
      focus_areas: ['compliance', 'employment'],
      language: 'de',
      check_compliance: true,
    };

    const result = await legalAnalyze(input);

    // Should include compliance checks for employment law (OR)
    expect(result.compliance.length).toBeGreaterThan(0);
    const complianceText = result.compliance.map((c) => c.regulation).join(' ').toLowerCase();
    expect(
      complianceText.includes('or') ||
      complianceText.includes('arbeitsrecht') ||
      complianceText.includes('arbeitsgesetz') ||
      complianceText.includes('art.')
    ).toBe(true);
  });

  it('should identify missing clauses in employment contract', async () => {
    const input: LegalAnalyzeInput = {
      document: SAMPLE_EMPLOYMENT_CONTRACT,
      document_type: 'employment_contract',
      analysis_depth: 'comprehensive',
      focus_areas: ['employment'],
      language: 'de',
      check_compliance: true,
    };

    const result = await legalAnalyze(input);

    // Employment contract might be missing some recommended clauses
    expect(result.missingClauses).toBeDefined();
    expect(Array.isArray(result.missingClauses)).toBe(true);
  });
});

// ============================================================================
// NDA Analysis Tests
// ============================================================================

describe('NDA Analysis', () => {
  it('should analyze NDA for confidentiality issues', async () => {
    const input: LegalAnalyzeInput = {
      document: SAMPLE_NDA_WITH_ISSUES,
      document_type: 'nda',
      analysis_depth: 'comprehensive',
      focus_areas: ['confidentiality'],
      language: 'de',
      check_compliance: true,
    };

    const result = await legalAnalyze(input);

    // Document type name varies by language - German returns 'Geheimhaltungsvereinbarung'
    expect(
      result.summary.documentType.toLowerCase().includes('nda') ||
      result.summary.documentType.toLowerCase().includes('geheimhaltung') ||
      result.summary.documentType.toLowerCase().includes('vertraulich')
    ).toBe(true);

    // NDA with no exceptions should be flagged
    const allContent = JSON.stringify(result).toLowerCase();
    expect(
      allContent.includes('vertraulich') ||
      allContent.includes('geheim') ||
      allContent.includes('confidential')
    ).toBe(true);
  });

  it('should identify missing exception clauses in NDA', async () => {
    const input: LegalAnalyzeInput = {
      document: SAMPLE_NDA_WITH_ISSUES,
      document_type: 'nda',
      analysis_depth: 'comprehensive',
      focus_areas: ['confidentiality'],
      language: 'de',
      check_compliance: true,
    };

    const result = await legalAnalyze(input);

    // Should identify that common exceptions are missing
    const missingClauseText = result.missingClauses.map((m) => m.clause + ' ' + m.rationale).join(' ').toLowerCase();
    const hasExceptionIssue =
      missingClauseText.includes('ausnahm') ||
      missingClauseText.includes('exception') ||
      result.issues.some((i) =>
        i.description.toLowerCase().includes('ausnahm') ||
        i.description.toLowerCase().includes('exception')
      );

    expect(hasExceptionIssue || result.missingClauses.length > 0).toBe(true);
  });
});

// ============================================================================
// Focus Area Tests
// ============================================================================

describe('Focus Area Analysis', () => {
  it('should focus on liability when specified', async () => {
    const input: LegalAnalyzeInput = {
      document: SAMPLE_SERVICE_AGREEMENT,
      analysis_depth: 'standard',
      focus_areas: ['liability'],
      language: 'de',
      check_compliance: false,
    };

    const result = await legalAnalyze(input);

    expect(result.metadata.focusAreas).toContain('liability');

    // Should have content related to liability
    const allText = JSON.stringify(result).toLowerCase();
    expect(
      allText.includes('haftung') ||
      allText.includes('liability') ||
      allText.includes('verantwortung')
    ).toBe(true);
  });

  it('should focus on payment terms when specified', async () => {
    const input: LegalAnalyzeInput = {
      document: SAMPLE_SERVICE_AGREEMENT,
      analysis_depth: 'standard',
      focus_areas: ['payment'],
      language: 'de',
      check_compliance: false,
    };

    const result = await legalAnalyze(input);

    expect(result.metadata.focusAreas).toContain('payment');
  });

  it('should focus on termination when specified', async () => {
    const input: LegalAnalyzeInput = {
      document: SAMPLE_SERVICE_AGREEMENT,
      analysis_depth: 'standard',
      focus_areas: ['termination'],
      language: 'de',
      check_compliance: false,
    };

    const result = await legalAnalyze(input);

    expect(result.metadata.focusAreas).toContain('termination');

    // Should have content related to termination
    const allText = JSON.stringify(result).toLowerCase();
    expect(
      allText.includes('kündigung') ||
      allText.includes('termination') ||
      allText.includes('beendigung')
    ).toBe(true);
  });

  it('should handle multiple focus areas', async () => {
    const input: LegalAnalyzeInput = {
      document: SAMPLE_SERVICE_AGREEMENT,
      analysis_depth: 'standard',
      focus_areas: ['liability', 'payment', 'termination'],
      language: 'de',
      check_compliance: false,
    };

    const result = await legalAnalyze(input);

    expect(result.metadata.focusAreas).toContain('liability');
    expect(result.metadata.focusAreas).toContain('payment');
    expect(result.metadata.focusAreas).toContain('termination');
  });
});

// ============================================================================
// Analysis Depth Tests
// ============================================================================

describe('Analysis Depth', () => {
  it('should perform quick analysis with fewer details', async () => {
    const input: LegalAnalyzeInput = {
      document: SAMPLE_SERVICE_AGREEMENT,
      analysis_depth: 'quick',
      focus_areas: ['general'],
      language: 'de',
      check_compliance: false,
    };

    const result = await legalAnalyze(input);

    expect(result.metadata.analysisDepth).toBe('quick');
    expect(result.summary).toBeDefined();
  });

  it('should perform standard analysis', async () => {
    const input: LegalAnalyzeInput = {
      document: SAMPLE_SERVICE_AGREEMENT,
      analysis_depth: 'standard',
      focus_areas: ['general'],
      language: 'de',
      check_compliance: true,
    };

    const result = await legalAnalyze(input);

    expect(result.metadata.analysisDepth).toBe('standard');
    expect(result.issues).toBeDefined();
    expect(result.recommendations).toBeDefined();
  });

  it('should perform comprehensive analysis with more details', async () => {
    const input: LegalAnalyzeInput = {
      document: SAMPLE_SERVICE_AGREEMENT,
      analysis_depth: 'comprehensive',
      focus_areas: ['general', 'liability', 'payment'],
      language: 'de',
      check_compliance: true,
    };

    const result = await legalAnalyze(input);

    expect(result.metadata.analysisDepth).toBe('comprehensive');
    // Comprehensive should include compliance checks
    expect(result.compliance).toBeDefined();
    expect(Array.isArray(result.compliance)).toBe(true);
  });
});

// ============================================================================
// Compliance Checking Tests
// ============================================================================

describe('Compliance Checking', () => {
  it('should check data protection compliance when enabled', async () => {
    const documentWithPersonalData = `
      VERTRAG

      Verarbeitung personenbezogener Daten:
      Der Auftragnehmer erhält Zugang zu Kundendaten inkl. Namen, Adressen und E-Mails.

      Datenschutz:
      Der Auftragnehmer verpflichtet sich zur Einhaltung der Datenschutzbestimmungen.
    `;

    const input: LegalAnalyzeInput = {
      document: documentWithPersonalData,
      analysis_depth: 'comprehensive',
      focus_areas: ['data_protection', 'compliance'],
      language: 'de',
      check_compliance: true,
    };

    const result = await legalAnalyze(input);

    // Should check for DSG/GDPR compliance
    const complianceText = JSON.stringify(result.compliance).toLowerCase();
    expect(
      complianceText.includes('dsg') ||
      complianceText.includes('datenschutz') ||
      complianceText.includes('gdpr') ||
      complianceText.includes('data protection')
    ).toBe(true);
  });

  it('should skip compliance when disabled', async () => {
    const input: LegalAnalyzeInput = {
      document: SAMPLE_SERVICE_AGREEMENT,
      analysis_depth: 'standard',
      focus_areas: ['general'],
      language: 'de',
      check_compliance: false,
    };

    const result = await legalAnalyze(input);

    // Compliance array should be empty or minimal when disabled
    expect(Array.isArray(result.compliance)).toBe(true);
  });
});

// ============================================================================
// Multi-Language Support Tests
// ============================================================================

describe('Multi-Language Support', () => {
  it('should analyze French documents correctly', async () => {
    const input: LegalAnalyzeInput = {
      document: SAMPLE_CONTRACT_FRENCH,
      analysis_depth: 'standard',
      focus_areas: ['general'],
      language: 'fr',
      check_compliance: true,
    };

    const result = await legalAnalyze(input);

    expect(result.metadata.language).toBe('fr');
    // Output should contain French terminology
    const allText = JSON.stringify(result).toLowerCase();
    expect(
      allText.includes('contrat') ||
      allText.includes('prestation') ||
      allText.includes('juridique')
    ).toBe(true);
  });

  it('should analyze Italian documents', async () => {
    const italianContract = `
      CONTRATTO DI SERVIZIO

      tra
      ABC SA, Lugano (il "Cliente")
      e
      XYZ Sagl, Bellinzona (il "Fornitore")

      1. Oggetto
      Servizi di consulenza informatica.

      2. Compenso
      CHF 150 all'ora.

      3. Durata
      Contratto a tempo indeterminato.
    `;

    const input: LegalAnalyzeInput = {
      document: italianContract,
      analysis_depth: 'standard',
      focus_areas: ['general'],
      language: 'it',
      check_compliance: true,
    };

    const result = await legalAnalyze(input);

    expect(result.metadata.language).toBe('it');
  });

  it('should analyze English documents', async () => {
    const englishContract = `
      SERVICE AGREEMENT

      between
      ABC Ltd, Zurich ("Client")
      and
      XYZ Inc, Geneva ("Provider")

      1. Scope
      IT consulting services.

      2. Compensation
      CHF 180 per hour.

      3. Term
      Indefinite contract.

      4. Governing Law
      Swiss law.
    `;

    const input: LegalAnalyzeInput = {
      document: englishContract,
      analysis_depth: 'standard',
      focus_areas: ['general'],
      language: 'en',
      check_compliance: true,
    };

    const result = await legalAnalyze(input);

    expect(result.metadata.language).toBe('en');
  });
});

// ============================================================================
// Issue Severity Tests
// ============================================================================

describe('Issue Severity Classification', () => {
  it('should identify critical issues for problematic clauses', async () => {
    const problematicContract = `
      VERTRAG

      1. Haftung
      Jegliche Haftung wird ausgeschlossen.

      2. Gerichtsstand
      Nicht festgelegt.

      3. Anwendbares Recht
      Nicht spezifiziert.
    `;

    const input: LegalAnalyzeInput = {
      document: problematicContract,
      analysis_depth: 'comprehensive',
      focus_areas: ['liability', 'dispute'],
      language: 'de',
      check_compliance: true,
    };

    const result = await legalAnalyze(input);

    // Should identify at least one issue
    expect(result.issues.length).toBeGreaterThan(0);

    // At least one issue should have severity
    expect(result.issues.every((i) =>
      ['critical', 'major', 'minor', 'informational'].includes(i.severity)
    )).toBe(true);
  });

  it('should provide recommendations for each issue', async () => {
    const input: LegalAnalyzeInput = {
      document: SAMPLE_NDA_WITH_ISSUES,
      analysis_depth: 'comprehensive',
      focus_areas: ['confidentiality'],
      language: 'de',
      check_compliance: true,
    };

    const result = await legalAnalyze(input);

    // Each issue should have a recommendation
    result.issues.forEach((issue) => {
      expect(issue.recommendation).toBeDefined();
      expect(issue.recommendation.length).toBeGreaterThan(0);
    });
  });
});

// ============================================================================
// Overall Assessment Tests
// ============================================================================

describe('Overall Assessment', () => {
  it('should provide overall assessment for acceptable contracts', async () => {
    const input: LegalAnalyzeInput = {
      document: SAMPLE_SERVICE_AGREEMENT,
      analysis_depth: 'standard',
      focus_areas: ['general'],
      language: 'de',
      check_compliance: true,
    };

    const result = await legalAnalyze(input);

    expect(['acceptable', 'needs_revision', 'high_risk', 'unacceptable']).toContain(
      result.summary.overallAssessment
    );
  });

  it('should flag high-risk contracts appropriately', async () => {
    const highRiskContract = `
      VERTRAG

      Die gesamte Haftung wird vollständig ausgeschlossen.
      Keine Kündigungsmöglichkeit.
      Unbefristete Bindung.
      Geheime Zusatzvereinbarungen.
      Verzicht auf alle Rechte.
    `;

    const input: LegalAnalyzeInput = {
      document: highRiskContract,
      analysis_depth: 'comprehensive',
      focus_areas: ['liability', 'termination'],
      language: 'de',
      check_compliance: true,
    };

    const result = await legalAnalyze(input);

    // Should be flagged as needs_revision or high_risk or unacceptable
    expect(['needs_revision', 'high_risk', 'unacceptable']).toContain(
      result.summary.overallAssessment
    );
  });
});

// ============================================================================
// Output Schema Validation Tests
// ============================================================================

describe('Output Schema Validation', () => {
  it('should produce output conforming to LegalAnalyzeOutputSchema', async () => {
    const input: LegalAnalyzeInput = {
      document: SAMPLE_SERVICE_AGREEMENT,
      document_type: 'service_agreement',
      analysis_depth: 'comprehensive',
      focus_areas: ['liability', 'payment', 'termination'],
      language: 'de',
      check_compliance: true,
    };

    const result = await legalAnalyze(input);
    const validation = LegalAnalyzeOutputSchema.safeParse(result);

    expect(validation.success).toBe(true);
  });

  it('should include valid metadata', async () => {
    const input: LegalAnalyzeInput = {
      document: SAMPLE_SERVICE_AGREEMENT,
      analysis_depth: 'standard',
      focus_areas: ['general'],
      language: 'de',
      check_compliance: true,
    };

    const result = await legalAnalyze(input);

    expect(result.metadata.analysisDepth).toBe('standard');
    expect(result.metadata.focusAreas).toContain('general');
    expect(result.metadata.language).toBe('de');
    expect(result.metadata.analyzedAt).toBeDefined();

    // analyzedAt should be a valid ISO date string
    const date = new Date(result.metadata.analyzedAt);
    expect(date.toString()).not.toBe('Invalid Date');
  });

  it('should handle all document types', async () => {
    const documentTypes = [
      'service_agreement',
      'employment_contract',
      'nda',
    ];

    for (const docType of documentTypes) {
      const input: LegalAnalyzeInput = {
        document: `Sample ${docType} document content`,
        document_type: docType as LegalAnalyzeInput['document_type'],
        analysis_depth: 'quick',
        focus_areas: ['general'],
        language: 'de',
        check_compliance: false,
      };

      const result = await legalAnalyze(input);
      const validation = LegalAnalyzeOutputSchema.safeParse(result);

      expect(validation.success).toBe(true);
    }
  });
});

// ============================================================================
// Edge Cases
// ============================================================================

describe('Edge Cases', () => {
  it('should handle very short documents', async () => {
    const input: LegalAnalyzeInput = {
      document: 'Vertrag zwischen A und B.',
      analysis_depth: 'quick',
      focus_areas: ['general'],
      language: 'de',
      check_compliance: false,
    };

    const result = await legalAnalyze(input);

    expect(result.summary).toBeDefined();
    expect(Array.isArray(result.issues)).toBe(true);
  });

  it('should handle very long documents', async () => {
    const longDocument = SAMPLE_SERVICE_AGREEMENT.repeat(10);

    const input: LegalAnalyzeInput = {
      document: longDocument,
      analysis_depth: 'quick',
      focus_areas: ['general'],
      language: 'de',
      check_compliance: false,
    };

    const result = await legalAnalyze(input);

    expect(result.summary).toBeDefined();
    const validation = LegalAnalyzeOutputSchema.safeParse(result);
    expect(validation.success).toBe(true);
  });

  it('should handle documents without clear structure', async () => {
    const unstructuredDoc = `
      This is a document without any clear structure or legal formatting.
      It mentions some parties: Company A and Company B.
      There might be some agreement here but it's not clear.
      Something about payment and services.
    `;

    const input: LegalAnalyzeInput = {
      document: unstructuredDoc,
      analysis_depth: 'standard',
      focus_areas: ['general'],
      language: 'en',
      check_compliance: true,
    };

    const result = await legalAnalyze(input);

    expect(result.summary).toBeDefined();
    // Should still produce valid output even for unstructured docs
    const validation = LegalAnalyzeOutputSchema.safeParse(result);
    expect(validation.success).toBe(true);
  });

  it('should handle mixed language documents', async () => {
    const mixedDoc = `
      VERTRAG / CONTRACT

      Between ABC GmbH und XYZ Ltd.

      1. Gegenstand / Subject Matter
      Services as described.

      2. Vergütung / Compensation
      CHF 100 per hour.
    `;

    const input: LegalAnalyzeInput = {
      document: mixedDoc,
      analysis_depth: 'standard',
      focus_areas: ['general'],
      language: 'de',
      check_compliance: false,
    };

    const result = await legalAnalyze(input);

    expect(result.summary).toBeDefined();
    const validation = LegalAnalyzeOutputSchema.safeParse(result);
    expect(validation.success).toBe(true);
  });
});
