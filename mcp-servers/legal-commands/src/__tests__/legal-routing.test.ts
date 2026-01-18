import { describe, it, expect } from 'vitest';
import { legalRouting } from '../tools/legal-routing.js';
import { LegalRoutingInputSchema, LegalRoutingOutputSchema } from '../types.js';

describe('legalRouting', () => {
  describe('input validation', () => {
    it('should accept empty input with defaults', () => {
      const result = LegalRoutingInputSchema.parse({});
      expect(result.action).toBe('status');
      expect(result.language).toBe('de');
    });

    it('should accept status action', () => {
      const result = LegalRoutingInputSchema.parse({ action: 'status' });
      expect(result.action).toBe('status');
    });

    it('should accept configure action', () => {
      const result = LegalRoutingInputSchema.parse({ action: 'configure' });
      expect(result.action).toBe('configure');
    });

    it('should accept defaultJurisdiction parameter', () => {
      const result = LegalRoutingInputSchema.parse({ defaultJurisdiction: 'federal' });
      expect(result.defaultJurisdiction).toBe('federal');
    });

    it('should accept defaultCanton parameter', () => {
      const result = LegalRoutingInputSchema.parse({ defaultCanton: 'ZH' });
      expect(result.defaultCanton).toBe('ZH');
    });

    it('should accept autoDetect parameter', () => {
      const result = LegalRoutingInputSchema.parse({ autoDetect: true });
      expect(result.autoDetect).toBe(true);
    });

    it('should accept valid language', () => {
      const result = LegalRoutingInputSchema.parse({ language: 'fr' });
      expect(result.language).toBe('fr');
    });

    it('should reject invalid jurisdiction', () => {
      expect(() => LegalRoutingInputSchema.parse({ defaultJurisdiction: 'invalid' })).toThrow();
    });

    it('should reject invalid canton', () => {
      expect(() => LegalRoutingInputSchema.parse({ defaultCanton: 'XX' })).toThrow();
    });
  });

  describe('output structure', () => {
    it('should return valid output structure', () => {
      const output = legalRouting({});
      const validated = LegalRoutingOutputSchema.parse(output);

      expect(validated.currentConfig).toBeDefined();
      expect(validated.status).toBeDefined();
      expect(validated.message).toBeDefined();
      expect(validated.availableAgents).toBeInstanceOf(Array);
      expect(validated.language).toBeDefined();
    });

    it('should include current configuration', () => {
      const output = legalRouting({});

      expect(output.currentConfig.defaultJurisdiction).toBeDefined();
      expect(typeof output.currentConfig.autoDetect).toBe('boolean');
    });
  });

  describe('status action', () => {
    it('should return current configuration status', () => {
      const output = legalRouting({ action: 'status' });

      expect(output.status).toBe('unchanged');
      expect(output.currentConfig).toBeDefined();
    });

    it('should list available agents', () => {
      const output = legalRouting({ action: 'status' });
      expect(output.availableAgents.length).toBeGreaterThan(0);
    });
  });

  describe('configure action', () => {
    it('should configure default jurisdiction', () => {
      const output = legalRouting({
        action: 'configure',
        defaultJurisdiction: 'cantonal',
      });

      expect(output.status).toBe('configured');
      expect(output.currentConfig.defaultJurisdiction).toBe('cantonal');
    });

    it('should configure default canton', () => {
      const output = legalRouting({
        action: 'configure',
        defaultCanton: 'GE',
      });

      expect(output.status).toBe('configured');
      expect(output.currentConfig.defaultCanton).toBe('GE');
    });

    it('should configure auto-detect setting', () => {
      const output = legalRouting({
        action: 'configure',
        autoDetect: false,
      });

      expect(output.status).toBe('configured');
      expect(output.currentConfig.autoDetect).toBe(false);
    });

    it('should configure multiple settings at once', () => {
      const output = legalRouting({
        action: 'configure',
        defaultJurisdiction: 'cantonal',
        defaultCanton: 'ZH',
        autoDetect: true,
      });

      expect(output.status).toBe('configured');
      expect(output.currentConfig.defaultJurisdiction).toBe('cantonal');
      expect(output.currentConfig.defaultCanton).toBe('ZH');
      expect(output.currentConfig.autoDetect).toBe(true);
    });
  });

  describe('available agents', () => {
    it('should list core agents', () => {
      const output = legalRouting({});
      const agentNames = output.availableAgents.map(a => a.name);

      expect(agentNames).toContain('researcher');
      expect(agentNames).toContain('strategist');
      expect(agentNames).toContain('drafter');
    });

    it('should include agent domain information', () => {
      const output = legalRouting({});

      output.availableAgents.forEach(agent => {
        expect(agent.domain).toBeDefined();
        expect(agent.domain.length).toBeGreaterThan(0);
      });
    });

    it('should include agent status', () => {
      const output = legalRouting({});

      output.availableAgents.forEach(agent => {
        expect(['active', 'inactive']).toContain(agent.status);
      });
    });
  });

  describe('language output', () => {
    it('should return the requested language in output', () => {
      const deOutput = legalRouting({ language: 'de' });
      expect(deOutput.language).toBe('de');

      const frOutput = legalRouting({ language: 'fr' });
      expect(frOutput.language).toBe('fr');
    });

    it('should adapt messages to requested language', () => {
      const deOutput = legalRouting({ action: 'status', language: 'de' });
      const frOutput = legalRouting({ action: 'status', language: 'fr' });

      expect(deOutput.message).not.toBe(frOutput.message);
    });

    it('should show German message by default', () => {
      const output = legalRouting({ action: 'status' });
      expect(output.language).toBe('de');
    });
  });

  describe('message content', () => {
    it('should provide informative status message', () => {
      const output = legalRouting({ action: 'status' });
      expect(output.message.length).toBeGreaterThan(10);
    });

    it('should provide informative configuration message', () => {
      const output = legalRouting({ action: 'configure', defaultJurisdiction: 'federal' });
      expect(output.message.length).toBeGreaterThan(10);
    });
  });
});
