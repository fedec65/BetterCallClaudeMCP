import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  detectLanguage,
  detectIntent,
  detectJurisdiction,
  detectDomain,
  getSuggestedTool,
  handleLegalGateway,
} from '../../handlers/gateway.js';
import type { Language, LegalDomain } from '../../types/index.js';

describe('Gateway Handler', () => {
  describe('detectLanguage', () => {
    it('should detect German text', () => {
      const germanTexts = [
        'Der Vertrag ist gültig und bindend',
        'Die Haftung wurde nicht ausgeschlossen',
        'Das Bundesgericht hat entschieden',
        'Ein wichtiger Punkt ist zu beachten',
        'Für weitere Informationen siehe Art. 97 OR',
      ];

      for (const text of germanTexts) {
        expect(detectLanguage(text)).toBe('de');
      }
    });

    it('should detect French text', () => {
      const frenchTexts = [
        'Le contrat est valide et contraignant',
        'La responsabilité n\'a pas été exclue',
        'Le Tribunal fédéral a décidé',
        'Une question importante est à examiner',
        'Pour plus d\'informations voir art. 97 CO',
      ];

      for (const text of frenchTexts) {
        expect(detectLanguage(text)).toBe('fr');
      }
    });

    it('should detect Italian text', () => {
      const italianTexts = [
        'Il contratto è valido e vincolante',
        'La responsabilità non è stata esclusa',
        'Il Tribunale federale ha deciso',
        'Una questione importante è da esaminare',
        'Per ulteriori informazioni vedere art. 97 CO',
      ];

      for (const text of italianTexts) {
        expect(detectLanguage(text)).toBe('it');
      }
    });

    it('should default to German for ambiguous or English text', () => {
      expect(detectLanguage('contract liability')).toBe('de');
      expect(detectLanguage('BGE 145 III 229')).toBe('de');
      expect(detectLanguage('')).toBe('de');
    });

    it('should handle mixed language with predominant detection', () => {
      // Text with more German indicators
      const mixedGerman = 'Der Vertrag und die Bedingungen für den Kauf';
      expect(detectLanguage(mixedGerman)).toBe('de');
    });
  });

  describe('detectIntent', () => {
    it('should detect research intent', () => {
      const researchQueries = [
        'search for BGE on contract law',
        'find precedents for liability',
        'BGE 145 III 229',
        'relevant case law for employment termination',
        'bundesgericht decisions on fraud',
        'entscheidsuche contract breach',
      ];

      for (const query of researchQueries) {
        expect(detectIntent(query)).toBe('research');
      }
    });

    it('should detect citation intent', () => {
      const citationQueries = [
        'cite Art. 97 OR',
        'format citation BGE 145 III 229',
        'validate citation Art. 41 OR',
        'reference Art. 8 ZGB',
      ];

      for (const query of citationQueries) {
        expect(detectIntent(query)).toBe('citation');
      }
    });

    it('should detect strategy intent', () => {
      const strategyQueries = [
        'case strategy for breach of contract',
        'litigation approach for employment dispute',
        'risk assessment for commercial claim',
        'chances of success in this case',
        'settlement value estimation',
      ];

      for (const query of strategyQueries) {
        expect(detectIntent(query)).toBe('strategy');
      }
    });

    it('should detect draft intent', () => {
      const draftQueries = [
        'draft a contract for services',
        'prepare an agreement',
        'write a legal brief',
        'legal memo on liability',
        'create employment contract',
      ];

      for (const query of draftQueries) {
        expect(detectIntent(query)).toBe('draft');
      }
    });

    it('should detect analyze intent', () => {
      const analyzeQueries = [
        'analyze this contract',
        'review the document',
        'assess the agreement',
        'examine the clause',
        'evaluate the terms',
      ];

      for (const query of analyzeQueries) {
        expect(detectIntent(query)).toBe('analyze');
      }
    });

    it('should default to research for ambiguous queries', () => {
      expect(detectIntent('Art. 97 OR')).toBe('research');
      expect(detectIntent('something random')).toBe('research');
    });
  });

  describe('detectJurisdiction', () => {
    it('should detect federal jurisdiction', () => {
      const federalQueries = [
        'federal law on contracts',
        'Bundesrecht Haftung',
        'BGE precedent',
        'ATF 145 III 229',
        'Swiss federal court',
      ];

      for (const query of federalQueries) {
        const result = detectJurisdiction(query);
        expect(result.jurisdiction).toBe('federal');
        expect(result.canton).toBeUndefined();
      }
    });

    it('should detect Zürich cantonal jurisdiction', () => {
      const zhQueries = [
        'Zürich employment law',
        'ZH Obergericht decision',
        'Zurich commercial court',
      ];

      for (const query of zhQueries) {
        const result = detectJurisdiction(query);
        expect(result.jurisdiction).toBe('cantonal');
        expect(result.canton).toBe('ZH');
      }
    });

    it('should detect Geneva cantonal jurisdiction', () => {
      const geQueries = [
        'Genève tribunal',
        'GE cantonal law',
        'Geneva court decision',
      ];

      for (const query of geQueries) {
        const result = detectJurisdiction(query);
        expect(result.jurisdiction).toBe('cantonal');
        expect(result.canton).toBe('GE');
      }
    });

    it('should detect Bern cantonal jurisdiction', () => {
      const beQueries = [
        'Bern cantonal court',
        'BE Obergericht',
        'Berne employment law',
      ];

      for (const query of beQueries) {
        const result = detectJurisdiction(query);
        expect(result.jurisdiction).toBe('cantonal');
        expect(result.canton).toBe('BE');
      }
    });

    it('should detect Ticino cantonal jurisdiction', () => {
      const tiQueries = [
        'Ticino law',
        'TI tribunale',
        'Tessin cantonal',
      ];

      for (const query of tiQueries) {
        const result = detectJurisdiction(query);
        expect(result.jurisdiction).toBe('cantonal');
        expect(result.canton).toBe('TI');
      }
    });

    it('should detect Basel-Stadt jurisdiction', () => {
      const bsQueries = [
        'Basel-Stadt court',
        'BS cantonal',
      ];

      for (const query of bsQueries) {
        const result = detectJurisdiction(query);
        expect(result.jurisdiction).toBe('cantonal');
        expect(result.canton).toBe('BS');
      }
    });

    it('should detect Vaud jurisdiction', () => {
      const vdQueries = [
        'Vaud tribunal',
        'VD cantonal law',
      ];

      for (const query of vdQueries) {
        const result = detectJurisdiction(query);
        expect(result.jurisdiction).toBe('cantonal');
        expect(result.canton).toBe('VD');
      }
    });

    it('should default to federal for ambiguous queries', () => {
      const result = detectJurisdiction('contract liability');
      expect(result.jurisdiction).toBe('federal');
      expect(result.canton).toBeUndefined();
    });
  });

  describe('detectDomain', () => {
    it('should detect civil domain', () => {
      const civilQueries = [
        'civil law dispute',
        'Zivilrecht case',
        'property rights',
        'inheritance law',
        'Sachenrecht',
      ];

      for (const query of civilQueries) {
        expect(detectDomain(query)).toBe('civil');
      }
    });

    it('should detect commercial domain', () => {
      const commercialQueries = [
        'commercial contract',
        'Handelsrecht',
        'business transaction',
        'commercial dispute',
      ];

      for (const query of commercialQueries) {
        expect(detectDomain(query)).toBe('commercial');
      }
    });

    it('should detect employment domain', () => {
      const employmentQueries = [
        'employment contract',
        'Arbeitsrecht',
        'labor law',
        'termination of employment',
        'droit du travail',
      ];

      for (const query of employmentQueries) {
        expect(detectDomain(query)).toBe('employment');
      }
    });

    it('should detect corporate domain', () => {
      const corporateQueries = [
        'corporate governance',
        'Gesellschaftsrecht',
        'company law',
        'shareholder rights',
        'AG Gründung',
      ];

      for (const query of corporateQueries) {
        expect(detectDomain(query)).toBe('corporate');
      }
    });

    it('should detect criminal domain', () => {
      const criminalQueries = [
        'criminal law',
        'Strafrecht',
        'fraud case',
        'Betrug',
        'droit pénal',
      ];

      for (const query of criminalQueries) {
        expect(detectDomain(query)).toBe('criminal');
      }
    });

    it('should detect administrative domain', () => {
      const adminQueries = [
        'administrative law',
        'Verwaltungsrecht',
        'public law',
        'building permit',
        'Baubewilligung',
      ];

      for (const query of adminQueries) {
        expect(detectDomain(query)).toBe('administrative');
      }
    });

    it('should return undefined for ambiguous queries', () => {
      expect(detectDomain('some legal question')).toBeUndefined();
      expect(detectDomain('')).toBeUndefined();
    });
  });

  describe('getSuggestedTool', () => {
    it('should map intents to correct tools', () => {
      expect(getSuggestedTool('research')).toBe('legal_research');
      expect(getSuggestedTool('citation')).toBe('legal_citation');
      expect(getSuggestedTool('strategy')).toBe('legal_strategy');
      expect(getSuggestedTool('draft')).toBe('legal_draft');
      expect(getSuggestedTool('analyze')).toBe('legal_analyze');
    });

    it('should default to legal_research for unknown intents', () => {
      expect(getSuggestedTool('unknown')).toBe('legal_research');
      expect(getSuggestedTool('')).toBe('legal_research');
    });
  });

  describe('handleLegalGateway', () => {
    it('should process a German research query', async () => {
      const result = await handleLegalGateway(
        { query: 'Suche BGE zur Vertragshaftung' },
        'test-request-1'
      );

      expect(result.detectedLanguage).toBe('de');
      expect(result.detectedIntent).toBe('research');
      expect(result.suggestedTool).toBe('legal_research');
      expect(result.jurisdiction).toBeDefined();
    });

    it('should process a French citation query', async () => {
      const result = await handleLegalGateway(
        { query: 'citer art. 97 CO responsabilité contractuelle' },
        'test-request-2'
      );

      expect(result.detectedLanguage).toBe('fr');
      expect(result.suggestedTool).toBeDefined();
    });

    it('should process a cantonal query', async () => {
      const result = await handleLegalGateway(
        { query: 'Zürich employment law termination' },
        'test-request-3'
      );

      expect(result.jurisdiction.jurisdiction).toBe('cantonal');
      expect(result.jurisdiction.canton).toBe('ZH');
    });

    it('should detect domain when present', async () => {
      const result = await handleLegalGateway(
        { query: 'corporate governance shareholder rights' },
        'test-request-4'
      );

      expect(result.domain).toBe('corporate');
    });

    it('should allow language override', async () => {
      const result = await handleLegalGateway(
        { query: 'contract liability', lang: 'fr' },
        'test-request-5'
      );

      // When lang is provided, it should be used
      expect(result.detectedLanguage).toBe('fr');
    });
  });
});
