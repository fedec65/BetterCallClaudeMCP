import { describe, it, expect } from 'vitest';
import { handleLegalStrategy } from '../../handlers/strategy.js';
import type { LegalStrategyInput, LegalStrategyOutput } from '../../types/index.js';

describe('Strategy Handler', () => {
  describe('handleLegalStrategy', () => {
    it('should generate SWOT analysis for plaintiff case', async () => {
      const input: LegalStrategyInput = {
        caseDescription: 'Contract breach case with documented evidence. The defendant failed to deliver goods as agreed.',
        clientPosition: 'plaintiff',
        jurisdiction: 'federal',
        domain: 'commercial',
      };

      const result = await handleLegalStrategy(input, 'test-request-1');

      expect(result.caseAssessment).toBeDefined();
      expect(result.caseAssessment.strengths).toBeInstanceOf(Array);
      expect(result.caseAssessment.weaknesses).toBeInstanceOf(Array);
      expect(result.caseAssessment.opportunities).toBeInstanceOf(Array);
      expect(result.caseAssessment.threats).toBeInstanceOf(Array);
    });

    it('should generate SWOT analysis for defendant case', async () => {
      const input: LegalStrategyInput = {
        caseDescription: 'Being sued for alleged breach of service contract.',
        clientPosition: 'defendant',
        jurisdiction: 'federal',
      };

      const result = await handleLegalStrategy(input, 'test-request-2');

      expect(result.caseAssessment).toBeDefined();
      // Defendant should have appropriate defensive strengths
      expect(result.caseAssessment.strengths.length).toBeGreaterThan(0);
    });

    it('should calculate success likelihood between 0 and 1', async () => {
      const input: LegalStrategyInput = {
        caseDescription: 'Clear breach of contract with documented damages.',
        clientPosition: 'plaintiff',
      };

      const result = await handleLegalStrategy(input, 'test-request-3');

      expect(result.overallSuccessLikelihood).toBeGreaterThanOrEqual(0);
      expect(result.overallSuccessLikelihood).toBeLessThanOrEqual(1);
    });

    it('should generate strategic options', async () => {
      const input: LegalStrategyInput = {
        caseDescription: 'Commercial dispute over service delivery.',
        clientPosition: 'plaintiff',
        domain: 'commercial',
      };

      const result = await handleLegalStrategy(input, 'test-request-4');

      expect(result.strategicOptions).toBeInstanceOf(Array);
      expect(result.strategicOptions.length).toBeGreaterThan(0);

      // Each option should have required fields
      for (const option of result.strategicOptions) {
        expect(option.name).toBeDefined();
        expect(option.description).toBeDefined();
        expect(option.pros).toBeInstanceOf(Array);
        expect(option.cons).toBeInstanceOf(Array);
        expect(option.estimatedSuccessRate).toBeGreaterThanOrEqual(0);
        expect(option.estimatedSuccessRate).toBeLessThanOrEqual(1);
        expect(option.timeframe).toBeDefined();
        expect(option.costLevel).toMatch(/^(low|medium|high)$/);
      }
    });

    it('should include defensive strategy for defendants', async () => {
      const input: LegalStrategyInput = {
        caseDescription: 'Alleged breach of employment contract.',
        clientPosition: 'defendant',
        domain: 'employment',
      };

      const result = await handleLegalStrategy(input, 'test-request-5');

      const hasDefensiveOption = result.strategicOptions.some(
        option => option.name.toLowerCase().includes('defense')
      );
      expect(hasDefensiveOption).toBe(true);
    });

    it('should identify key precedents', async () => {
      const input: LegalStrategyInput = {
        caseDescription: 'Contract breach claim based on good faith violation.',
        clientPosition: 'plaintiff',
        domain: 'commercial',
      };

      const result = await handleLegalStrategy(input, 'test-request-6');

      expect(result.keyPrecedents).toBeInstanceOf(Array);
      expect(result.keyPrecedents.length).toBeGreaterThan(0);
      // Precedents should be in BGE format
      expect(result.keyPrecedents.some(p => p.includes('BGE'))).toBe(true);
    });

    it('should generate procedural considerations', async () => {
      const input: LegalStrategyInput = {
        caseDescription: 'Employment termination dispute.',
        clientPosition: 'plaintiff',
        jurisdiction: 'federal',
        canton: 'ZH',
        domain: 'employment',
      };

      const result = await handleLegalStrategy(input, 'test-request-7');

      expect(result.proceduralConsiderations).toBeInstanceOf(Array);
      expect(result.proceduralConsiderations.length).toBeGreaterThan(0);
      // Should reference ZPO
      expect(result.proceduralConsiderations.some(c => c.includes('ZPO'))).toBe(true);
    });

    it('should provide settlement analysis', async () => {
      const input: LegalStrategyInput = {
        caseDescription: 'Moderate contract dispute.',
        clientPosition: 'plaintiff',
      };

      const result = await handleLegalStrategy(input, 'test-request-8');

      expect(result.settlementAnalysis).toBeDefined();
      expect(typeof result.settlementAnalysis.advisable).toBe('boolean');
    });

    it('should include disclaimer in appropriate language', async () => {
      const inputDe: LegalStrategyInput = {
        caseDescription: 'Test case.',
        clientPosition: 'plaintiff',
        lang: 'de',
      };

      const resultDe = await handleLegalStrategy(inputDe, 'test-request-9');
      expect(resultDe.disclaimer).toContain('Rechtsberatung');

      const inputFr: LegalStrategyInput = {
        caseDescription: 'Test case.',
        clientPosition: 'plaintiff',
        lang: 'fr',
      };

      const resultFr = await handleLegalStrategy(inputFr, 'test-request-10');
      expect(resultFr.disclaimer).toContain('avis juridique');
    });

    it('should handle budget constraints', async () => {
      const input: LegalStrategyInput = {
        caseDescription: 'Small claims case.',
        clientPosition: 'plaintiff',
        constraints: ['budget: limited', 'time: urgent'],
      };

      const result = await handleLegalStrategy(input, 'test-request-11');

      // Should prioritize cost-effective options
      const hasLowCostOption = result.strategicOptions.some(
        option => option.costLevel === 'low'
      );
      expect(hasLowCostOption).toBe(true);
    });

    it('should detect evidence from case description', async () => {
      const inputWithEvidence: LegalStrategyInput = {
        caseDescription: 'Contract breach with written documentation and signed agreement as evidence.',
        clientPosition: 'plaintiff',
      };

      const resultWithEvidence = await handleLegalStrategy(inputWithEvidence, 'test-request-12');

      // Should recognize documentary evidence as strength
      const hasEvidenceStrength = resultWithEvidence.caseAssessment.strengths.some(
        s => s.toLowerCase().includes('document') || s.toLowerCase().includes('evidence')
      );
      expect(hasEvidenceStrength).toBe(true);
    });

    it('should detect limitation period concerns', async () => {
      const input: LegalStrategyInput = {
        caseDescription: 'Damage occurred 3 years ago in 2020.',
        clientPosition: 'plaintiff',
      };

      const result = await handleLegalStrategy(input, 'test-request-13');

      // Should flag limitation period as threat
      const hasLimitationThreat = result.caseAssessment.threats.some(
        t => t.toLowerCase().includes('limitation') || t.includes('127-142 OR')
      );
      expect(hasLimitationThreat).toBe(true);
    });

    it('should recommend approach based on success likelihood', async () => {
      const input: LegalStrategyInput = {
        caseDescription: 'Strong case with clear breach and documented damages.',
        clientPosition: 'plaintiff',
        domain: 'commercial',
      };

      const result = await handleLegalStrategy(input, 'test-request-14');

      expect(result.recommendedApproach).toBeDefined();
      expect(typeof result.recommendedApproach).toBe('string');
      expect(result.recommendedApproach.length).toBeGreaterThan(0);
    });

    it('should handle appellant position', async () => {
      const input: LegalStrategyInput = {
        caseDescription: 'Appealing first instance decision.',
        clientPosition: 'appellant',
        jurisdiction: 'federal',
      };

      const result = await handleLegalStrategy(input, 'test-request-15');

      // Appellant is treated like plaintiff
      expect(result.caseAssessment.threats.some(
        t => t.includes('burden of proof') || t.includes('Art. 8 ZGB')
      )).toBe(true);
    });

    it('should handle respondent position', async () => {
      const input: LegalStrategyInput = {
        caseDescription: 'Responding to appeal.',
        clientPosition: 'respondent',
      };

      const result = await handleLegalStrategy(input, 'test-request-16');

      // Should include defensive strategies
      expect(result.strategicOptions.some(
        o => o.name.toLowerCase().includes('defense')
      )).toBe(true);
    });
  });
});
