import { describe, it, expect } from 'vitest';
import { legalHelp } from '../tools/legal-help.js';
import { LegalHelpInputSchema, LegalHelpOutputSchema } from '../types.js';

describe('legalHelp', () => {
  describe('input validation', () => {
    it('should accept empty input with defaults', () => {
      const result = LegalHelpInputSchema.parse({});
      expect(result.language).toBe('en');
      expect(result.topic).toBeUndefined();
    });

    it('should accept valid language', () => {
      const result = LegalHelpInputSchema.parse({ language: 'de' });
      expect(result.language).toBe('de');
    });

    it('should accept topic filter', () => {
      const result = LegalHelpInputSchema.parse({ topic: 'research' });
      expect(result.topic).toBe('research');
    });

    it('should reject invalid language', () => {
      expect(() => LegalHelpInputSchema.parse({ language: 'invalid' })).toThrow();
    });
  });

  describe('output structure', () => {
    it('should return valid output structure', () => {
      const output = legalHelp({});
      const validated = LegalHelpOutputSchema.parse(output);

      expect(validated.version).toBeDefined();
      expect(validated.title).toBeDefined();
      expect(validated.description).toBeDefined();
      expect(validated.commands).toBeInstanceOf(Array);
      expect(validated.agents).toBeInstanceOf(Array);
      expect(validated.workflows).toBeInstanceOf(Array);
      expect(validated.language).toBe('en');
    });

    it('should include framework version', () => {
      const output = legalHelp({});
      expect(output.version).toMatch(/^\d+\.\d+\.\d+/);
    });
  });

  describe('commands list', () => {
    it('should include core commands', () => {
      const output = legalHelp({});
      const commandNames = output.commands.map(c => c.command);

      expect(commandNames).toContain('/legal');
      expect(commandNames).toContain('/legal:research');
      expect(commandNames).toContain('/legal:draft');
      expect(commandNames).toContain('/legal:strategy');
      expect(commandNames).toContain('/doc:analyze');
    });

    it('should include citation commands', () => {
      const output = legalHelp({});
      const commandNames = output.commands.map(c => c.command);

      expect(commandNames).toContain('/legal:validate');
      expect(commandNames).toContain('/legal:format');
      expect(commandNames).toContain('/legal:convert');
      expect(commandNames).toContain('/legal:parse');
    });

    it('should include utility commands', () => {
      const output = legalHelp({});
      const commandNames = output.commands.map(c => c.command);

      expect(commandNames).toContain('/legal:help');
      expect(commandNames).toContain('/legal:version');
      expect(commandNames).toContain('/legal:federal');
      expect(commandNames).toContain('/legal:cantonal');
      expect(commandNames).toContain('/legal:routing');
    });

    it('should include parameters for each command', () => {
      const output = legalHelp({});

      output.commands.forEach(cmd => {
        expect(cmd.parameters).toBeInstanceOf(Array);
        expect(cmd.description).toBeDefined();
        expect(cmd.description.length).toBeGreaterThan(0);
      });
    });

    it('should include examples for each command', () => {
      const output = legalHelp({});

      output.commands.forEach(cmd => {
        expect(cmd.examples).toBeInstanceOf(Array);
        expect(cmd.examples.length).toBeGreaterThan(0);
      });
    });
  });

  describe('agents list', () => {
    it('should include core agents', () => {
      const output = legalHelp({});
      const agentNames = output.agents.map(a => a.name);

      expect(agentNames).toContain('researcher');
      expect(agentNames).toContain('strategist');
      expect(agentNames).toContain('drafter');
      expect(agentNames).toContain('compliance');
      expect(agentNames).toContain('data-protection');
      expect(agentNames).toContain('fiscal-expert');
      expect(agentNames).toContain('corporate');
      expect(agentNames).toContain('orchestrator');
    });

    it('should include description for each agent', () => {
      const output = legalHelp({});

      output.agents.forEach(agent => {
        expect(agent.description).toBeDefined();
        expect(agent.description.length).toBeGreaterThan(0);
      });
    });
  });

  describe('workflows list', () => {
    it('should include core workflows', () => {
      const output = legalHelp({});
      const workflowNames = output.workflows.map(w => w.name);

      expect(workflowNames).toContain('due-diligence');
      expect(workflowNames).toContain('litigation-prep');
      expect(workflowNames).toContain('adversarial');
    });

    it('should include agents for each workflow', () => {
      const output = legalHelp({});

      output.workflows.forEach(workflow => {
        expect(workflow.agents).toBeInstanceOf(Array);
        expect(workflow.agents.length).toBeGreaterThan(0);
      });
    });
  });

  describe('topic filtering', () => {
    it('should filter commands by topic', () => {
      const output = legalHelp({ topic: 'citation' });
      const commandNames = output.commands.map(c => c.command);

      expect(commandNames).toContain('/legal:validate');
      expect(commandNames).toContain('/legal:format');
      expect(commandNames).not.toContain('/legal:draft');
    });

    it('should filter agents by topic', () => {
      const output = legalHelp({ topic: 'compliance' });
      const agentNames = output.agents.map(a => a.name);

      expect(agentNames).toContain('compliance');
      expect(agentNames).toContain('data-protection');
    });

    it('should return all items when no topic specified', () => {
      const output = legalHelp({});

      expect(output.commands.length).toBeGreaterThan(5);
      expect(output.agents.length).toBeGreaterThan(5);
      expect(output.workflows.length).toBeGreaterThan(0);
    });
  });

  describe('language support', () => {
    it('should output in German when requested', () => {
      const output = legalHelp({ language: 'de' });
      expect(output.language).toBe('de');
      expect(output.title).toContain('Rechtliche');
    });

    it('should output in French when requested', () => {
      const output = legalHelp({ language: 'fr' });
      expect(output.language).toBe('fr');
      expect(output.title).toContain('juridique');
    });

    it('should output in Italian when requested', () => {
      const output = legalHelp({ language: 'it' });
      expect(output.language).toBe('it');
      expect(output.title).toContain('giuridico');
    });

    it('should output in English by default', () => {
      const output = legalHelp({});
      expect(output.language).toBe('en');
      expect(output.title).toContain('Legal');
    });
  });
});
