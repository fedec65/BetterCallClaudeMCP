import { describe, it, expect } from 'vitest';
import { legalStrategy } from '../tools/legal-strategy.js';
import {
  LegalStrategyInputSchema,
  LegalStrategyOutputSchema,
  type LegalStrategyInput,
} from '../types.js';

describe('legal_strategy tool', () => {
  // ============================================================================
  // Input Validation Tests
  // ============================================================================
  describe('input validation', () => {
    it('should accept valid minimal input', () => {
      const input = {
        case_facts: 'Client was delivered defective goods under a sales contract.',
        legal_area: 'contract',
        client_position: 'plaintiff',
      };
      const result = LegalStrategyInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should accept valid full input', () => {
      const input = {
        case_facts: 'Client was wrongfully terminated after 5 years of employment.',
        jurisdiction: 'cantonal',
        canton: 'ZH',
        legal_area: 'employment',
        client_position: 'plaintiff',
        dispute_amount: 150000,
        deadline_pressure: 'urgent',
        language: 'de',
      };
      const result = LegalStrategyInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should reject empty case_facts', () => {
      const input = {
        case_facts: '',
        legal_area: 'contract',
        client_position: 'plaintiff',
      };
      const result = LegalStrategyInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject invalid legal_area', () => {
      const input = {
        case_facts: 'Some case facts',
        legal_area: 'invalid_area',
        client_position: 'plaintiff',
      };
      const result = LegalStrategyInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject invalid client_position', () => {
      const input = {
        case_facts: 'Some case facts',
        legal_area: 'contract',
        client_position: 'witness',
      };
      const result = LegalStrategyInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should apply default values for optional fields', () => {
      const input = {
        case_facts: 'Some case facts',
        legal_area: 'contract',
        client_position: 'plaintiff',
      };
      const result = LegalStrategyInputSchema.parse(input);
      expect(result.jurisdiction).toBe('federal');
      expect(result.deadline_pressure).toBe('normal');
      expect(result.language).toBe('de');
    });

    it('should accept all valid legal areas', () => {
      const legalAreas = [
        'contract', 'corporate', 'employment', 'tort', 'property',
        'family', 'succession', 'intellectual_property', 'competition',
        'banking', 'tax', 'administrative', 'criminal',
      ];
      for (const area of legalAreas) {
        const input = {
          case_facts: 'Some case facts',
          legal_area: area,
          client_position: 'plaintiff',
        };
        const result = LegalStrategyInputSchema.safeParse(input);
        expect(result.success).toBe(true);
      }
    });

    it('should accept all valid client positions', () => {
      const positions = ['plaintiff', 'defendant', 'appellant', 'respondent'];
      for (const position of positions) {
        const input = {
          case_facts: 'Some case facts',
          legal_area: 'contract',
          client_position: position,
        };
        const result = LegalStrategyInputSchema.safeParse(input);
        expect(result.success).toBe(true);
      }
    });

    it('should accept all valid cantons', () => {
      const cantons = ['ZH', 'BE', 'GE', 'BS', 'VD', 'TI'];
      for (const canton of cantons) {
        const input = {
          case_facts: 'Some case facts',
          legal_area: 'contract',
          client_position: 'plaintiff',
          jurisdiction: 'cantonal',
          canton: canton,
        };
        const result = LegalStrategyInputSchema.safeParse(input);
        expect(result.success).toBe(true);
      }
    });
  });

  // ============================================================================
  // Contract Law Tests
  // ============================================================================
  describe('contract law analysis', () => {
    it('should analyze breach of contract case for plaintiff', () => {
      const input: LegalStrategyInput = {
        case_facts: 'Client ordered 1000 units of machinery parts at CHF 50 per unit. Seller delivered only 800 units, causing production delays and loss of CHF 25,000 in contracts.',
        legal_area: 'contract',
        client_position: 'plaintiff',
        dispute_amount: 35000,
        jurisdiction: 'federal',
        deadline_pressure: 'normal',
        language: 'de',
      };

      const result = legalStrategy(input);

      // Validate output schema
      const validation = LegalStrategyOutputSchema.safeParse(result);
      expect(validation.success).toBe(true);

      // Check assessment structure
      expect(result.assessment.strengths.length).toBeGreaterThan(0);
      expect(result.assessment.successLikelihood).toBeDefined();
      expect(['very_high', 'high', 'medium', 'low', 'very_low']).toContain(result.assessment.successLikelihood);

      // Check strategy content
      expect(result.strategy.primaryApproach).toBeDefined();
      expect(result.strategy.keyArguments.length).toBeGreaterThan(0);
      expect(result.strategy.statutoryBasis).toContain('Art. 97 OR');

      // Check settlement assessment
      expect(result.settlement.recommended).toBeDefined();
      expect(result.settlement.negotiationLeverage).toBeDefined();

      // Check procedural information
      expect(result.procedural.recommendedVenue).toBeDefined();
      expect(result.procedural.estimatedDuration).toBeDefined();

      // Check risks
      expect(Array.isArray(result.risks)).toBe(true);

      // Check next steps
      expect(result.nextSteps.length).toBeGreaterThan(0);

      // Check language
      expect(result.language).toBe('de');
    });

    it('should analyze breach of contract case for defendant', () => {
      const input: LegalStrategyInput = {
        case_facts: 'Client (seller) is being sued for non-delivery of goods. Delivery was prevented by force majeure (flood destroying warehouse).',
        legal_area: 'contract',
        client_position: 'defendant',
        dispute_amount: 100000,
        jurisdiction: 'federal',
        deadline_pressure: 'urgent',
        language: 'de',
      };

      const result = legalStrategy(input);

      expect(result.assessment.strengths.length).toBeGreaterThan(0);
      expect(result.strategy.keyArguments.some(arg =>
        arg.toLowerCase().includes('force majeure') ||
        arg.toLowerCase().includes('höhere gewalt') ||
        arg.toLowerCase().includes('unmöglichkeit')
      )).toBe(true);
      expect(result.strategy.statutoryBasis).toContain('Art. 119 OR');
    });

    it('should reference OR (Code of Obligations) for contract matters', () => {
      const input: LegalStrategyInput = {
        case_facts: 'Dispute over warranty claims for defective product.',
        legal_area: 'contract',
        client_position: 'plaintiff',
        jurisdiction: 'federal',
        deadline_pressure: 'normal',
        language: 'de',
      };

      const result = legalStrategy(input);

      // Should reference OR articles
      const hasORReference = result.strategy.statutoryBasis.some(ref =>
        ref.includes('OR') || ref.includes('CO')
      );
      expect(hasORReference).toBe(true);
    });
  });

  // ============================================================================
  // Employment Law Tests
  // ============================================================================
  describe('employment law analysis', () => {
    it('should analyze wrongful termination case', () => {
      const input: LegalStrategyInput = {
        case_facts: 'Employee was terminated without notice period after 10 years of service. Employer claims gross misconduct but evidence is weak.',
        legal_area: 'employment',
        client_position: 'plaintiff',
        jurisdiction: 'cantonal',
        canton: 'ZH',
        dispute_amount: 80000,
        deadline_pressure: 'normal',
        language: 'de',
      };

      const result = legalStrategy(input);

      // Validate schema
      expect(LegalStrategyOutputSchema.safeParse(result).success).toBe(true);

      // Check employment-specific references
      const hasEmploymentRefs = result.strategy.statutoryBasis.some(ref =>
        ref.includes('Art. 335') || ref.includes('Art. 336') || ref.includes('Art. 337')
      );
      expect(hasEmploymentRefs).toBe(true);

      // Check venue recommendation for ZH
      expect(result.procedural.recommendedVenue).toContain('Zürich');
    });

    it('should analyze discrimination claim', () => {
      const input: LegalStrategyInput = {
        case_facts: 'Female employee received 20% lower salary than male colleagues in same position with similar experience.',
        legal_area: 'employment',
        client_position: 'plaintiff',
        jurisdiction: 'federal',
        deadline_pressure: 'normal',
        language: 'de',
      };

      const result = legalStrategy(input);

      // Should reference GlG (Gleichstellungsgesetz)
      const hasEqualityRef = result.strategy.statutoryBasis.some(ref =>
        ref.includes('GlG') || ref.includes('Gleichstellung') || ref.includes('égalité')
      );
      expect(hasEqualityRef).toBe(true);
    });
  });

  // ============================================================================
  // Corporate Law Tests
  // ============================================================================
  describe('corporate law analysis', () => {
    it('should analyze shareholder dispute', () => {
      const input: LegalStrategyInput = {
        case_facts: 'Minority shareholder (30%) claims board of directors violated duty of care by approving transaction benefiting majority shareholder.',
        legal_area: 'corporate',
        client_position: 'plaintiff',
        jurisdiction: 'federal',
        dispute_amount: 500000,
        deadline_pressure: 'normal',
        language: 'de',
      };

      const result = legalStrategy(input);

      // Should reference OR corporate provisions
      const hasCorporateRefs = result.strategy.statutoryBasis.some(ref =>
        ref.includes('Art. 716') || ref.includes('Art. 717') || ref.includes('Art. 754')
      );
      expect(hasCorporateRefs).toBe(true);

      // High dispute amount should affect procedural recommendations
      expect(result.procedural.recommendedVenue).toBeDefined();
    });
  });

  // ============================================================================
  // Tort Law Tests
  // ============================================================================
  describe('tort law analysis', () => {
    it('should analyze personal injury case', () => {
      const input: LegalStrategyInput = {
        case_facts: 'Client injured in car accident caused by defendant running red light. Medical expenses CHF 30,000, ongoing pain and suffering.',
        legal_area: 'tort',
        client_position: 'plaintiff',
        dispute_amount: 100000,
        jurisdiction: 'federal',
        deadline_pressure: 'normal',
        language: 'de',
      };

      const result = legalStrategy(input);

      // Should reference tort provisions
      const hasTortRefs = result.strategy.statutoryBasis.some(ref =>
        ref.includes('Art. 41') || ref.includes('Art. 47') || ref.includes('SVG')
      );
      expect(hasTortRefs).toBe(true);

      // Should include damages assessment
      expect(result.strategy.keyArguments.some(arg =>
        arg.toLowerCase().includes('schaden') ||
        arg.toLowerCase().includes('damage') ||
        arg.toLowerCase().includes('genugtuung')
      )).toBe(true);
    });
  });

  // ============================================================================
  // Multi-Language Tests
  // ============================================================================
  describe('multi-language support', () => {
    it('should generate French output', () => {
      const input: LegalStrategyInput = {
        case_facts: 'Litige contractuel concernant la livraison de marchandises défectueuses.',
        legal_area: 'contract',
        client_position: 'plaintiff',
        jurisdiction: 'cantonal',
        canton: 'GE',
        deadline_pressure: 'normal',
        language: 'fr',
      };

      const result = legalStrategy(input);

      expect(result.language).toBe('fr');
      // French output should use French terminology
      expect(result.strategy.statutoryBasis.some(ref => ref.includes('CO'))).toBe(true);
      expect(result.procedural.recommendedVenue).toContain('Genève');
    });

    it('should generate Italian output', () => {
      const input: LegalStrategyInput = {
        case_facts: 'Controversia contrattuale riguardante la consegna di merci difettose.',
        legal_area: 'contract',
        client_position: 'plaintiff',
        jurisdiction: 'cantonal',
        canton: 'TI',
        deadline_pressure: 'normal',
        language: 'it',
      };

      const result = legalStrategy(input);

      expect(result.language).toBe('it');
      expect(result.procedural.recommendedVenue).toContain('Ticino');
    });

    it('should generate English output', () => {
      const input: LegalStrategyInput = {
        case_facts: 'Contract dispute regarding delivery of defective goods.',
        legal_area: 'contract',
        client_position: 'plaintiff',
        jurisdiction: 'federal',
        deadline_pressure: 'normal',
        language: 'en',
      };

      const result = legalStrategy(input);

      expect(result.language).toBe('en');
    });
  });

  // ============================================================================
  // Settlement Recommendation Tests
  // ============================================================================
  describe('settlement recommendations', () => {
    it('should recommend settlement for weak case', () => {
      const input: LegalStrategyInput = {
        case_facts: 'Client claims breach of oral agreement. No written evidence. Counterparty denies any agreement.',
        legal_area: 'contract',
        client_position: 'plaintiff',
        dispute_amount: 10000,
        jurisdiction: 'federal',
        deadline_pressure: 'normal',
        language: 'de',
      };

      const result = legalStrategy(input);

      // Weak case with low amount should recommend settlement
      expect(result.settlement.recommended).toBe(true);
      expect(result.settlement.negotiationLeverage).toBe('weak');
    });

    it('should provide settlement range based on dispute amount', () => {
      const input: LegalStrategyInput = {
        case_facts: 'Clear breach of written contract with documented damages.',
        legal_area: 'contract',
        client_position: 'plaintiff',
        dispute_amount: 100000,
        jurisdiction: 'federal',
        deadline_pressure: 'normal',
        language: 'de',
      };

      const result = legalStrategy(input);

      if (result.settlement.suggestedRange) {
        expect(result.settlement.suggestedRange.min).toBeDefined();
        expect(result.settlement.suggestedRange.max).toBeDefined();
      }
    });
  });

  // ============================================================================
  // Procedural Recommendation Tests
  // ============================================================================
  describe('procedural recommendations', () => {
    it('should recommend Handelsgericht for commercial disputes in ZH', () => {
      const input: LegalStrategyInput = {
        case_facts: 'Dispute between two companies over supply contract.',
        legal_area: 'contract',
        client_position: 'plaintiff',
        jurisdiction: 'cantonal',
        canton: 'ZH',
        dispute_amount: 50000,
        deadline_pressure: 'normal',
        language: 'de',
      };

      const result = legalStrategy(input);

      expect(result.procedural.recommendedVenue).toContain('Handelsgericht');
    });

    it('should estimate higher costs for complex cases', () => {
      const simpleCase: LegalStrategyInput = {
        case_facts: 'Simple debt collection for unpaid invoice.',
        legal_area: 'contract',
        client_position: 'plaintiff',
        dispute_amount: 5000,
        jurisdiction: 'federal',
        deadline_pressure: 'normal',
        language: 'de',
      };

      const complexCase: LegalStrategyInput = {
        case_facts: 'Multi-party international contract dispute with expert witnesses needed.',
        legal_area: 'contract',
        client_position: 'plaintiff',
        dispute_amount: 1000000,
        jurisdiction: 'federal',
        deadline_pressure: 'normal',
        language: 'de',
      };

      const simpleResult = legalStrategy(simpleCase);
      const complexResult = legalStrategy(complexCase);

      // Both should have cost estimates
      expect(simpleResult.procedural.estimatedCosts.courtFees).toBeDefined();
      expect(complexResult.procedural.estimatedCosts.courtFees).toBeDefined();
    });

    it('should recommend appeal options', () => {
      const input: LegalStrategyInput = {
        case_facts: 'First instance judgment expected soon.',
        legal_area: 'contract',
        client_position: 'appellant',
        jurisdiction: 'cantonal',
        canton: 'ZH',
        dispute_amount: 50000,
        deadline_pressure: 'urgent',
        language: 'de',
      };

      const result = legalStrategy(input);

      expect(result.procedural.appealOptions.length).toBeGreaterThan(0);
      expect(result.procedural.appealOptions.some(opt =>
        opt.includes('Berufung') || opt.includes('Beschwerde') || opt.includes('BGer')
      )).toBe(true);
    });
  });

  // ============================================================================
  // Risk Assessment Tests
  // ============================================================================
  describe('risk assessment', () => {
    it('should identify risks for each case', () => {
      const input: LegalStrategyInput = {
        case_facts: 'Contract dispute with some ambiguous terms.',
        legal_area: 'contract',
        client_position: 'plaintiff',
        jurisdiction: 'federal',
        deadline_pressure: 'normal',
        language: 'de',
      };

      const result = legalStrategy(input);

      expect(result.risks.length).toBeGreaterThan(0);
      result.risks.forEach(risk => {
        expect(risk.description).toBeDefined();
        expect(['high', 'medium', 'low']).toContain(risk.probability);
        expect(['high', 'medium', 'low']).toContain(risk.impact);
        expect(risk.mitigation).toBeDefined();
      });
    });

    it('should identify cost risk for low-value disputes', () => {
      const input: LegalStrategyInput = {
        case_facts: 'Dispute over CHF 2000 deposit.',
        legal_area: 'contract',
        client_position: 'plaintiff',
        dispute_amount: 2000,
        jurisdiction: 'federal',
        deadline_pressure: 'normal',
        language: 'de',
      };

      const result = legalStrategy(input);

      const hasCostRisk = result.risks.some(risk =>
        risk.description.toLowerCase().includes('kosten') ||
        risk.description.toLowerCase().includes('cost') ||
        risk.description.toLowerCase().includes('prozessrisiko')
      );
      expect(hasCostRisk).toBe(true);
    });
  });

  // ============================================================================
  // Next Steps Tests
  // ============================================================================
  describe('next steps generation', () => {
    it('should generate prioritized next steps', () => {
      const input: LegalStrategyInput = {
        case_facts: 'New contract dispute requiring immediate action.',
        legal_area: 'contract',
        client_position: 'plaintiff',
        jurisdiction: 'federal',
        deadline_pressure: 'urgent',
        language: 'de',
      };

      const result = legalStrategy(input);

      expect(result.nextSteps.length).toBeGreaterThan(0);

      // Should have high priority steps for urgent cases
      const hasHighPriority = result.nextSteps.some(step => step.priority === 'high');
      expect(hasHighPriority).toBe(true);

      // Each step should have action and priority
      result.nextSteps.forEach(step => {
        expect(step.action).toBeDefined();
        expect(['high', 'medium', 'low']).toContain(step.priority);
      });
    });

    it('should suggest evidence gathering as early step', () => {
      const input: LegalStrategyInput = {
        case_facts: 'Client believes they have a claim but evidence not yet secured.',
        legal_area: 'contract',
        client_position: 'plaintiff',
        jurisdiction: 'federal',
        deadline_pressure: 'normal',
        language: 'de',
      };

      const result = legalStrategy(input);

      const hasEvidenceStep = result.nextSteps.some(step =>
        step.action.toLowerCase().includes('beweis') ||
        step.action.toLowerCase().includes('evidence') ||
        step.action.toLowerCase().includes('dokument')
      );
      expect(hasEvidenceStep).toBe(true);
    });
  });

  // ============================================================================
  // Output Schema Validation Tests
  // ============================================================================
  describe('output schema validation', () => {
    it('should always produce valid output schema', () => {
      const testCases: LegalStrategyInput[] = [
        {
          case_facts: 'Contract dispute',
          legal_area: 'contract',
          client_position: 'plaintiff',
          jurisdiction: 'federal',
          deadline_pressure: 'normal',
          language: 'de',
        },
        {
          case_facts: 'Employment termination',
          legal_area: 'employment',
          client_position: 'defendant',
          jurisdiction: 'cantonal',
          canton: 'BE',
          deadline_pressure: 'urgent',
          language: 'fr',
        },
        {
          case_facts: 'Corporate governance issue',
          legal_area: 'corporate',
          client_position: 'appellant',
          jurisdiction: 'federal',
          dispute_amount: 1000000,
          deadline_pressure: 'flexible',
          language: 'en',
        },
      ];

      for (const input of testCases) {
        const result = legalStrategy(input);
        const validation = LegalStrategyOutputSchema.safeParse(result);
        expect(validation.success).toBe(true);
      }
    });
  });
});
