import { describe, it, expect } from 'vitest';
import {
  LegalGatewayInputSchema,
  LegalGatewayOutputSchema,
  LegalResearchInputSchema,
  LegalResearchOutputSchema,
  ResearchResultSchema,
  LegalCitationInputSchema,
  LegalCitationOutputSchema,
  ParsedCitationSchema,
  LegalStrategyInputSchema,
  LegalStrategyOutputSchema,
  StrategicOptionSchema,
  LegalDraftInputSchema,
  LegalDraftOutputSchema,
  LegalAnalyzeInputSchema,
  LegalAnalyzeOutputSchema,
  LegalIssueSchema,
} from '../../types/tools.js';

describe('Tool Input/Output Schemas', () => {
  describe('LegalGatewayInputSchema', () => {
    it('should accept valid gateway input', () => {
      const validInput = {
        query: 'What is the liability under Art. 97 OR?',
      };

      const result = LegalGatewayInputSchema.parse(validInput);
      expect(result.query).toBe(validInput.query);
    });

    it('should accept input with optional fields', () => {
      const validInput = {
        query: 'Contract liability analysis',
        context: 'Client breached delivery obligations',
        lang: 'de',
      };

      const result = LegalGatewayInputSchema.parse(validInput);
      expect(result.context).toBe(validInput.context);
      expect(result.lang).toBe('de');
    });

    it('should reject empty query', () => {
      const invalidInput = {
        query: '',
      };

      expect(() => LegalGatewayInputSchema.parse(invalidInput)).toThrow();
    });

    it('should reject query exceeding max length', () => {
      const invalidInput = {
        query: 'a'.repeat(5001),
      };

      expect(() => LegalGatewayInputSchema.parse(invalidInput)).toThrow();
    });

    it('should reject context exceeding max length', () => {
      const invalidInput = {
        query: 'Valid query',
        context: 'a'.repeat(10001),
      };

      expect(() => LegalGatewayInputSchema.parse(invalidInput)).toThrow();
    });

    it('should reject invalid language', () => {
      const invalidInput = {
        query: 'Valid query',
        lang: 'es',
      };

      expect(() => LegalGatewayInputSchema.parse(invalidInput)).toThrow();
    });
  });

  describe('LegalGatewayOutputSchema', () => {
    it('should accept valid gateway output', () => {
      const validOutput = {
        response: 'Legal analysis result',
        suggestedTools: ['legal_research', 'legal_citation'],
        confidence: 0.85,
      };

      const result = LegalGatewayOutputSchema.parse(validOutput);
      expect(result.response).toBe(validOutput.response);
      expect(result.suggestedTools).toHaveLength(2);
      expect(result.confidence).toBe(0.85);
    });

    it('should accept output without optional fields', () => {
      const validOutput = {
        response: 'Simple response',
      };

      const result = LegalGatewayOutputSchema.parse(validOutput);
      expect(result.response).toBe(validOutput.response);
      expect(result.suggestedTools).toBeUndefined();
    });

    it('should reject confidence below 0', () => {
      const invalidOutput = {
        response: 'Response',
        confidence: -0.1,
      };

      expect(() => LegalGatewayOutputSchema.parse(invalidOutput)).toThrow();
    });

    it('should reject confidence above 1', () => {
      const invalidOutput = {
        response: 'Response',
        confidence: 1.5,
      };

      expect(() => LegalGatewayOutputSchema.parse(invalidOutput)).toThrow();
    });
  });

  describe('LegalResearchInputSchema', () => {
    it('should accept valid research input with defaults', () => {
      const validInput = {
        query: 'BGE Art. 97 OR liability',
      };

      const result = LegalResearchInputSchema.parse(validInput);
      expect(result.query).toBe(validInput.query);
      expect(result.maxResults).toBe(10); // Default value
    });

    it('should accept full research input', () => {
      const validInput = {
        query: 'Contract liability precedents',
        jurisdiction: 'federal',
        dateFrom: '2020-01-01',
        dateTo: '2024-12-31',
        sources: ['precedent', 'statute'],
        domain: 'commercial',
        maxResults: 25,
        lang: 'de',
      };

      const result = LegalResearchInputSchema.parse(validInput);
      expect(result.jurisdiction).toBe('federal');
      expect(result.dateFrom).toBe('2020-01-01');
      expect(result.sources).toHaveLength(2);
      expect(result.maxResults).toBe(25);
    });

    it('should accept cantonal jurisdiction with canton', () => {
      const validInput = {
        query: 'Zürich commercial court decisions',
        jurisdiction: 'cantonal',
        canton: 'ZH',
      };

      const result = LegalResearchInputSchema.parse(validInput);
      expect(result.jurisdiction).toBe('cantonal');
      expect(result.canton).toBe('ZH');
    });

    it('should reject empty query', () => {
      const invalidInput = {
        query: '',
      };

      expect(() => LegalResearchInputSchema.parse(invalidInput)).toThrow();
    });

    it('should reject query exceeding max length', () => {
      const invalidInput = {
        query: 'a'.repeat(2001),
      };

      expect(() => LegalResearchInputSchema.parse(invalidInput)).toThrow();
    });

    it('should reject invalid date format', () => {
      const invalidInput = {
        query: 'Valid query',
        dateFrom: '01-01-2020', // Wrong format
      };

      expect(() => LegalResearchInputSchema.parse(invalidInput)).toThrow();
    });

    it('should reject maxResults below 1', () => {
      const invalidInput = {
        query: 'Valid query',
        maxResults: 0,
      };

      expect(() => LegalResearchInputSchema.parse(invalidInput)).toThrow();
    });

    it('should reject maxResults above 50', () => {
      const invalidInput = {
        query: 'Valid query',
        maxResults: 51,
      };

      expect(() => LegalResearchInputSchema.parse(invalidInput)).toThrow();
    });

    it('should reject invalid source type', () => {
      const invalidInput = {
        query: 'Valid query',
        sources: ['invalid_source'],
      };

      expect(() => LegalResearchInputSchema.parse(invalidInput)).toThrow();
    });
  });

  describe('ResearchResultSchema', () => {
    it('should accept valid research result', () => {
      const validResult = {
        id: 'bge-145-iii-229',
        title: 'BGE 145 III 229',
        source: 'precedent',
        citation: 'BGE 145 III 229 E. 4.2',
        relevanceScore: 0.92,
        snippet: 'Excerpt from the decision...',
        url: 'https://www.bger.ch/ext/eurospider/live/de/php/aza/http/index.php?highlight_docid=aza%3A%2F%2F01-01-2019-4A_251-2018&lang=de',
        date: '2019-01-01',
        jurisdiction: 'federal',
      };

      const result = ResearchResultSchema.parse(validResult);
      expect(result.id).toBe(validResult.id);
      expect(result.relevanceScore).toBe(0.92);
    });

    it('should accept result without optional fields', () => {
      const validResult = {
        id: 'result-1',
        title: 'Test Result',
        source: 'statute',
        relevanceScore: 0.75,
      };

      const result = ResearchResultSchema.parse(validResult);
      expect(result.citation).toBeUndefined();
      expect(result.url).toBeUndefined();
    });

    it('should reject relevance score below 0', () => {
      const invalidResult = {
        id: 'result-1',
        title: 'Test',
        source: 'statute',
        relevanceScore: -0.1,
      };

      expect(() => ResearchResultSchema.parse(invalidResult)).toThrow();
    });

    it('should reject relevance score above 1', () => {
      const invalidResult = {
        id: 'result-1',
        title: 'Test',
        source: 'statute',
        relevanceScore: 1.1,
      };

      expect(() => ResearchResultSchema.parse(invalidResult)).toThrow();
    });
  });

  describe('LegalResearchOutputSchema', () => {
    it('should accept valid research output', () => {
      const validOutput = {
        results: [
          {
            id: 'result-1',
            title: 'BGE 145 III 229',
            source: 'precedent',
            relevanceScore: 0.9,
          },
        ],
        totalResults: 1,
        query: 'Contract liability',
        searchedSources: ['bundesgericht'],
      };

      const result = LegalResearchOutputSchema.parse(validOutput);
      expect(result.results).toHaveLength(1);
      expect(result.totalResults).toBe(1);
    });

    it('should accept output with optional summary', () => {
      const validOutput = {
        results: [],
        totalResults: 0,
        query: 'Test',
        searchedSources: ['fedlex'],
        summary: 'No results found for the given query.',
      };

      const result = LegalResearchOutputSchema.parse(validOutput);
      expect(result.summary).toBeDefined();
    });
  });

  describe('LegalCitationInputSchema', () => {
    it('should accept valid citation for validation', () => {
      const validInput = {
        citation: 'BGE 145 III 229',
        action: 'validate',
      };

      const result = LegalCitationInputSchema.parse(validInput);
      expect(result.action).toBe('validate');
      expect(result.strict).toBe(true); // Default
    });

    it('should accept citation for parsing', () => {
      const validInput = {
        citation: 'Art. 97 Abs. 1 OR',
        action: 'parse',
        strict: false,
      };

      const result = LegalCitationInputSchema.parse(validInput);
      expect(result.action).toBe('parse');
      expect(result.strict).toBe(false);
    });

    it('should accept citation for formatting with target language', () => {
      const validInput = {
        citation: 'BGE 145 III 229',
        action: 'format',
        targetLang: 'fr',
      };

      const result = LegalCitationInputSchema.parse(validInput);
      expect(result.targetLang).toBe('fr');
    });

    it('should reject empty citation', () => {
      const invalidInput = {
        citation: '',
        action: 'validate',
      };

      expect(() => LegalCitationInputSchema.parse(invalidInput)).toThrow();
    });

    it('should reject citation exceeding max length', () => {
      const invalidInput = {
        citation: 'a'.repeat(501),
        action: 'validate',
      };

      expect(() => LegalCitationInputSchema.parse(invalidInput)).toThrow();
    });

    it('should reject invalid action', () => {
      const invalidInput = {
        citation: 'BGE 145 III 229',
        action: 'invalid_action',
      };

      expect(() => LegalCitationInputSchema.parse(invalidInput)).toThrow();
    });
  });

  describe('ParsedCitationSchema', () => {
    it('should accept valid parsed BGE citation', () => {
      const validCitation = {
        type: 'bge',
        volume: 145,
        section: 'III',
        page: 229,
        consideration: '4.2',
        isValid: true,
        formattedCitation: 'BGE 145 III 229 E. 4.2',
      };

      const result = ParsedCitationSchema.parse(validCitation);
      expect(result.type).toBe('bge');
      expect(result.volume).toBe(145);
    });

    it('should accept valid statute citation', () => {
      const validCitation = {
        type: 'statute',
        statute: 'OR',
        article: 97,
        paragraph: 1,
        isValid: true,
        formattedCitation: 'Art. 97 Abs. 1 OR',
      };

      const result = ParsedCitationSchema.parse(validCitation);
      expect(result.statute).toBe('OR');
    });

    it('should accept invalid citation with errors', () => {
      const invalidCitation = {
        type: 'bge',
        isValid: false,
        errors: ['Invalid BGE volume', 'Section not found'],
      };

      const result = ParsedCitationSchema.parse(invalidCitation);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(2);
    });
  });

  describe('LegalCitationOutputSchema', () => {
    it('should accept valid citation output', () => {
      const validOutput = {
        parsed: {
          type: 'bge',
          volume: 145,
          section: 'III',
          page: 229,
          isValid: true,
          formattedCitation: 'BGE 145 III 229',
        },
        isValid: true,
        formattedCitation: 'BGE 145 III 229',
        translations: {
          de: 'BGE 145 III 229',
          fr: 'ATF 145 III 229',
          it: 'DTF 145 III 229',
        },
      };

      const result = LegalCitationOutputSchema.parse(validOutput);
      expect(result.isValid).toBe(true);
      expect(result.translations?.de).toBe('BGE 145 III 229');
    });
  });

  describe('LegalStrategyInputSchema', () => {
    it('should accept valid strategy input', () => {
      const validInput = {
        caseDescription: 'Client claims damages for breach of contract by supplier who failed to deliver goods.',
        clientPosition: 'plaintiff',
      };

      const result = LegalStrategyInputSchema.parse(validInput);
      expect(result.clientPosition).toBe('plaintiff');
    });

    it('should accept full strategy input', () => {
      const validInput = {
        caseDescription: 'Employment termination dispute with claims for unpaid wages and wrongful dismissal.',
        clientPosition: 'plaintiff',
        jurisdiction: 'cantonal',
        canton: 'ZH',
        domain: 'employment',
        objectives: ['Obtain compensation', 'Reinstatement'],
        constraints: ['Limited budget', 'Time sensitive'],
        lang: 'de',
      };

      const result = LegalStrategyInputSchema.parse(validInput);
      expect(result.objectives).toHaveLength(2);
      expect(result.constraints).toHaveLength(2);
    });

    it('should accept defendant position', () => {
      const validInput = {
        caseDescription: 'Defending against contract breach allegations',
        clientPosition: 'defendant',
      };

      const result = LegalStrategyInputSchema.parse(validInput);
      expect(result.clientPosition).toBe('defendant');
    });

    it('should accept appellant and respondent positions', () => {
      const appellantInput = {
        caseDescription: 'Appeal against first instance judgment',
        clientPosition: 'appellant',
      };

      const respondentInput = {
        caseDescription: 'Defending appeal',
        clientPosition: 'respondent',
      };

      expect(LegalStrategyInputSchema.parse(appellantInput).clientPosition).toBe('appellant');
      expect(LegalStrategyInputSchema.parse(respondentInput).clientPosition).toBe('respondent');
    });

    it('should reject case description below min length', () => {
      const invalidInput = {
        caseDescription: 'Too short',
        clientPosition: 'plaintiff',
      };

      expect(() => LegalStrategyInputSchema.parse(invalidInput)).toThrow();
    });

    it('should reject case description above max length', () => {
      const invalidInput = {
        caseDescription: 'a'.repeat(10001),
        clientPosition: 'plaintiff',
      };

      expect(() => LegalStrategyInputSchema.parse(invalidInput)).toThrow();
    });

    it('should reject invalid client position', () => {
      const invalidInput = {
        caseDescription: 'Valid description that is long enough',
        clientPosition: 'witness',
      };

      expect(() => LegalStrategyInputSchema.parse(invalidInput)).toThrow();
    });
  });

  describe('StrategicOptionSchema', () => {
    it('should accept valid strategic option', () => {
      const validOption = {
        id: 'option-1',
        name: 'Aggressive Litigation',
        description: 'Pursue full damages through court proceedings',
        pros: ['Maximize recovery', 'Set precedent'],
        cons: ['Higher costs', 'Longer timeline'],
        estimatedSuccessRate: 0.75,
        estimatedCost: 'CHF 50,000 - 100,000',
        estimatedDuration: '12-18 months',
        requiredActions: ['File complaint', 'Discovery phase'],
        risks: ['Adverse judgment', 'Cost exposure'],
      };

      const result = StrategicOptionSchema.parse(validOption);
      expect(result.estimatedSuccessRate).toBe(0.75);
    });

    it('should accept option with optional fields', () => {
      const validOption = {
        id: 'option-2',
        name: 'Settlement',
        description: 'Negotiate settlement',
        pros: ['Quick resolution'],
        cons: ['Lower recovery'],
      };

      const result = StrategicOptionSchema.parse(validOption);
      expect(result.estimatedSuccessRate).toBeUndefined();
    });

    it('should reject success rate below 0', () => {
      const invalidOption = {
        id: 'option-1',
        name: 'Test',
        description: 'Test',
        pros: [],
        cons: [],
        estimatedSuccessRate: -0.1,
      };

      expect(() => StrategicOptionSchema.parse(invalidOption)).toThrow();
    });

    it('should reject success rate above 1', () => {
      const invalidOption = {
        id: 'option-1',
        name: 'Test',
        description: 'Test',
        pros: [],
        cons: [],
        estimatedSuccessRate: 1.1,
      };

      expect(() => StrategicOptionSchema.parse(invalidOption)).toThrow();
    });
  });

  describe('LegalStrategyOutputSchema', () => {
    it('should accept valid strategy output', () => {
      const validOutput = {
        caseAssessment: 'Strong case for breach of contract claim',
        options: [
          {
            id: 'option-1',
            name: 'Litigation',
            description: 'Court proceedings',
            pros: ['Full recovery'],
            cons: ['Costs'],
          },
        ],
        recommendedOption: 'option-1',
        keyConsiderations: ['Evidence strength', 'Defendant solvency'],
        relevantPrecedents: ['BGE 145 III 229'],
      };

      const result = LegalStrategyOutputSchema.parse(validOutput);
      expect(result.options).toHaveLength(1);
      expect(result.recommendedOption).toBe('option-1');
    });
  });

  describe('LegalDraftInputSchema', () => {
    it('should accept valid draft input with defaults', () => {
      const validInput = {
        documentType: 'contract',
        subject: 'Service Agreement',
      };

      const result = LegalDraftInputSchema.parse(validInput);
      expect(result.documentType).toBe('contract');
      expect(result.formality).toBe('formal'); // Default
      expect(result.includeBoilerplate).toBe(true); // Default
    });

    it('should accept full draft input', () => {
      const validInput = {
        documentType: 'contract',
        subject: 'Employment Agreement',
        content: 'Additional context for drafting',
        parties: [
          { name: 'ABC AG', role: 'Employer', address: 'Zurich, Switzerland' },
          { name: 'Max Muster', role: 'Employee' },
        ],
        jurisdiction: 'federal',
        lang: 'de',
        formality: 'formal',
        includeBoilerplate: true,
      };

      const result = LegalDraftInputSchema.parse(validInput);
      expect(result.parties).toHaveLength(2);
      expect(result.parties?.[0].address).toBe('Zurich, Switzerland');
    });

    it('should accept all document types', () => {
      const documentTypes = [
        'contract', 'brief', 'motion', 'opinion',
        'memorandum', 'letter', 'agreement', 'complaint', 'response',
      ];

      for (const docType of documentTypes) {
        const input = {
          documentType: docType,
          subject: 'Test Document',
        };
        const result = LegalDraftInputSchema.parse(input);
        expect(result.documentType).toBe(docType);
      }
    });

    it('should accept different formality levels', () => {
      const formalityLevels = ['formal', 'standard', 'informal'];

      for (const formality of formalityLevels) {
        const input = {
          documentType: 'letter',
          subject: 'Test Letter',
          formality,
        };
        const result = LegalDraftInputSchema.parse(input);
        expect(result.formality).toBe(formality);
      }
    });

    it('should reject invalid document type', () => {
      const invalidInput = {
        documentType: 'invalid_type',
        subject: 'Test',
      };

      expect(() => LegalDraftInputSchema.parse(invalidInput)).toThrow();
    });

    it('should reject empty subject', () => {
      const invalidInput = {
        documentType: 'contract',
        subject: '',
      };

      expect(() => LegalDraftInputSchema.parse(invalidInput)).toThrow();
    });

    it('should reject subject exceeding max length', () => {
      const invalidInput = {
        documentType: 'contract',
        subject: 'a'.repeat(501),
      };

      expect(() => LegalDraftInputSchema.parse(invalidInput)).toThrow();
    });

    it('should reject content exceeding max length', () => {
      const invalidInput = {
        documentType: 'contract',
        subject: 'Test',
        content: 'a'.repeat(20001),
      };

      expect(() => LegalDraftInputSchema.parse(invalidInput)).toThrow();
    });
  });

  describe('LegalDraftOutputSchema', () => {
    it('should accept valid draft output', () => {
      const validOutput = {
        documentType: 'contract',
        title: 'Service Agreement',
        content: 'CONTRACT AGREEMENT\n\nThis agreement...',
        sections: ['Preamble', 'Definitions', 'Scope'],
        citations: ['Art. 1 OR', 'Art. 18 OR'],
        warnings: ['Review party details'],
        reviewNotes: ['Consider adding confidentiality clause'],
        metadata: { generatedAt: '2024-01-15' },
      };

      const result = LegalDraftOutputSchema.parse(validOutput);
      expect(result.title).toBe('Service Agreement');
      expect(result.sections).toHaveLength(3);
    });

    it('should accept minimal draft output', () => {
      const validOutput = {
        documentType: 'letter',
        title: 'Formal Letter',
        content: 'Dear Sir or Madam...',
      };

      const result = LegalDraftOutputSchema.parse(validOutput);
      expect(result.warnings).toBeUndefined();
    });
  });

  describe('LegalAnalyzeInputSchema', () => {
    it('should accept valid analysis input with defaults', () => {
      const validInput = {
        document: 'This is a contract between Party A and Party B...',
      };

      const result = LegalAnalyzeInputSchema.parse(validInput);
      expect(result.analysisType).toBe('full'); // Default
    });

    it('should accept full analysis input', () => {
      const validInput = {
        document: 'Employment agreement between ABC AG and Max Muster...',
        analysisType: 'risks',
        domain: 'employment',
        jurisdiction: 'federal',
        lang: 'de',
        focusAreas: ['termination clauses', 'non-compete provisions'],
      };

      const result = LegalAnalyzeInputSchema.parse(validInput);
      expect(result.analysisType).toBe('risks');
      expect(result.focusAreas).toHaveLength(2);
    });

    it('should accept all analysis types', () => {
      const analysisTypes = ['issues', 'risks', 'compliance', 'summary', 'full'];

      for (const analysisType of analysisTypes) {
        const input = {
          document: 'Test document content',
          analysisType,
        };
        const result = LegalAnalyzeInputSchema.parse(input);
        expect(result.analysisType).toBe(analysisType);
      }
    });

    it('should reject empty document', () => {
      const invalidInput = {
        document: '',
      };

      expect(() => LegalAnalyzeInputSchema.parse(invalidInput)).toThrow();
    });

    it('should reject document exceeding max length', () => {
      const invalidInput = {
        document: 'a'.repeat(50001),
      };

      expect(() => LegalAnalyzeInputSchema.parse(invalidInput)).toThrow();
    });

    it('should reject invalid analysis type', () => {
      const invalidInput = {
        document: 'Valid document',
        analysisType: 'invalid_type',
      };

      expect(() => LegalAnalyzeInputSchema.parse(invalidInput)).toThrow();
    });
  });

  describe('LegalIssueSchema', () => {
    it('should accept valid legal issue', () => {
      const validIssue = {
        id: 'issue-1',
        category: 'contractual',
        severity: 'high',
        title: 'Termination Clause Issue',
        description: 'The termination clause may be unenforceable',
        relevantProvisions: ['Art. 335 OR', 'Art. 336 OR'],
        recommendations: ['Revise clause', 'Add notice period'],
        affectedSections: ['Section 12', 'Section 15'],
      };

      const result = LegalIssueSchema.parse(validIssue);
      expect(result.severity).toBe('high');
      expect(result.relevantProvisions).toHaveLength(2);
    });

    it('should accept all severity levels', () => {
      const severityLevels = ['critical', 'high', 'medium', 'low', 'informational'];

      for (const severity of severityLevels) {
        const issue = {
          id: 'test-issue',
          category: 'compliance',
          severity,
          title: 'Test Issue',
          description: 'Test description',
        };
        const result = LegalIssueSchema.parse(issue);
        expect(result.severity).toBe(severity);
      }
    });

    it('should accept issue without optional fields', () => {
      const validIssue = {
        id: 'issue-2',
        category: 'regulatory',
        severity: 'medium',
        title: 'Compliance Gap',
        description: 'Missing data protection provisions',
      };

      const result = LegalIssueSchema.parse(validIssue);
      expect(result.relevantProvisions).toBeUndefined();
    });

    it('should reject invalid severity', () => {
      const invalidIssue = {
        id: 'issue-1',
        category: 'test',
        severity: 'invalid_severity',
        title: 'Test',
        description: 'Test',
      };

      expect(() => LegalIssueSchema.parse(invalidIssue)).toThrow();
    });
  });

  describe('LegalAnalyzeOutputSchema', () => {
    it('should accept valid analysis output', () => {
      const validOutput = {
        documentType: 'contract',
        summary: 'This is an employment contract with standard provisions.',
        issues: [
          {
            id: 'issue-1',
            category: 'employment',
            severity: 'medium',
            title: 'Non-compete clause',
            description: 'May be too broad',
          },
        ],
        riskScore: 0.45,
        recommendations: ['Narrow non-compete scope', 'Add choice of law clause'],
        extractedCitations: ['Art. 340 OR', 'Art. 340a OR'],
        metadata: { analyzedAt: '2024-01-15', wordCount: 5000 },
      };

      const result = LegalAnalyzeOutputSchema.parse(validOutput);
      expect(result.issues).toHaveLength(1);
      expect(result.riskScore).toBe(0.45);
    });

    it('should accept output without optional fields', () => {
      const validOutput = {
        documentType: 'letter',
        summary: 'A formal letter',
        issues: [],
      };

      const result = LegalAnalyzeOutputSchema.parse(validOutput);
      expect(result.riskScore).toBeUndefined();
    });

    it('should reject risk score below 0', () => {
      const invalidOutput = {
        documentType: 'contract',
        summary: 'Test',
        issues: [],
        riskScore: -0.1,
      };

      expect(() => LegalAnalyzeOutputSchema.parse(invalidOutput)).toThrow();
    });

    it('should reject risk score above 1', () => {
      const invalidOutput = {
        documentType: 'contract',
        summary: 'Test',
        issues: [],
        riskScore: 1.1,
      };

      expect(() => LegalAnalyzeOutputSchema.parse(invalidOutput)).toThrow();
    });
  });
});

describe('Schema Integration', () => {
  describe('Cross-schema validation', () => {
    it('should validate research results used in analysis', () => {
      // Simulate flow: research results → analysis input
      const researchOutput = LegalResearchOutputSchema.parse({
        results: [
          {
            id: 'bge-1',
            title: 'BGE 145 III 229',
            source: 'precedent',
            relevanceScore: 0.9,
            snippet: 'Key precedent on contract liability',
          },
        ],
        totalResults: 1,
        query: 'Art. 97 OR liability',
        searchedSources: ['bundesgericht'],
      });

      // Use research snippet as part of analysis document
      const analysisInput = LegalAnalyzeInputSchema.parse({
        document: `Analysis document incorporating research: ${researchOutput.results[0].snippet}`,
        analysisType: 'issues',
        domain: 'commercial',
      });

      expect(analysisInput.document).toContain('Key precedent');
    });

    it('should validate citation output used in draft', () => {
      // Simulate flow: citation parsing → draft with citations
      const citationOutput = LegalCitationOutputSchema.parse({
        parsed: {
          type: 'statute',
          statute: 'OR',
          article: 97,
          paragraph: 1,
          isValid: true,
          formattedCitation: 'Art. 97 Abs. 1 OR',
        },
        isValid: true,
        formattedCitation: 'Art. 97 Abs. 1 OR',
      });

      // Draft referencing the citation
      const draftOutput = LegalDraftOutputSchema.parse({
        documentType: 'brief',
        title: 'Legal Brief on Contract Liability',
        content: `Based on ${citationOutput.formattedCitation}, the defendant is liable...`,
        citations: [citationOutput.formattedCitation],
      });

      expect(draftOutput.citations).toContain('Art. 97 Abs. 1 OR');
    });

    it('should validate strategy options used in draft recommendations', () => {
      // Simulate flow: strategy → draft
      const strategyOutput = LegalStrategyOutputSchema.parse({
        caseAssessment: 'Strong case',
        options: [
          {
            id: 'settlement',
            name: 'Settlement Negotiation',
            description: 'Negotiate out of court',
            pros: ['Quick', 'Cheaper'],
            cons: ['Lower recovery'],
            estimatedCost: 'CHF 10,000 - 20,000',
          },
        ],
        recommendedOption: 'settlement',
        keyConsiderations: ['Time constraints'],
      });

      // Draft a settlement letter based on strategy
      const draftInput = LegalDraftInputSchema.parse({
        documentType: 'letter',
        subject: `${strategyOutput.options[0].name} Proposal`,
        formality: 'formal',
      });

      expect(draftInput.subject).toContain('Settlement Negotiation');
    });
  });
});
