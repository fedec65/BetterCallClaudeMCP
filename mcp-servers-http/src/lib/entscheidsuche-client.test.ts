/**
 * Tests for the simplified HTTP EntscheidSuche client.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EntscheidSucheClient, type SearchFilters } from './entscheidsuche-client.js';

describe('EntscheidSucheClient (HTTP)', () => {
  let client: EntscheidSucheClient;
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    client = new EntscheidSucheClient('https://entscheidsuche.test');
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  function mockJson(response: unknown) {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => response,
    } as unknown as Response);
  }

  describe('searchDecisions', () => {
    it('normalizes a basic hit', async () => {
      mockJson({
        hits: {
          total: { value: 1, relation: 'eq' },
          max_score: 1.5,
          hits: [
            {
              _id: 'CH_BGer_001_5A-123-2024_2024-06-15',
              _score: 1.5,
              _source: {
                date: '2024-06-15',
                hierarchy: ['CH', 'CH_BGer', 'CH_BGer_001'],
                title: { de: 'Testentscheid' },
                abstract: { de: 'Testzusammenfassung' },
                reference: ['5A_123/2024'],
                attachment: {
                  language: 'de',
                  content_url: 'https://entscheidsuche.test/docs/CH_BGer/CH_BGer_001_5A-123-2024_2024-06-15.pdf',
                },
                source: 'https://www.bger.ch',
                is_pdf: true,
                scrape_date: '2024-06-16',
              },
            },
          ],
        },
      });

      const result = await client.searchDecisions({ query: 'test' });

      expect(result.total).toBe(1);
      expect(result.decisions).toHaveLength(1);
      expect(result.decisions[0].decisionId).toBe('CH_BGer_001_5A-123-2024_2024-06-15');
      expect(result.decisions[0].court).toBe('Bundesgericht');
      expect(result.decisions[0].courtLevel).toBe('federal');
      expect(result.decisions[0].documentUrl).toBe(
        'https://entscheidsuche.test/docs/CH_BGer/CH_BGer_001_5A-123-2024_2024-06-15.html'
      );
      expect(result.decisions[0].isPdf).toBe(true);
      expect(result.decisions[0].scrapeDate).toBe('2024-06-16');
    });

    it('returns a nextCursor when the page is full', async () => {
      mockJson({
        hits: {
          total: { value: 2, relation: 'eq' },
          max_score: 1.0,
          hits: [
            {
              _id: 'CH_BGer_001_5A-123-2024_2024-06-15',
              _score: 1.0,
              sort: [1718409600000, 1.0],
              _source: { date: '2024-06-15', hierarchy: ['CH', 'CH_BGer'], title: { de: 'A' }, attachment: { language: 'de' } },
            },
          ],
        },
      });

      const result = await client.searchDecisions({ query: 'test', size: 1 });

      expect(result.nextCursor).toEqual([1718409600000, 1.0]);
    });

    it('includes aggregations when requested', async () => {
      mockJson({
        hits: { total: { value: 100, relation: 'eq' }, max_score: 1, hits: [] },
        aggregations: {
          hierarchy: {
            buckets: [
              { key: 'CH_BGer', doc_count: 50 },
              { key: 'ZH_OG', doc_count: 30 },
            ],
          },
        },
      });

      const result = await client.searchDecisions({ query: 'test', includeAggregations: true });

      expect(result.aggregations).toEqual({ CH_BGer: 50, ZH_OG: 30 });
    });
  });

  describe('searchByCaseNumber', () => {
    it('wraps the case number in quotes', async () => {
      mockJson({
        hits: { total: { value: 0, relation: 'eq' }, max_score: 0, hits: [] },
      });

      await client.searchByCaseNumber('5A_123/2024');

      const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls as [string, RequestInit][];
      const body = JSON.parse(calls[0][1].body as string);
      expect(body.query.simple_query_string.query).toBe('"5A_123/2024"');
    });
  });

  describe('listHierarchy', () => {
    it('returns hierarchy buckets and total', async () => {
      mockJson({
        hits: { total: { value: 1000, relation: 'eq' }, max_score: 0, hits: [] },
        aggregations: {
          hierarchy: {
            buckets: [
              { key: 'CH_BGer', doc_count: 500 },
              { key: 'ZH_OG', doc_count: 300 },
            ],
          },
        },
      });

      const result = await client.listHierarchy('*', 1000);

      expect(result.entries).toHaveLength(2);
      expect(result.entries[0]).toEqual({ id: 'CH_BGer', count: 500 });
      expect(result.total).toBe(1000);
    });
  });

  describe('listFacets', () => {
    it('returns localized facet tree', async () => {
      mockJson({
        CH: {
          de: 'Eidgenossenschaft',
          fr: 'Confédération',
          it: 'Confederazione',
          gerichte: {
            CH_BGer: {
              de: 'Bundesgericht',
              fr: 'Tribunal fédéral',
              it: 'Tribunale federale',
              kammern: {
                CH_BGer_001: { spider: 'CH_BGer', de: 'I. Öffentlich-rechtliche Abteilung' },
              },
            },
          },
        },
      });

      const result = await client.listFacets();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('CH');
      expect(result[0].de).toBe('Eidgenossenschaft');
      expect(result[0].children?.[0].id).toBe('CH_BGer');
      expect(result[0].children?.[0].children?.[0].id).toBe('CH_BGer_001');
    });
  });

  describe('getDecision', () => {
    it('fetches and normalizes a single decision', async () => {
      mockJson({
        date: '2024-06-15',
        hierarchy: ['CH', 'CH_BGer'],
        title: { de: 'Testentscheid' },
        abstract: { de: 'Testzusammenfassung' },
        attachment: { language: 'de', content: 'Full text' },
      });

      const result = await client.getDecision('CH_BGer_001_5A-123-2024_2024-06-15');

      expect(result).not.toBeNull();
      expect(result?.decisionId).toBe('CH_BGer_001_5A-123-2024_2024-06-15');
      expect(result?.fullText).toBe('Full text');

      const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls as [string, RequestInit][];
      expect(calls[0][0]).toBe(
        'https://entscheidsuche.test/docs/CH_BGer/CH_BGer_001_5A-123-2024_2024-06-15.json'
      );
    });

    it('returns null for a missing decision', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      } as unknown as Response);

      const result = await client.getDecision('CH_BGer_MISSING');

      expect(result).toBeNull();
    });
  });
});
