import { describe, it, expect } from 'vitest';
import {
  LanguageSchema,
  JurisdictionSchema,
  CantonSchema,
  LegalDomainSchema,
  SourceTypeSchema,
  CitationTypeSchema,
  ErrorCodeSchema,
  ResponseMetadataSchema,
  ErrorResponseSchema,
  createSuccessResponseSchema,
  CITATION_LANGUAGE_MAP,
  STATUTE_ABBREVIATIONS,
  CANTON_LANGUAGES,
  CANTON_NAMES,
} from '../../types/common.js';
import { z } from 'zod';

describe('Common Type Schemas', () => {
  describe('LanguageSchema', () => {
    it('should accept valid languages', () => {
      expect(LanguageSchema.parse('de')).toBe('de');
      expect(LanguageSchema.parse('fr')).toBe('fr');
      expect(LanguageSchema.parse('it')).toBe('it');
      expect(LanguageSchema.parse('en')).toBe('en');
    });

    it('should reject invalid languages', () => {
      expect(() => LanguageSchema.parse('es')).toThrow();
      expect(() => LanguageSchema.parse('DE')).toThrow();
      expect(() => LanguageSchema.parse('')).toThrow();
      expect(() => LanguageSchema.parse(null)).toThrow();
      expect(() => LanguageSchema.parse(undefined)).toThrow();
    });
  });

  describe('JurisdictionSchema', () => {
    it('should accept valid jurisdictions', () => {
      expect(JurisdictionSchema.parse('federal')).toBe('federal');
      expect(JurisdictionSchema.parse('cantonal')).toBe('cantonal');
    });

    it('should reject invalid jurisdictions', () => {
      expect(() => JurisdictionSchema.parse('Federal')).toThrow();
      expect(() => JurisdictionSchema.parse('municipal')).toThrow();
      expect(() => JurisdictionSchema.parse('')).toThrow();
    });
  });

  describe('CantonSchema', () => {
    it('should accept valid cantons', () => {
      const validCantons = ['ZH', 'BE', 'GE', 'BS', 'VD', 'TI'];
      for (const canton of validCantons) {
        expect(CantonSchema.parse(canton)).toBe(canton);
      }
    });

    it('should reject invalid cantons', () => {
      expect(() => CantonSchema.parse('zh')).toThrow();
      expect(() => CantonSchema.parse('Zurich')).toThrow();
      expect(() => CantonSchema.parse('AG')).toThrow(); // Not in supported list
      expect(() => CantonSchema.parse('')).toThrow();
    });
  });

  describe('LegalDomainSchema', () => {
    it('should accept valid domains', () => {
      const validDomains = [
        'civil', 'criminal', 'administrative', 'commercial',
        'employment', 'family', 'corporate', 'tax', 'property', 'international'
      ];
      for (const domain of validDomains) {
        expect(LegalDomainSchema.parse(domain)).toBe(domain);
      }
    });

    it('should reject invalid domains', () => {
      expect(() => LegalDomainSchema.parse('Civil')).toThrow();
      expect(() => LegalDomainSchema.parse('environmental')).toThrow();
      expect(() => LegalDomainSchema.parse('')).toThrow();
    });
  });

  describe('SourceTypeSchema', () => {
    it('should accept valid source types', () => {
      expect(SourceTypeSchema.parse('statute')).toBe('statute');
      expect(SourceTypeSchema.parse('precedent')).toBe('precedent');
      expect(SourceTypeSchema.parse('doctrine')).toBe('doctrine');
      expect(SourceTypeSchema.parse('commentary')).toBe('commentary');
    });

    it('should reject invalid source types', () => {
      expect(() => SourceTypeSchema.parse('Statute')).toThrow();
      expect(() => SourceTypeSchema.parse('case')).toThrow();
      expect(() => SourceTypeSchema.parse('')).toThrow();
    });
  });

  describe('CitationTypeSchema', () => {
    it('should accept valid citation types', () => {
      expect(CitationTypeSchema.parse('bge')).toBe('bge');
      expect(CitationTypeSchema.parse('statute')).toBe('statute');
      expect(CitationTypeSchema.parse('doctrine')).toBe('doctrine');
    });

    it('should reject invalid citation types', () => {
      expect(() => CitationTypeSchema.parse('BGE')).toThrow();
      expect(() => CitationTypeSchema.parse('case')).toThrow();
      expect(() => CitationTypeSchema.parse('')).toThrow();
    });
  });

  describe('ErrorCodeSchema', () => {
    it('should accept valid error codes', () => {
      const validCodes = [
        'INVALID_INPUT', 'INVALID_CITATION', 'JURISDICTION_UNSUPPORTED',
        'QUERY_TOO_BROAD', 'RATE_LIMIT_EXCEEDED', 'API_TIMEOUT',
        'API_UNAVAILABLE', 'INTERNAL_ERROR'
      ];
      for (const code of validCodes) {
        expect(ErrorCodeSchema.parse(code)).toBe(code);
      }
    });

    it('should reject invalid error codes', () => {
      expect(() => ErrorCodeSchema.parse('invalid_input')).toThrow();
      expect(() => ErrorCodeSchema.parse('ERROR')).toThrow();
      expect(() => ErrorCodeSchema.parse('')).toThrow();
    });
  });

  describe('ResponseMetadataSchema', () => {
    it('should accept valid metadata', () => {
      const validMetadata = {
        requestId: '550e8400-e29b-41d4-a716-446655440000',
        timestamp: '2024-01-15T10:30:00Z',
        tool: 'legal_research',
        cached: false,
        language: 'de',
        processingTime: 150
      };

      const result = ResponseMetadataSchema.parse(validMetadata);
      expect(result.requestId).toBe(validMetadata.requestId);
      expect(result.tool).toBe(validMetadata.tool);
      expect(result.cached).toBe(false);
    });

    it('should accept metadata with optional fields', () => {
      const validMetadata = {
        requestId: '550e8400-e29b-41d4-a716-446655440000',
        timestamp: '2024-01-15T10:30:00Z',
        tool: 'legal_strategy',
        cached: true,
        language: 'fr',
        jurisdiction: 'cantonal',
        canton: 'GE',
        processingTime: 200
      };

      const result = ResponseMetadataSchema.parse(validMetadata);
      expect(result.jurisdiction).toBe('cantonal');
      expect(result.canton).toBe('GE');
    });

    it('should reject invalid requestId (not UUID)', () => {
      const invalidMetadata = {
        requestId: 'not-a-uuid',
        timestamp: '2024-01-15T10:30:00Z',
        tool: 'legal_research',
        cached: false,
        language: 'de',
        processingTime: 150
      };

      expect(() => ResponseMetadataSchema.parse(invalidMetadata)).toThrow();
    });

    it('should reject invalid timestamp format', () => {
      const invalidMetadata = {
        requestId: '550e8400-e29b-41d4-a716-446655440000',
        timestamp: '15-01-2024',
        tool: 'legal_research',
        cached: false,
        language: 'de',
        processingTime: 150
      };

      expect(() => ResponseMetadataSchema.parse(invalidMetadata)).toThrow();
    });

    it('should reject negative processingTime', () => {
      const invalidMetadata = {
        requestId: '550e8400-e29b-41d4-a716-446655440000',
        timestamp: '2024-01-15T10:30:00Z',
        tool: 'legal_research',
        cached: false,
        language: 'de',
        processingTime: -10
      };

      expect(() => ResponseMetadataSchema.parse(invalidMetadata)).toThrow();
    });

    it('should reject missing required fields', () => {
      const incompleteMetadata = {
        requestId: '550e8400-e29b-41d4-a716-446655440000',
        timestamp: '2024-01-15T10:30:00Z',
        // missing tool, cached, language, processingTime
      };

      expect(() => ResponseMetadataSchema.parse(incompleteMetadata)).toThrow();
    });
  });

  describe('ErrorResponseSchema', () => {
    it('should accept valid error response', () => {
      const validError = {
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'The query parameter is required'
        },
        metadata: {
          requestId: '550e8400-e29b-41d4-a716-446655440000',
          timestamp: '2024-01-15T10:30:00Z',
          tool: 'legal_research',
          cached: false,
          language: 'de',
          processingTime: 50
        }
      };

      const result = ErrorResponseSchema.parse(validError);
      expect(result.success).toBe(false);
      expect(result.error.code).toBe('INVALID_INPUT');
    });

    it('should accept error with optional details', () => {
      const validError = {
        success: false,
        error: {
          code: 'API_TIMEOUT',
          message: 'Request timed out',
          details: {
            timeout: 30000,
            endpoint: 'https://api.example.com'
          }
        },
        metadata: {
          requestId: '550e8400-e29b-41d4-a716-446655440000',
          timestamp: '2024-01-15T10:30:00Z',
          tool: 'legal_citation',
          cached: false,
          language: 'en',
          processingTime: 30000
        }
      };

      const result = ErrorResponseSchema.parse(validError);
      expect(result.error.details).toBeDefined();
    });

    it('should reject success: true in error response', () => {
      const invalidError = {
        success: true, // Should be false
        error: {
          code: 'INVALID_INPUT',
          message: 'Error message'
        },
        metadata: {
          requestId: '550e8400-e29b-41d4-a716-446655440000',
          timestamp: '2024-01-15T10:30:00Z',
          tool: 'legal_research',
          cached: false,
          language: 'de',
          processingTime: 50
        }
      };

      expect(() => ErrorResponseSchema.parse(invalidError)).toThrow();
    });
  });

  describe('createSuccessResponseSchema', () => {
    it('should create valid success response schema', () => {
      const dataSchema = z.object({
        results: z.array(z.string()),
        count: z.number()
      });

      const SuccessSchema = createSuccessResponseSchema(dataSchema);

      const validResponse = {
        success: true,
        data: {
          results: ['result1', 'result2'],
          count: 2
        },
        metadata: {
          requestId: '550e8400-e29b-41d4-a716-446655440000',
          timestamp: '2024-01-15T10:30:00Z',
          tool: 'legal_research',
          cached: false,
          language: 'de',
          processingTime: 100
        }
      };

      const result = SuccessSchema.parse(validResponse);
      expect(result.success).toBe(true);
      expect(result.data.count).toBe(2);
    });

    it('should reject invalid data shape', () => {
      const dataSchema = z.object({
        results: z.array(z.string()),
        count: z.number()
      });

      const SuccessSchema = createSuccessResponseSchema(dataSchema);

      const invalidResponse = {
        success: true,
        data: {
          results: 'not-an-array', // Should be array
          count: 2
        },
        metadata: {
          requestId: '550e8400-e29b-41d4-a716-446655440000',
          timestamp: '2024-01-15T10:30:00Z',
          tool: 'legal_research',
          cached: false,
          language: 'de',
          processingTime: 100
        }
      };

      expect(() => SuccessSchema.parse(invalidResponse)).toThrow();
    });
  });
});

describe('Constants', () => {
  describe('CITATION_LANGUAGE_MAP', () => {
    it('should have correct BGE translations', () => {
      expect(CITATION_LANGUAGE_MAP.bge.de).toBe('BGE');
      expect(CITATION_LANGUAGE_MAP.bge.fr).toBe('ATF');
      expect(CITATION_LANGUAGE_MAP.bge.it).toBe('DTF');
    });

    it('should have all citation types', () => {
      expect(CITATION_LANGUAGE_MAP).toHaveProperty('bge');
    });
  });

  describe('STATUTE_ABBREVIATIONS', () => {
    it('should have correct civil code abbreviations', () => {
      expect(STATUTE_ABBREVIATIONS.civilCode.de).toBe('ZGB');
      expect(STATUTE_ABBREVIATIONS.civilCode.fr).toBe('CC');
      expect(STATUTE_ABBREVIATIONS.civilCode.it).toBe('CC');
    });

    it('should have correct obligations code abbreviations', () => {
      expect(STATUTE_ABBREVIATIONS.obligationsCode.de).toBe('OR');
      expect(STATUTE_ABBREVIATIONS.obligationsCode.fr).toBe('CO');
      expect(STATUTE_ABBREVIATIONS.obligationsCode.it).toBe('CO');
    });

    it('should have all major statute types', () => {
      expect(STATUTE_ABBREVIATIONS).toHaveProperty('civilCode');
      expect(STATUTE_ABBREVIATIONS).toHaveProperty('obligationsCode');
      expect(STATUTE_ABBREVIATIONS).toHaveProperty('criminalCode');
      expect(STATUTE_ABBREVIATIONS).toHaveProperty('constitution');
    });
  });

  describe('CANTON_LANGUAGES', () => {
    it('should map cantons to correct languages', () => {
      expect(CANTON_LANGUAGES.ZH).toBe('de');
      expect(CANTON_LANGUAGES.BE).toBe('de');
      expect(CANTON_LANGUAGES.GE).toBe('fr');
      expect(CANTON_LANGUAGES.BS).toBe('de');
      expect(CANTON_LANGUAGES.VD).toBe('fr');
      expect(CANTON_LANGUAGES.TI).toBe('it');
    });

    it('should have all supported cantons', () => {
      const supportedCantons = ['ZH', 'BE', 'GE', 'BS', 'VD', 'TI'];
      for (const canton of supportedCantons) {
        expect(CANTON_LANGUAGES).toHaveProperty(canton);
      }
    });
  });

  describe('CANTON_NAMES', () => {
    it('should have canton names in multiple languages', () => {
      expect(CANTON_NAMES.ZH.de).toBe('Zürich');
      expect(CANTON_NAMES.GE.fr).toBe('Genève');
      expect(CANTON_NAMES.TI.it).toBe('Ticino');
    });

    it('should have English names for all cantons', () => {
      expect(CANTON_NAMES.ZH.en).toBe('Zurich');
      expect(CANTON_NAMES.GE.en).toBe('Geneva');
      expect(CANTON_NAMES.TI.en).toBe('Ticino');
    });
  });
});
