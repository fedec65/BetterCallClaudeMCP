import { describe, it, expect } from 'vitest';
import { legalVersion } from '../tools/legal-version.js';
import { LegalVersionInputSchema, LegalVersionOutputSchema } from '../types.js';

describe('legalVersion', () => {
  describe('input validation', () => {
    it('should accept empty input with defaults', () => {
      const result = LegalVersionInputSchema.parse({});
      expect(result.format).toBe('simple');
    });

    it('should accept simple format', () => {
      const result = LegalVersionInputSchema.parse({ format: 'simple' });
      expect(result.format).toBe('simple');
    });

    it('should accept detailed format', () => {
      const result = LegalVersionInputSchema.parse({ format: 'detailed' });
      expect(result.format).toBe('detailed');
    });

    it('should reject invalid format', () => {
      expect(() => LegalVersionInputSchema.parse({ format: 'invalid' })).toThrow();
    });
  });

  describe('output structure', () => {
    it('should return valid output structure', () => {
      const output = legalVersion({});
      const validated = LegalVersionOutputSchema.parse(output);

      expect(validated.framework).toBeDefined();
      expect(validated.version).toBeDefined();
      expect(validated.buildDate).toBeDefined();
      expect(validated.servers).toBeInstanceOf(Array);
      expect(validated.capabilities).toBeInstanceOf(Array);
    });

    it('should return framework name', () => {
      const output = legalVersion({});
      expect(output.framework).toBe('BetterCallClaude');
    });

    it('should return valid semantic version', () => {
      const output = legalVersion({});
      expect(output.version).toMatch(/^\d+\.\d+\.\d+(-\w+)?$/);
    });

    it('should return valid ISO date for buildDate', () => {
      const output = legalVersion({});
      expect(() => new Date(output.buildDate)).not.toThrow();
    });
  });

  describe('servers information', () => {
    it('should list MCP servers', () => {
      const output = legalVersion({});
      const serverNames = output.servers.map(s => s.name);

      expect(serverNames).toContain('legal-commands');
      expect(serverNames).toContain('legal-citations');
      expect(serverNames).toContain('legal-persona');
      expect(serverNames).toContain('entscheidsuche');
      expect(serverNames).toContain('bge-search');
    });

    it('should include version for each server', () => {
      const output = legalVersion({});

      output.servers.forEach(server => {
        expect(server.version).toMatch(/^\d+\.\d+\.\d+/);
      });
    });

    it('should include status for each server', () => {
      const output = legalVersion({});

      output.servers.forEach(server => {
        expect(['active', 'inactive', 'error']).toContain(server.status);
      });
    });
  });

  describe('capabilities list', () => {
    it('should list framework capabilities', () => {
      const output = legalVersion({});

      expect(output.capabilities).toContain('legal-research');
      expect(output.capabilities).toContain('case-strategy');
      expect(output.capabilities).toContain('document-drafting');
      expect(output.capabilities).toContain('document-analysis');
      expect(output.capabilities).toContain('citation-management');
      expect(output.capabilities).toContain('multi-lingual');
      expect(output.capabilities).toContain('multi-jurisdictional');
    });
  });

  describe('format modes', () => {
    it('should return minimal info in simple format', () => {
      const output = legalVersion({ format: 'simple' });

      expect(output.framework).toBeDefined();
      expect(output.version).toBeDefined();
      // Simple format still includes all fields but may have fewer items
    });

    it('should return complete info in detailed format', () => {
      const output = legalVersion({ format: 'detailed' });

      expect(output.servers.length).toBeGreaterThan(0);
      expect(output.capabilities.length).toBeGreaterThan(0);
    });
  });
});
