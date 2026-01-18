import { describe, it, expect } from 'vitest';
import {
  LegalDraftInputSchema,
  LegalDraftOutputSchema,
  type LegalDraftInput,
  type DocumentType,
} from '../types.js';

// Import the function to be implemented
import { legalDraft } from '../tools/legal-draft.js';

// ============================================================================
// Input Validation Tests
// ============================================================================

describe('LegalDraftInputSchema Validation', () => {
  it('should validate correct input with all required fields', () => {
    const input = {
      document_type: 'service_agreement',
      context: 'Software development services for Project X',
      parties: [
        { name: 'ABC GmbH', role: 'Client' },
        { name: 'XYZ AG', role: 'Service Provider' },
      ],
    };
    const result = LegalDraftInputSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('should reject empty context', () => {
    const input = {
      document_type: 'nda',
      context: '',
      parties: [{ name: 'Test Corp', role: 'Disclosing Party' }],
    };
    const result = LegalDraftInputSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('should reject empty parties array', () => {
    const input = {
      document_type: 'employment_contract',
      context: 'Employment of software developer',
      parties: [],
    };
    const result = LegalDraftInputSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('should reject invalid document type', () => {
    const input = {
      document_type: 'invalid_type',
      context: 'Some context',
      parties: [{ name: 'Test', role: 'Test' }],
    };
    const result = LegalDraftInputSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('should apply default values', () => {
    const input = {
      document_type: 'nda',
      context: 'Confidentiality agreement',
      parties: [{ name: 'Test', role: 'Party' }],
    };
    const result = LegalDraftInputSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.jurisdiction).toBe('federal');
      expect(result.data.language).toBe('de');
      expect(result.data.format).toBe('full');
      expect(result.data.include_comments).toBe(false);
    }
  });

  it('should accept party with all optional fields', () => {
    const input = {
      document_type: 'shareholders_agreement',
      context: 'Joint venture agreement',
      parties: [
        {
          name: 'Test AG',
          role: 'Shareholder',
          address: 'Bahnhofstrasse 1, 8001 Zürich',
          representative: 'Dr. Hans Müller',
        },
      ],
    };
    const result = LegalDraftInputSchema.safeParse(input);
    expect(result.success).toBe(true);
  });
});

// ============================================================================
// Contract Document Tests
// ============================================================================

describe('Contract Document Generation', () => {
  describe('Service Agreement', () => {
    it('should generate a valid service agreement structure', async () => {
      const input: LegalDraftInput = {
        document_type: 'service_agreement',
        context: 'Software development services for mobile application',
        parties: [
          { name: 'Tech Solutions AG', role: 'Client' },
          { name: 'Dev Studio GmbH', role: 'Service Provider' },
        ],
        jurisdiction: 'federal',
        language: 'de',
        format: 'full',
        include_comments: false,
      };

      const result = await legalDraft(input);

      expect(result.documentType).toBe('service_agreement');
      expect(result.title).toBeDefined();
      expect(result.sections.length).toBeGreaterThan(0);
      expect(result.metadata.jurisdiction).toBe('federal');
      expect(result.metadata.language).toBe('de');
    });

    it('should include essential contract clauses', async () => {
      const input: LegalDraftInput = {
        document_type: 'service_agreement',
        context: 'Consulting services',
        parties: [
          { name: 'Client Corp', role: 'Client' },
          { name: 'Consultant Ltd', role: 'Consultant' },
        ],
        jurisdiction: 'federal',
        language: 'de',
        format: 'full',
        include_comments: false,
      };

      const result = await legalDraft(input);
      const sectionTitles = result.sections.map((s) => s.title.toLowerCase());

      // Essential clauses should be present
      expect(
        sectionTitles.some(
          (t) =>
            t.includes('leistung') ||
            t.includes('service') ||
            t.includes('gegenstand')
        )
      ).toBe(true);
      expect(
        sectionTitles.some(
          (t) =>
            t.includes('vergütung') ||
            t.includes('honorar') ||
            t.includes('entgelt')
        )
      ).toBe(true);
    });
  });

  describe('Employment Contract', () => {
    it('should generate employment contract with mandatory clauses', async () => {
      const input: LegalDraftInput = {
        document_type: 'employment_contract',
        context: 'Full-time software developer position, CHF 120000 annual salary',
        parties: [
          { name: 'Tech Corp AG', role: 'Employer' },
          { name: 'Max Mustermann', role: 'Employee' },
        ],
        jurisdiction: 'federal',
        language: 'de',
        format: 'full',
        include_comments: false,
      };

      const result = await legalDraft(input);

      expect(result.documentType).toBe('employment_contract');
      const sectionTitles = result.sections.map((s) => s.title.toLowerCase());

      // Employment-specific clauses
      expect(
        sectionTitles.some(
          (t) => t.includes('arbeit') || t.includes('tätigkeit')
        )
      ).toBe(true);
      expect(
        sectionTitles.some(
          (t) => t.includes('lohn') || t.includes('gehalt') || t.includes('entlöhnung')
        )
      ).toBe(true);
    });

    it('should reference OR employment law provisions', async () => {
      const input: LegalDraftInput = {
        document_type: 'employment_contract',
        context: 'Part-time administrative assistant',
        parties: [
          { name: 'Employer GmbH', role: 'Employer' },
          { name: 'Anna Example', role: 'Employee' },
        ],
        jurisdiction: 'federal',
        language: 'de',
        format: 'full',
        include_comments: true,
      };

      const result = await legalDraft(input);
      const allContent = result.sections
        .map((s) => s.content + (s.comments || ''))
        .join(' ');

      // Should reference employment law articles
      expect(
        allContent.includes('OR') || allContent.includes('Art.')
      ).toBe(true);
    });
  });

  describe('NDA (Non-Disclosure Agreement)', () => {
    it('should generate NDA with confidentiality clauses', async () => {
      const input: LegalDraftInput = {
        document_type: 'nda',
        context: 'Mutual NDA for business partnership discussions',
        parties: [
          { name: 'Party A AG', role: 'Disclosing Party' },
          { name: 'Party B GmbH', role: 'Receiving Party' },
        ],
        jurisdiction: 'federal',
        language: 'de',
        format: 'full',
        include_comments: false,
      };

      const result = await legalDraft(input);
      const sectionTitles = result.sections.map((s) => s.title.toLowerCase());

      expect(
        sectionTitles.some(
          (t) =>
            t.includes('vertraulich') ||
            t.includes('geheimhaltung') ||
            t.includes('confidential')
        )
      ).toBe(true);
    });
  });

  describe('Shareholders Agreement', () => {
    it('should generate shareholders agreement with governance clauses', async () => {
      const input: LegalDraftInput = {
        document_type: 'shareholders_agreement',
        context: 'Agreement between three founders of tech startup',
        parties: [
          { name: 'Founder A', role: 'Shareholder (40%)' },
          { name: 'Founder B', role: 'Shareholder (35%)' },
          { name: 'Founder C', role: 'Shareholder (25%)' },
        ],
        jurisdiction: 'federal',
        language: 'de',
        format: 'full',
        include_comments: false,
      };

      const result = await legalDraft(input);
      const sectionTitles = result.sections.map((s) => s.title.toLowerCase());

      // Corporate governance clauses
      expect(
        sectionTitles.some(
          (t) =>
            t.includes('stimm') ||
            t.includes('beschluss') ||
            t.includes('aktionär') ||
            t.includes('gesellschafter')
        )
      ).toBe(true);
    });
  });
});

// ============================================================================
// Litigation Document Tests
// ============================================================================

describe('Litigation Document Generation', () => {
  describe('Klageschrift (Statement of Claim)', () => {
    it('should generate Klageschrift with proper structure', async () => {
      const input: LegalDraftInput = {
        document_type: 'klageschrift',
        context: 'Contract breach claim for CHF 50000 unpaid invoices',
        parties: [
          { name: 'Supplier AG', role: 'Plaintiff (Klägerin)' },
          { name: 'Customer GmbH', role: 'Defendant (Beklagte)' },
        ],
        jurisdiction: 'cantonal',
        canton: 'ZH',
        language: 'de',
        format: 'full',
        include_comments: false,
      };

      const result = await legalDraft(input);

      expect(result.documentType).toBe('klageschrift');
      const sectionTitles = result.sections.map((s) => s.title.toLowerCase());

      // Litigation document structure
      expect(
        sectionTitles.some(
          (t) =>
            t.includes('rechtsbegehren') ||
            t.includes('antrag') ||
            t.includes('begehren')
        )
      ).toBe(true);
      expect(
        sectionTitles.some(
          (t) =>
            t.includes('sachverhalt') ||
            t.includes('tatbestand') ||
            t.includes('fakten')
        )
      ).toBe(true);
    });

    it('should include canton-specific court references for ZH', async () => {
      const input: LegalDraftInput = {
        document_type: 'klageschrift',
        context: 'Employment termination dispute',
        parties: [
          { name: 'Employee', role: 'Plaintiff' },
          { name: 'Employer AG', role: 'Defendant' },
        ],
        jurisdiction: 'cantonal',
        canton: 'ZH',
        language: 'de',
        format: 'full',
        include_comments: false,
      };

      const result = await legalDraft(input);
      const allContent = result.sections.map((s) => s.content).join(' ');

      // Should reference ZH courts
      expect(
        allContent.toLowerCase().includes('zürich') ||
          allContent.toLowerCase().includes('zh') ||
          allContent.toLowerCase().includes('bezirksgericht') ||
          allContent.toLowerCase().includes('arbeitsgericht')
      ).toBe(true);
    });
  });

  describe('Klageantwort (Statement of Defense)', () => {
    it('should generate defense structure', async () => {
      const input: LegalDraftInput = {
        document_type: 'klageantwort',
        context: 'Defense against breach of contract claim, disputing amount',
        parties: [
          { name: 'Defendant GmbH', role: 'Defendant (Beklagte)' },
          { name: 'Plaintiff AG', role: 'Plaintiff (Klägerin)' },
        ],
        jurisdiction: 'federal',
        language: 'de',
        format: 'full',
        include_comments: false,
      };

      const result = await legalDraft(input);
      const sectionTitles = result.sections.map((s) => s.title.toLowerCase());

      // Defense document structure (German uses umlauts: Anträge)
      expect(
        sectionTitles.some(
          (t) =>
            t.includes('anträge') ||
            t.includes('antrag') ||
            t.includes('begehren') ||
            t.includes('abweis')
        )
      ).toBe(true);
    });
  });

  describe('Berufung (Appeal)', () => {
    it('should generate appeal structure', async () => {
      const input: LegalDraftInput = {
        document_type: 'berufung',
        context: 'Appeal against first instance judgment dismissing damages claim',
        parties: [
          { name: 'Appellant', role: 'Appellant (Berufungskläger)' },
          { name: 'Respondent', role: 'Respondent (Berufungsbeklagte)' },
        ],
        jurisdiction: 'cantonal',
        canton: 'ZH',
        language: 'de',
        format: 'full',
        include_comments: false,
      };

      const result = await legalDraft(input);

      expect(result.documentType).toBe('berufung');
      const sectionTitles = result.sections.map((s) => s.title.toLowerCase());

      // Appeal-specific structure (German uses umlauts: Berufungsanträge)
      expect(
        sectionTitles.some(
          (t) =>
            t.includes('berufungsanträge') ||
            t.includes('berufungsantrag') ||
            t.includes('anträge') ||
            t.includes('antrag') ||
            t.includes('begehren')
        )
      ).toBe(true);
    });
  });
});

// ============================================================================
// Legal Opinion Tests
// ============================================================================

describe('Legal Opinion Generation', () => {
  describe('Rechtsgutachten (Legal Opinion)', () => {
    it('should generate comprehensive legal opinion structure', async () => {
      const input: LegalDraftInput = {
        document_type: 'rechtsgutachten',
        context: 'Legal opinion on liability exposure in product recall scenario',
        parties: [{ name: 'Client Corp', role: 'Requesting Party' }],
        jurisdiction: 'federal',
        language: 'de',
        format: 'full',
        include_comments: false,
      };

      const result = await legalDraft(input);

      expect(result.documentType).toBe('rechtsgutachten');
      const sectionTitles = result.sections.map((s) => s.title.toLowerCase());

      // Legal opinion structure
      expect(
        sectionTitles.some(
          (t) =>
            t.includes('fragestellung') ||
            t.includes('auftrag') ||
            t.includes('frage')
        )
      ).toBe(true);
      expect(
        sectionTitles.some(
          (t) =>
            t.includes('rechtlich') ||
            t.includes('würdigung') ||
            t.includes('beurteilung')
        )
      ).toBe(true);
    });
  });

  describe('Memorandum', () => {
    it('should generate memo with analysis structure', async () => {
      const input: LegalDraftInput = {
        document_type: 'memorandum',
        context: 'Internal memo on GDPR compliance requirements',
        parties: [{ name: 'Legal Department', role: 'Author' }],
        jurisdiction: 'federal',
        language: 'de',
        format: 'full',
        include_comments: false,
      };

      const result = await legalDraft(input);

      expect(result.documentType).toBe('memorandum');
      expect(result.sections.length).toBeGreaterThan(0);
    });
  });
});

// ============================================================================
// Multi-Language Tests
// ============================================================================

describe('Multi-Language Support', () => {
  it('should generate French documents with correct terminology', async () => {
    const input: LegalDraftInput = {
      document_type: 'service_agreement',
      context: 'Services de conseil en informatique',
      parties: [
        { name: 'Client SA', role: 'Client' },
        { name: 'Consultant Sàrl', role: 'Prestataire' },
      ],
      jurisdiction: 'federal',
      language: 'fr',
      format: 'full',
      include_comments: false,
    };

    const result = await legalDraft(input);

    expect(result.metadata.language).toBe('fr');
    // Should use French legal terminology
    const allContent = result.sections.map((s) => s.content).join(' ');
    expect(
      allContent.includes('CO') || // Code des obligations
        allContent.includes('contrat') ||
        allContent.includes('partie')
    ).toBe(true);
  });

  it('should generate Italian documents with correct terminology', async () => {
    const input: LegalDraftInput = {
      document_type: 'nda',
      context: 'Accordo di riservatezza per trattative commerciali',
      parties: [
        { name: 'Parte A SA', role: 'Parte divulgante' },
        { name: 'Parte B Sagl', role: 'Parte ricevente' },
      ],
      jurisdiction: 'federal',
      language: 'it',
      format: 'full',
      include_comments: false,
    };

    const result = await legalDraft(input);

    expect(result.metadata.language).toBe('it');
  });

  it('should generate English documents for international context', async () => {
    const input: LegalDraftInput = {
      document_type: 'shareholders_agreement',
      context: 'International joint venture agreement',
      parties: [
        { name: 'Swiss Corp AG', role: 'Shareholder' },
        { name: 'Foreign Corp Ltd', role: 'Shareholder' },
      ],
      jurisdiction: 'federal',
      language: 'en',
      format: 'full',
      include_comments: false,
    };

    const result = await legalDraft(input);

    expect(result.metadata.language).toBe('en');
  });
});

// ============================================================================
// Format Tests
// ============================================================================

describe('Document Format Options', () => {
  it('should generate full document with all sections', async () => {
    const input: LegalDraftInput = {
      document_type: 'service_agreement',
      context: 'Full consulting agreement',
      parties: [
        { name: 'Client', role: 'Client' },
        { name: 'Consultant', role: 'Consultant' },
      ],
      jurisdiction: 'federal',
      language: 'de',
      format: 'full',
      include_comments: false,
    };

    const result = await legalDraft(input);

    expect(result.sections.length).toBeGreaterThan(3);
    result.sections.forEach((section) => {
      expect(section.content.length).toBeGreaterThan(0);
    });
  });

  it('should generate outline with section headers', async () => {
    const input: LegalDraftInput = {
      document_type: 'shareholders_agreement',
      context: 'Outline for shareholder agreement',
      parties: [
        { name: 'Shareholder A', role: 'Shareholder' },
        { name: 'Shareholder B', role: 'Shareholder' },
      ],
      jurisdiction: 'federal',
      language: 'de',
      format: 'outline',
      include_comments: false,
    };

    const result = await legalDraft(input);

    expect(result.sections.length).toBeGreaterThan(0);
    // Outline should have shorter content
    const averageContentLength =
      result.sections.reduce((sum, s) => sum + s.content.length, 0) /
      result.sections.length;
    expect(averageContentLength).toBeLessThan(500); // Outline content should be brief
  });

  it('should generate template with placeholders', async () => {
    const input: LegalDraftInput = {
      document_type: 'employment_contract',
      context: 'Template for new hires',
      parties: [
        { name: '[EMPLOYER]', role: 'Employer' },
        { name: '[EMPLOYEE]', role: 'Employee' },
      ],
      jurisdiction: 'federal',
      language: 'de',
      format: 'template',
      include_comments: false,
    };

    const result = await legalDraft(input);

    const allContent = result.sections.map((s) => s.content).join(' ');
    // Template should contain placeholders
    expect(
      allContent.includes('[') ||
        allContent.includes('___') ||
        allContent.includes('...')
    ).toBe(true);
  });
});

// ============================================================================
// Comments and Annotations Tests
// ============================================================================

describe('Comments and Annotations', () => {
  it('should include comments when requested', async () => {
    const input: LegalDraftInput = {
      document_type: 'service_agreement',
      context: 'Service agreement with explanatory comments',
      parties: [
        { name: 'Client', role: 'Client' },
        { name: 'Provider', role: 'Provider' },
      ],
      jurisdiction: 'federal',
      language: 'de',
      format: 'full',
      include_comments: true,
    };

    const result = await legalDraft(input);

    // At least some sections should have comments
    const sectionsWithComments = result.sections.filter((s) => s.comments);
    expect(sectionsWithComments.length).toBeGreaterThan(0);
  });

  it('should not include comments when not requested', async () => {
    const input: LegalDraftInput = {
      document_type: 'nda',
      context: 'Simple NDA without comments',
      parties: [
        { name: 'Party A', role: 'Discloser' },
        { name: 'Party B', role: 'Receiver' },
      ],
      jurisdiction: 'federal',
      language: 'de',
      format: 'full',
      include_comments: false,
    };

    const result = await legalDraft(input);

    // No sections should have comments
    const sectionsWithComments = result.sections.filter((s) => s.comments);
    expect(sectionsWithComments.length).toBe(0);
  });
});

// ============================================================================
// Signature and Metadata Tests
// ============================================================================

describe('Signatures and Metadata', () => {
  it('should include signature blocks for contracts', async () => {
    const input: LegalDraftInput = {
      document_type: 'service_agreement',
      context: 'Contract requiring signatures',
      parties: [
        { name: 'Client AG', role: 'Client' },
        { name: 'Contractor GmbH', role: 'Contractor' },
      ],
      jurisdiction: 'federal',
      language: 'de',
      format: 'full',
      include_comments: false,
    };

    const result = await legalDraft(input);

    expect(result.signatures).toBeDefined();
    expect(result.signatures!.length).toBe(2);
    result.signatures!.forEach((sig) => {
      expect(sig.party).toBeDefined();
      expect(sig.signatureLine).toBeDefined();
      expect(sig.dateLine).toBeDefined();
    });
  });

  it('should include proper metadata', async () => {
    const input: LegalDraftInput = {
      document_type: 'rechtsgutachten',
      context: 'Legal opinion with metadata',
      parties: [{ name: 'Client', role: 'Requester' }],
      jurisdiction: 'cantonal',
      canton: 'GE',
      language: 'fr',
      format: 'full',
      include_comments: false,
    };

    const result = await legalDraft(input);

    expect(result.metadata.version).toBeDefined();
    expect(result.metadata.generatedAt).toBeDefined();
    expect(result.metadata.jurisdiction).toBe('cantonal');
    expect(result.metadata.canton).toBe('GE');
    expect(result.metadata.language).toBe('fr');
  });
});

// ============================================================================
// Cantonal Variations Tests
// ============================================================================

describe('Cantonal Variations', () => {
  it('should adapt Klageschrift for Geneva courts (French)', async () => {
    const input: LegalDraftInput = {
      document_type: 'klageschrift',
      context: 'Commercial dispute in Geneva',
      parties: [
        { name: 'Demandeur SA', role: 'Demandeur' },
        { name: 'Défendeur Sàrl', role: 'Défendeur' },
      ],
      jurisdiction: 'cantonal',
      canton: 'GE',
      language: 'fr',
      format: 'full',
      include_comments: false,
    };

    const result = await legalDraft(input);

    expect(result.metadata.canton).toBe('GE');
    const allContent = result.sections.map((s) => s.content).join(' ');
    // Should reference Geneva courts or French terminology
    expect(
      allContent.toLowerCase().includes('genève') ||
        allContent.toLowerCase().includes('tribunal') ||
        allContent.includes('CPC')
    ).toBe(true);
  });

  it('should adapt for Ticino courts (Italian)', async () => {
    const input: LegalDraftInput = {
      document_type: 'klageschrift',
      context: 'Disputa commerciale in Ticino',
      parties: [
        { name: 'Attore SA', role: 'Attore' },
        { name: 'Convenuto Sagl', role: 'Convenuto' },
      ],
      jurisdiction: 'cantonal',
      canton: 'TI',
      language: 'it',
      format: 'full',
      include_comments: false,
    };

    const result = await legalDraft(input);

    expect(result.metadata.canton).toBe('TI');
    expect(result.metadata.language).toBe('it');
  });
});

// ============================================================================
// Output Schema Validation Tests
// ============================================================================

describe('Output Schema Validation', () => {
  it('should produce output conforming to LegalDraftOutputSchema', async () => {
    const input: LegalDraftInput = {
      document_type: 'loan_agreement',
      context: 'Loan agreement for CHF 100000',
      parties: [
        { name: 'Lender Bank AG', role: 'Lender' },
        { name: 'Borrower GmbH', role: 'Borrower' },
      ],
      jurisdiction: 'federal',
      language: 'de',
      format: 'full',
      include_comments: false,
    };

    const result = await legalDraft(input);
    const validation = LegalDraftOutputSchema.safeParse(result);

    expect(validation.success).toBe(true);
  });

  it('should handle all document types with valid output', async () => {
    const documentTypes: DocumentType[] = [
      'service_agreement',
      'employment_contract',
      'nda',
      'klageschrift',
      'rechtsgutachten',
    ];

    for (const docType of documentTypes) {
      const input: LegalDraftInput = {
        document_type: docType,
        context: `Test document for ${docType}`,
        parties: [{ name: 'Test Party', role: 'Party' }],
        jurisdiction: 'federal',
        language: 'de',
        format: 'full',
        include_comments: false,
      };

      const result = await legalDraft(input);
      const validation = LegalDraftOutputSchema.safeParse(result);

      expect(validation.success).toBe(true);
    }
  });
});

// ============================================================================
// Edge Cases and Error Handling
// ============================================================================

describe('Edge Cases', () => {
  it('should handle very long context gracefully', async () => {
    const longContext = 'A'.repeat(5000);
    const input: LegalDraftInput = {
      document_type: 'memorandum',
      context: longContext,
      parties: [{ name: 'Legal Dept', role: 'Author' }],
      jurisdiction: 'federal',
      language: 'de',
      format: 'full',
      include_comments: false,
    };

    const result = await legalDraft(input);
    expect(result.sections.length).toBeGreaterThan(0);
  });

  it('should handle many parties', async () => {
    const input: LegalDraftInput = {
      document_type: 'shareholders_agreement',
      context: 'Multi-party shareholders agreement',
      parties: [
        { name: 'Shareholder A', role: 'Shareholder (20%)' },
        { name: 'Shareholder B', role: 'Shareholder (20%)' },
        { name: 'Shareholder C', role: 'Shareholder (20%)' },
        { name: 'Shareholder D', role: 'Shareholder (20%)' },
        { name: 'Shareholder E', role: 'Shareholder (20%)' },
      ],
      jurisdiction: 'federal',
      language: 'de',
      format: 'full',
      include_comments: false,
    };

    const result = await legalDraft(input);
    expect(result.signatures?.length).toBe(5);
  });

  it('should include warnings for complex scenarios', async () => {
    const input: LegalDraftInput = {
      document_type: 'berufung',
      context: 'Complex appeal with multiple grounds',
      parties: [
        { name: 'Appellant', role: 'Appellant' },
        { name: 'Respondent', role: 'Respondent' },
      ],
      jurisdiction: 'federal',
      language: 'de',
      format: 'full',
      include_comments: false,
    };

    const result = await legalDraft(input);
    // Litigation documents should include professional review warnings
    expect(result.warnings).toBeDefined();
    expect(result.warnings!.length).toBeGreaterThan(0);
  });
});
