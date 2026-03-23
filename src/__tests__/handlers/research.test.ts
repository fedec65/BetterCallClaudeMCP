import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleLegalResearch } from '../../handlers/research.js';
import type { LegalResearchInput } from '../../types/index.js';

// Mock the HTTP clients
vi.mock('../../infrastructure/http-client.js', () => ({
  entscheidsuche: {
    search: vi.fn(),
  },
  fedlexClient: {
    sparql: vi.fn(),
  },
  parseApiError: vi.fn(),
}));

describe('Research Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('handleLegalResearch', () => {
    it('should perform basic precedent search', async () => {
      const { entscheidsuche } = await import('../../infrastructure/http-client.js');
      vi.mocked(entscheidsuche.search).mockResolvedValue({
        results: [
          {
            id: 'bge-145-III-229',
            title: 'BGE 145 III 229',
            court: 'Bundesgericht',
            date: '2019-05-15',
            summary: 'Vertragshaftung nach Art. 97 OR',
            url: 'https://bger.ch/...',
          },
        ],
        total: 1,
      });

      const input: LegalResearchInput = {
        query: 'Vertragshaftung Art. 97 OR',
        sources: ['precedent'],
      };

      const result = await handleLegalResearch(input, 'test-request-1');

      expect(result.results).toBeDefined();
      expect(result.results.length).toBeGreaterThan(0);
      expect(entscheidsuche.search).toHaveBeenCalled();
    });

    it('should perform statute search via Fedlex', async () => {
      const { fedlexClient } = await import('../../infrastructure/http-client.js');
      vi.mocked(fedlexClient.sparql).mockResolvedValue({
        results: {
          bindings: [
            {
              act: { value: 'https://fedlex.data.admin.ch/eli/cc/27/317_321_377' },
              title: { value: 'Schweizerisches Obligationenrecht (OR)' },
              sr: { value: 'SR 220' },
            },
          ],
        },
      });

      const input: LegalResearchInput = {
        query: 'Obligationenrecht',
        sources: ['statute'],
      };

      const result = await handleLegalResearch(input, 'test-request-2');

      expect(result.results).toBeDefined();
      expect(fedlexClient.sparql).toHaveBeenCalled();
    });

    it('should search both sources when not specified', async () => {
      const { entscheidsuche, fedlexClient } = await import('../../infrastructure/http-client.js');
      vi.mocked(entscheidsuche.search).mockResolvedValue({
        results: [],
        total: 0,
      });
      vi.mocked(fedlexClient.sparql).mockResolvedValue({
        results: { bindings: [] },
      });

      const input: LegalResearchInput = {
        query: 'test query',
      };

      const result = await handleLegalResearch(input, 'test-request-3');

      expect(result.results).toBeDefined();
      // Both sources should be searched when not specified
      expect(entscheidsuche.search).toHaveBeenCalled();
      expect(fedlexClient.sparql).toHaveBeenCalled();
    });

    it('should filter by jurisdiction federal', async () => {
      const { entscheidsuche } = await import('../../infrastructure/http-client.js');
      vi.mocked(entscheidsuche.search).mockResolvedValue({
        results: [
          {
            id: 'bge-test',
            title: 'BGE Test',
            court: 'Bundesgericht',
            date: '2023-01-01',
            summary: 'Federal court decision',
          },
        ],
        total: 1,
      });

      const input: LegalResearchInput = {
        query: 'federal law test',
        sources: ['precedent'],
        jurisdiction: 'federal',
      };

      const result = await handleLegalResearch(input, 'test-request-4');

      expect(result.results).toBeDefined();
      expect(entscheidsuche.search).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ jurisdiction: 'federal' })
      );
    });

    it('should filter by jurisdiction cantonal with canton', async () => {
      const { entscheidsuche } = await import('../../infrastructure/http-client.js');
      vi.mocked(entscheidsuche.search).mockResolvedValue({
        results: [],
        total: 0,
      });

      const input: LegalResearchInput = {
        query: 'cantonal law test',
        sources: ['precedent'],
        jurisdiction: 'cantonal',
        canton: 'ZH',
      };

      const result = await handleLegalResearch(input, 'test-request-5');

      expect(result.results).toBeDefined();
      expect(entscheidsuche.search).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ jurisdiction: 'cantonal', canton: 'ZH' })
      );
    });

    it('should filter by legal domain', async () => {
      const { entscheidsuche } = await import('../../infrastructure/http-client.js');
      vi.mocked(entscheidsuche.search).mockResolvedValue({
        results: [],
        total: 0,
      });

      const input: LegalResearchInput = {
        query: 'contract breach',
        sources: ['precedent'],
        domain: 'commercial',
      };

      const result = await handleLegalResearch(input, 'test-request-6');

      expect(result.results).toBeDefined();
      expect(entscheidsuche.search).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ domain: 'commercial' })
      );
    });

    it('should respect maxResults parameter', async () => {
      const { entscheidsuche } = await import('../../infrastructure/http-client.js');
      vi.mocked(entscheidsuche.search).mockResolvedValue({
        results: Array(5).fill({
          id: 'test',
          title: 'Test',
          court: 'Test Court',
          date: '2023-01-01',
          summary: 'Test summary',
        }),
        total: 5,
      });

      const input: LegalResearchInput = {
        query: 'test',
        sources: ['precedent'],
        maxResults: 5,
      };

      const result = await handleLegalResearch(input, 'test-request-7');

      expect(result.results.length).toBeLessThanOrEqual(5);
    });

    it('should handle German language queries', async () => {
      const { entscheidsuche } = await import('../../infrastructure/http-client.js');
      vi.mocked(entscheidsuche.search).mockResolvedValue({
        results: [
          {
            id: 'bge-de',
            title: 'BGE zum Vertragsrecht',
            court: 'Bundesgericht',
            date: '2023-01-01',
            summary: 'Die Haftung des Schuldners wurde bestätigt.',
          },
        ],
        total: 1,
      });

      const input: LegalResearchInput = {
        query: 'Vertragshaftung und Schadenersatz',
        sources: ['precedent'],
        lang: 'de',
      };

      const result = await handleLegalResearch(input, 'test-request-8');

      expect(result.results).toBeDefined();
      expect(result.results.length).toBeGreaterThan(0);
    });

    it('should handle French language queries', async () => {
      const { entscheidsuche } = await import('../../infrastructure/http-client.js');
      vi.mocked(entscheidsuche.search).mockResolvedValue({
        results: [
          {
            id: 'atf-fr',
            title: 'ATF sur la responsabilité',
            court: 'Tribunal fédéral',
            date: '2023-01-01',
            summary: 'La responsabilité du débiteur a été confirmée.',
          },
        ],
        total: 1,
      });

      const input: LegalResearchInput = {
        query: 'responsabilité contractuelle',
        sources: ['precedent'],
        lang: 'fr',
      };

      const result = await handleLegalResearch(input, 'test-request-9');

      expect(result.results).toBeDefined();
    });

    it('should handle Italian language queries', async () => {
      const { entscheidsuche } = await import('../../infrastructure/http-client.js');
      vi.mocked(entscheidsuche.search).mockResolvedValue({
        results: [
          {
            id: 'dtf-it',
            title: 'DTF sulla responsabilità',
            court: 'Tribunale federale',
            date: '2023-01-01',
            summary: 'La responsabilità del debitore è stata confermata.',
          },
        ],
        total: 1,
      });

      const input: LegalResearchInput = {
        query: 'responsabilità contrattuale',
        sources: ['precedent'],
        lang: 'it',
      };

      const result = await handleLegalResearch(input, 'test-request-10');

      expect(result.results).toBeDefined();
    });

    it('should include metadata in results', async () => {
      const { entscheidsuche } = await import('../../infrastructure/http-client.js');
      vi.mocked(entscheidsuche.search).mockResolvedValue({
        results: [
          {
            id: 'bge-meta',
            title: 'BGE 145 III 229',
            court: 'Bundesgericht',
            date: '2019-05-15',
            summary: 'Test summary',
            url: 'https://bger.ch/test',
            relevance: 0.95,
          },
        ],
        total: 1,
      });

      const input: LegalResearchInput = {
        query: 'test',
        sources: ['precedent'],
      };

      const result = await handleLegalResearch(input, 'test-request-11');

      expect(result.results[0]).toHaveProperty('title');
      expect(result.results[0]).toHaveProperty('summary');
      expect(result.metadata).toBeDefined();
    });

    it('should handle empty search results gracefully', async () => {
      const { entscheidsuche, fedlexClient } = await import('../../infrastructure/http-client.js');
      vi.mocked(entscheidsuche.search).mockResolvedValue({
        results: [],
        total: 0,
      });
      vi.mocked(fedlexClient.sparql).mockResolvedValue({
        results: { bindings: [] },
      });

      const input: LegalResearchInput = {
        query: 'nonexistent query xyz123',
      };

      const result = await handleLegalResearch(input, 'test-request-12');

      expect(result.results).toBeDefined();
      expect(result.results).toBeInstanceOf(Array);
      expect(result.results.length).toBe(0);
    });

    it('should handle API errors gracefully', async () => {
      const { entscheidsuche } = await import('../../infrastructure/http-client.js');
      vi.mocked(entscheidsuche.search).mockRejectedValue(new Error('API Error'));

      const input: LegalResearchInput = {
        query: 'test',
        sources: ['precedent'],
      };

      // Should not throw, but handle error gracefully
      const result = await handleLegalResearch(input, 'test-request-13');

      expect(result).toBeDefined();
      // May have empty results or error indication
    });

    it('should search specific court when provided', async () => {
      const { entscheidsuche } = await import('../../infrastructure/http-client.js');
      vi.mocked(entscheidsuche.search).mockResolvedValue({
        results: [],
        total: 0,
      });

      const input: LegalResearchInput = {
        query: 'test',
        sources: ['precedent'],
        court: 'bundesgericht',
      };

      const result = await handleLegalResearch(input, 'test-request-14');

      expect(result.results).toBeDefined();
      expect(entscheidsuche.search).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ court: 'bundesgericht' })
      );
    });

    it('should handle dateRange filter', async () => {
      const { entscheidsuche } = await import('../../infrastructure/http-client.js');
      vi.mocked(entscheidsuche.search).mockResolvedValue({
        results: [],
        total: 0,
      });

      const input: LegalResearchInput = {
        query: 'test',
        sources: ['precedent'],
        dateRange: {
          from: '2020-01-01',
          to: '2023-12-31',
        },
      };

      const result = await handleLegalResearch(input, 'test-request-15');

      expect(result.results).toBeDefined();
    });

    it('should properly format Fedlex SPARQL results', async () => {
      const { fedlexClient, entscheidsuche } = await import('../../infrastructure/http-client.js');
      vi.mocked(entscheidsuche.search).mockResolvedValue({
        results: [],
        total: 0,
      });
      vi.mocked(fedlexClient.sparql).mockResolvedValue({
        results: {
          bindings: [
            {
              act: { value: 'https://fedlex.data.admin.ch/eli/cc/27/317_321_377' },
              title: { value: 'Bundesgesetz betreffend die Ergänzung des Schweizerischen Zivilgesetzbuches (Fünfter Teil: Obligationenrecht)' },
              sr: { value: 'SR 220' },
              dateDocument: { value: '1911-03-30' },
            },
          ],
        },
      });

      const input: LegalResearchInput = {
        query: 'Obligationenrecht',
        sources: ['statute'],
      };

      const result = await handleLegalResearch(input, 'test-request-16');

      expect(result.results).toBeDefined();
      // Check that statutory results are properly formatted
      if (result.results.length > 0) {
        const statuteResult = result.results.find(r => r.type === 'statute');
        expect(statuteResult).toBeDefined();
      }
    });

    it('should combine results from multiple sources', async () => {
      const { entscheidsuche, fedlexClient } = await import('../../infrastructure/http-client.js');
      vi.mocked(entscheidsuche.search).mockResolvedValue({
        results: [
          {
            id: 'bge-1',
            title: 'BGE Test',
            court: 'Bundesgericht',
            date: '2023-01-01',
            summary: 'Precedent result',
          },
        ],
        total: 1,
      });
      vi.mocked(fedlexClient.sparql).mockResolvedValue({
        results: {
          bindings: [
            {
              act: { value: 'https://fedlex.data.admin.ch/eli/cc/27/317' },
              title: { value: 'Test Statute' },
              sr: { value: 'SR 123' },
            },
          ],
        },
      });

      const input: LegalResearchInput = {
        query: 'test',
        sources: ['precedent', 'statute'],
      };

      const result = await handleLegalResearch(input, 'test-request-17');

      expect(result.results).toBeDefined();
      expect(result.results.length).toBeGreaterThanOrEqual(1);
    });

    it('should include query information in response', async () => {
      const { entscheidsuche, fedlexClient } = await import('../../infrastructure/http-client.js');
      vi.mocked(entscheidsuche.search).mockResolvedValue({
        results: [],
        total: 0,
      });
      vi.mocked(fedlexClient.sparql).mockResolvedValue({
        results: { bindings: [] },
      });

      const input: LegalResearchInput = {
        query: 'specific legal query',
      };

      const result = await handleLegalResearch(input, 'test-request-18');

      expect(result.query).toBe('specific legal query');
    });

    it('should handle employment law domain', async () => {
      const { entscheidsuche } = await import('../../infrastructure/http-client.js');
      vi.mocked(entscheidsuche.search).mockResolvedValue({
        results: [
          {
            id: 'bge-employment',
            title: 'BGE zur Kündigung',
            court: 'Bundesgericht',
            date: '2023-01-01',
            summary: 'Arbeitsrecht Entscheid',
          },
        ],
        total: 1,
      });

      const input: LegalResearchInput = {
        query: 'wrongful termination',
        sources: ['precedent'],
        domain: 'employment',
      };

      const result = await handleLegalResearch(input, 'test-request-19');

      expect(result.results).toBeDefined();
    });

    it('should handle criminal law domain', async () => {
      const { entscheidsuche } = await import('../../infrastructure/http-client.js');
      vi.mocked(entscheidsuche.search).mockResolvedValue({
        results: [],
        total: 0,
      });

      const input: LegalResearchInput = {
        query: 'fraud StGB',
        sources: ['precedent'],
        domain: 'criminal',
      };

      const result = await handleLegalResearch(input, 'test-request-20');

      expect(result.results).toBeDefined();
    });
  });
});
