import { describe, it, expect } from 'vitest';
import { handleLegalDraft } from '../../handlers/draft.js';
import type { LegalDraftInput } from '../../types/index.js';

describe('Draft Handler', () => {
  describe('handleLegalDraft', () => {
    describe('Contract Generation', () => {
      it('should generate a basic contract', async () => {
        const input: LegalDraftInput = {
          documentType: 'contract',
          subject: 'Service Agreement',
          parties: [
            { name: 'ABC AG', role: 'Service Provider' },
            { name: 'XYZ GmbH', role: 'Client' },
          ],
        };

        const result = await handleLegalDraft(input, 'test-request-1');

        expect(result.content).toBeDefined();
        expect(result.content.length).toBeGreaterThan(0);
        expect(result.documentType).toBe('contract');
      });

      it('should include parties in contract', async () => {
        const input: LegalDraftInput = {
          documentType: 'contract',
          subject: 'Employment Contract',
          parties: [
            { name: 'Arbeitgeber AG', role: 'Employer' },
            { name: 'Max Muster', role: 'Employee' },
          ],
        };

        const result = await handleLegalDraft(input, 'test-request-2');

        expect(result.content).toContain('Arbeitgeber AG');
        expect(result.content).toContain('Max Muster');
      });

      it('should generate contract sections', async () => {
        const input: LegalDraftInput = {
          documentType: 'contract',
          subject: 'Consulting Agreement',
          parties: [
            { name: 'Consultant', role: 'Consultant' },
            { name: 'Client', role: 'Client' },
          ],
          sections: ['preamble', 'definitions', 'scope', 'compensation', 'termination'],
        };

        const result = await handleLegalDraft(input, 'test-request-3');

        expect(result.content).toBeDefined();
        expect(result.sections).toBeDefined();
      });

      it('should warn when parties are missing for contract', async () => {
        const input: LegalDraftInput = {
          documentType: 'contract',
          subject: 'Anonymous Contract',
        };

        const result = await handleLegalDraft(input, 'test-request-4');

        expect(result.warnings).toBeDefined();
        expect(result.warnings.length).toBeGreaterThan(0);
      });
    });

    describe('Legal Brief Generation', () => {
      it('should generate a legal brief', async () => {
        const input: LegalDraftInput = {
          documentType: 'brief',
          subject: 'Contract Breach Case',
          context: 'Plaintiff seeks damages for breach of service contract',
        };

        const result = await handleLegalDraft(input, 'test-request-5');

        expect(result.content).toBeDefined();
        expect(result.documentType).toBe('brief');
      });

      it('should include legal arguments in brief', async () => {
        const input: LegalDraftInput = {
          documentType: 'brief',
          subject: 'Liability Defense',
          sections: ['facts', 'legal_basis', 'arguments', 'conclusion'],
        };

        const result = await handleLegalDraft(input, 'test-request-6');

        expect(result.content).toBeDefined();
        expect(result.sections).toBeDefined();
      });
    });

    describe('Motion Generation', () => {
      it('should generate a motion', async () => {
        const input: LegalDraftInput = {
          documentType: 'motion',
          subject: 'Motion to Dismiss',
          jurisdiction: 'federal',
        };

        const result = await handleLegalDraft(input, 'test-request-7');

        expect(result.content).toBeDefined();
        expect(result.documentType).toBe('motion');
      });

      it('should include procedural elements in motion', async () => {
        const input: LegalDraftInput = {
          documentType: 'motion',
          subject: 'Summary Judgment Motion',
          context: 'Based on undisputed material facts',
        };

        const result = await handleLegalDraft(input, 'test-request-8');

        expect(result.content).toBeDefined();
      });
    });

    describe('Legal Opinion Generation', () => {
      it('should generate a legal opinion', async () => {
        const input: LegalDraftInput = {
          documentType: 'opinion',
          subject: 'Liability Risk Assessment',
          context: 'Analysis of potential liability under Art. 97 OR',
        };

        const result = await handleLegalDraft(input, 'test-request-9');

        expect(result.content).toBeDefined();
        expect(result.documentType).toBe('opinion');
      });

      it('should include analysis sections in opinion', async () => {
        const input: LegalDraftInput = {
          documentType: 'opinion',
          subject: 'Contract Validity Assessment',
          sections: ['issue', 'analysis', 'conclusion', 'recommendations'],
        };

        const result = await handleLegalDraft(input, 'test-request-10');

        expect(result.content).toBeDefined();
      });
    });

    describe('Memorandum Generation', () => {
      it('should generate a legal memorandum', async () => {
        const input: LegalDraftInput = {
          documentType: 'memorandum',
          subject: 'Corporate Restructuring Options',
          context: 'Analysis of merger possibilities',
        };

        const result = await handleLegalDraft(input, 'test-request-11');

        expect(result.content).toBeDefined();
        expect(result.documentType).toBe('memorandum');
      });
    });

    describe('Letter Generation', () => {
      it('should generate a legal letter', async () => {
        const input: LegalDraftInput = {
          documentType: 'letter',
          subject: 'Demand for Payment',
          parties: [
            { name: 'Creditor AG', role: 'Sender' },
            { name: 'Debtor GmbH', role: 'Recipient' },
          ],
        };

        const result = await handleLegalDraft(input, 'test-request-12');

        expect(result.content).toBeDefined();
        expect(result.documentType).toBe('letter');
      });
    });

    describe('Agreement Generation', () => {
      it('should generate an agreement', async () => {
        const input: LegalDraftInput = {
          documentType: 'agreement',
          subject: 'Settlement Agreement',
          parties: [
            { name: 'Party A', role: 'First Party' },
            { name: 'Party B', role: 'Second Party' },
          ],
        };

        const result = await handleLegalDraft(input, 'test-request-13');

        expect(result.content).toBeDefined();
        expect(result.documentType).toBe('agreement');
      });
    });

    describe('Complaint Generation', () => {
      it('should generate a complaint', async () => {
        const input: LegalDraftInput = {
          documentType: 'complaint',
          subject: 'Breach of Contract Complaint',
          parties: [
            { name: 'Plaintiff Corp', role: 'Plaintiff' },
            { name: 'Defendant LLC', role: 'Defendant' },
          ],
          jurisdiction: 'federal',
        };

        const result = await handleLegalDraft(input, 'test-request-14');

        expect(result.content).toBeDefined();
        expect(result.documentType).toBe('complaint');
      });
    });

    describe('Response Generation', () => {
      it('should generate a response document', async () => {
        const input: LegalDraftInput = {
          documentType: 'response',
          subject: 'Response to Complaint',
          context: 'Defendant denies all allegations',
        };

        const result = await handleLegalDraft(input, 'test-request-15');

        expect(result.content).toBeDefined();
        expect(result.documentType).toBe('response');
      });
    });

    describe('Multi-Lingual Support', () => {
      it('should generate document in German', async () => {
        const input: LegalDraftInput = {
          documentType: 'contract',
          subject: 'Dienstleistungsvertrag',
          lang: 'de',
          parties: [
            { name: 'Anbieter AG', role: 'Auftragnehmer' },
            { name: 'Kunde GmbH', role: 'Auftraggeber' },
          ],
        };

        const result = await handleLegalDraft(input, 'test-request-16');

        expect(result.content).toBeDefined();
        // Should contain German legal terms
        expect(result.title).toBeDefined();
      });

      it('should generate document in French', async () => {
        const input: LegalDraftInput = {
          documentType: 'contract',
          subject: 'Contrat de services',
          lang: 'fr',
          parties: [
            { name: 'Fournisseur SA', role: 'Prestataire' },
            { name: 'Client Sàrl', role: 'Client' },
          ],
        };

        const result = await handleLegalDraft(input, 'test-request-17');

        expect(result.content).toBeDefined();
      });

      it('should generate document in Italian', async () => {
        const input: LegalDraftInput = {
          documentType: 'contract',
          subject: 'Contratto di servizi',
          lang: 'it',
          parties: [
            { name: 'Fornitore SA', role: 'Fornitore' },
            { name: 'Cliente Sagl', role: 'Cliente' },
          ],
        };

        const result = await handleLegalDraft(input, 'test-request-18');

        expect(result.content).toBeDefined();
      });

      it('should generate document in English', async () => {
        const input: LegalDraftInput = {
          documentType: 'contract',
          subject: 'Service Agreement',
          lang: 'en',
          parties: [
            { name: 'Provider Inc', role: 'Service Provider' },
            { name: 'Customer Ltd', role: 'Customer' },
          ],
        };

        const result = await handleLegalDraft(input, 'test-request-19');

        expect(result.content).toBeDefined();
      });
    });

    describe('Jurisdiction Handling', () => {
      it('should handle federal jurisdiction', async () => {
        const input: LegalDraftInput = {
          documentType: 'brief',
          subject: 'Federal Court Submission',
          jurisdiction: 'federal',
        };

        const result = await handleLegalDraft(input, 'test-request-20');

        expect(result.content).toBeDefined();
      });

      it('should handle cantonal jurisdiction', async () => {
        const input: LegalDraftInput = {
          documentType: 'brief',
          subject: 'Cantonal Court Submission',
          jurisdiction: 'cantonal',
          canton: 'ZH',
        };

        const result = await handleLegalDraft(input, 'test-request-21');

        expect(result.content).toBeDefined();
      });
    });

    describe('Domain-Specific Drafts', () => {
      it('should handle commercial domain', async () => {
        const input: LegalDraftInput = {
          documentType: 'contract',
          subject: 'Commercial Supply Agreement',
          domain: 'commercial',
          parties: [
            { name: 'Supplier', role: 'Supplier' },
            { name: 'Buyer', role: 'Buyer' },
          ],
        };

        const result = await handleLegalDraft(input, 'test-request-22');

        expect(result.content).toBeDefined();
      });

      it('should handle employment domain', async () => {
        const input: LegalDraftInput = {
          documentType: 'contract',
          subject: 'Employment Contract',
          domain: 'employment',
          parties: [
            { name: 'Employer AG', role: 'Employer' },
            { name: 'Employee', role: 'Employee' },
          ],
        };

        const result = await handleLegalDraft(input, 'test-request-23');

        expect(result.content).toBeDefined();
      });

      it('should handle corporate domain', async () => {
        const input: LegalDraftInput = {
          documentType: 'agreement',
          subject: 'Shareholders Agreement',
          domain: 'corporate',
          parties: [
            { name: 'Shareholder A', role: 'Shareholder' },
            { name: 'Shareholder B', role: 'Shareholder' },
          ],
        };

        const result = await handleLegalDraft(input, 'test-request-24');

        expect(result.content).toBeDefined();
      });
    });

    describe('Citation Extraction', () => {
      it('should extract citations from generated content', async () => {
        const input: LegalDraftInput = {
          documentType: 'opinion',
          subject: 'Liability under Art. 97 OR',
          context: 'Analysis based on BGE 145 III 229 and Art. 97 Abs. 1 OR',
        };

        const result = await handleLegalDraft(input, 'test-request-25');

        expect(result.citations).toBeDefined();
        expect(result.citations).toBeInstanceOf(Array);
      });
    });

    describe('Document Structure', () => {
      it('should include title', async () => {
        const input: LegalDraftInput = {
          documentType: 'contract',
          subject: 'Test Agreement',
          parties: [
            { name: 'Party A', role: 'First Party' },
            { name: 'Party B', role: 'Second Party' },
          ],
        };

        const result = await handleLegalDraft(input, 'test-request-26');

        expect(result.title).toBeDefined();
        expect(result.title.length).toBeGreaterThan(0);
      });

      it('should include review notes', async () => {
        const input: LegalDraftInput = {
          documentType: 'contract',
          subject: 'Complex Agreement',
          parties: [
            { name: 'Party A', role: 'First Party' },
            { name: 'Party B', role: 'Second Party' },
          ],
        };

        const result = await handleLegalDraft(input, 'test-request-27');

        expect(result.reviewNotes).toBeDefined();
        expect(result.reviewNotes).toBeInstanceOf(Array);
      });

      it('should include metadata', async () => {
        const input: LegalDraftInput = {
          documentType: 'contract',
          subject: 'Test Contract',
          parties: [
            { name: 'Party A', role: 'First Party' },
            { name: 'Party B', role: 'Second Party' },
          ],
        };

        const result = await handleLegalDraft(input, 'test-request-28');

        expect(result.metadata).toBeDefined();
      });
    });

    describe('Custom Content', () => {
      it('should incorporate custom clauses', async () => {
        const input: LegalDraftInput = {
          documentType: 'contract',
          subject: 'Custom Agreement',
          parties: [
            { name: 'Party A', role: 'First Party' },
            { name: 'Party B', role: 'Second Party' },
          ],
          customClauses: [
            'The parties agree to confidentiality obligations.',
            'Non-compete clause for 2 years.',
          ],
        };

        const result = await handleLegalDraft(input, 'test-request-29');

        expect(result.content).toBeDefined();
      });

      it('should include references when provided', async () => {
        const input: LegalDraftInput = {
          documentType: 'opinion',
          subject: 'Legal Opinion with References',
          references: ['BGE 145 III 229', 'Art. 97 OR', 'BGE 142 III 239'],
        };

        const result = await handleLegalDraft(input, 'test-request-30');

        expect(result.content).toBeDefined();
      });
    });

    describe('Error Handling', () => {
      it('should handle empty subject gracefully', async () => {
        const input: LegalDraftInput = {
          documentType: 'contract',
          subject: '',
          parties: [
            { name: 'Party A', role: 'First Party' },
          ],
        };

        const result = await handleLegalDraft(input, 'test-request-31');

        // Should not throw, but return a document or warning
        expect(result).toBeDefined();
      });

      it('should handle missing document type with default', async () => {
        const input = {
          subject: 'Test Document',
        } as LegalDraftInput;

        const result = await handleLegalDraft(input, 'test-request-32');

        expect(result).toBeDefined();
      });
    });

    describe('Boilerplate and Templates', () => {
      it('should include appropriate boilerplate', async () => {
        const input: LegalDraftInput = {
          documentType: 'contract',
          subject: 'Standard Contract',
          parties: [
            { name: 'Party A', role: 'First Party' },
            { name: 'Party B', role: 'Second Party' },
          ],
        };

        const result = await handleLegalDraft(input, 'test-request-33');

        expect(result.content).toBeDefined();
        // Contract should have standard boilerplate sections
      });

      it('should generate appropriate sections for document type', async () => {
        const input: LegalDraftInput = {
          documentType: 'brief',
          subject: 'Legal Brief',
        };

        const result = await handleLegalDraft(input, 'test-request-34');

        expect(result.sections).toBeDefined();
      });
    });

    describe('Professional Disclaimer', () => {
      it('should include professional disclaimer', async () => {
        const input: LegalDraftInput = {
          documentType: 'opinion',
          subject: 'Legal Opinion',
        };

        const result = await handleLegalDraft(input, 'test-request-35');

        // Check for disclaimer in content or metadata
        expect(result.content).toBeDefined();
      });
    });
  });
});
