/**
 * EntscheidSucheClient Tests
 * Tests: api-clients/EntscheidSucheClient.ts
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Mock p-retry to avoid ESM import issues
vi.mock('p-retry', () => ({
  __esModule: true,
  default: async (fn: () => Promise<unknown>): Promise<unknown> => await fn(),
}));

import { EntscheidSucheClient } from '../api-clients/EntscheidSucheClient';
import { Logger, getLogger } from '../logging/logger';
import nock from 'nock';

describe('EntscheidSucheClient', () => {
  let client: EntscheidSucheClient;
  let logger: Logger;
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    const winstonLogger = getLogger({ level: 'error', format: 'json' });
    logger = new Logger(winstonLogger);

    client = new EntscheidSucheClient({
      config: {
        baseUrl: 'https://entscheidsuche.test',
        timeout: 5000,
        rateLimit: 200,
      },
      logger,
      serviceName: 'entscheidsuche-test',
    });

    originalFetch = global.fetch;
  });

  afterEach(() => {
    nock.cleanAll();
    global.fetch = originalFetch;
  });

  describe('searchDecisions', () => {
    it('should search decisions successfully', async () => {
      const mockResponse = {
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
      };

      nock('https://entscheidsuche.test')
        .post('/_search.php')
        .reply(200, mockResponse);

      const result = await client.searchDecisions({ query: 'test' });

      expect(result.decisions).toHaveLength(1);
      expect(result.decisions[0].decisionId).toBe('CH_BGer_001_5A-123-2024_2024-06-15');
      // Static fallback map includes the French name for the federal court
      expect(result.decisions[0].court).toBe('Bundesgericht / Tribunal fédéral');
      expect(result.decisions[0].courtLevel).toBe('federal');
      expect(result.decisions[0].documentUrl).toBe(
        'https://entscheidsuche.ch/docs/CH_BGer/CH_BGer_001_5A-123-2024_2024-06-15.html'
      );
      expect(result.decisions[0].isPdf).toBe(true);
      expect(result.decisions[0].scrapeDate).toBe('2024-06-16');
      expect(result.total).toBe(1);
    });

    it('should return nextCursor when there are more results', async () => {
      const mockResponse = {
        hits: {
          total: { value: 2, relation: 'eq' },
          max_score: 1.0,
          hits: [
            {
              _id: 'CH_BGer_001_5A-123-2024_2024-06-15',
              _score: 1.0,
              _source: {
                date: '2024-06-15',
                hierarchy: ['CH', 'CH_BGer'],
                title: { de: 'A' },
                attachment: { language: 'de' },
              },
            },
          ],
        },
      };

      nock('https://entscheidsuche.test')
        .post('/_search.php')
        .reply(200, mockResponse);

      const result = await client.searchDecisions({ query: 'test', size: 1 });

      expect(result.nextCursor).toEqual([1.0, 'CH_BGer_001_5A-123-2024_2024-06-15']);
    });

    it('should include aggregations when requested', async () => {
      const mockResponse = {
        hits: {
          total: { value: 100, relation: 'eq' },
          max_score: 1.0,
          hits: [],
        },
        aggregations: {
          hierarchy: {
            buckets: [
              { key: 'CH_BGer', doc_count: 50 },
              { key: 'ZH_OG', doc_count: 30 },
            ],
          },
        },
      };

      nock('https://entscheidsuche.test')
        .post('/_search.php')
        .reply(200, mockResponse);

      const result = await client.searchDecisions({ query: 'test', includeAggregations: true });

      expect(result.aggregations).toEqual({ CH_BGer: 50, ZH_OG: 30 });
    });
  });

  describe('searchByCaseNumber', () => {
    it('should wrap case number in quotes', async () => {
      let capturedBody: unknown;

      nock('https://entscheidsuche.test')
        .post('/_search.php', (body) => {
          capturedBody = body;
          return true;
        })
        .reply(200, {
          hits: { total: { value: 0, relation: 'eq' }, max_score: 0, hits: [] },
        });

      await client.searchByCaseNumber('5A_123/2024');

      expect(
        (capturedBody as { query?: { simple_query_string?: { query: string } } }).query?.simple_query_string?.query
      ).toBe('"5A_123/2024"');
    });
  });

  describe('listHierarchy', () => {
    it('should return hierarchy buckets', async () => {
      const mockResponse = {
        hits: { total: { value: 1000, relation: 'eq' }, max_score: 0, hits: [] },
        aggregations: {
          hierarchy: {
            buckets: [
              { key: 'CH_BGer', doc_count: 500 },
              { key: 'ZH_OG', doc_count: 300 },
            ],
          },
        },
      };

      nock('https://entscheidsuche.test')
        .post('/_search.php')
        .reply(200, mockResponse);

      const result = await client.listHierarchy('*', 1000);

      expect(result.entries).toHaveLength(2);
      expect(result.entries[0]).toEqual({ id: 'CH_BGer', count: 500 });
      expect(result.total).toBe(1000);
    });
  });

  describe('listFacets', () => {
    it('should return localized facet tree', async () => {
      const mockFacets = {
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
                CH_BGer_001: {
                  spider: 'CH_BGer',
                  de: 'I. Öffentlich-rechtliche Abteilung',
                  fr: 'Ire Cour de droit public',
                  it: 'I Corte di diritto pubblico',
                },
              },
            },
          },
        },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockFacets,
      } as unknown as Response);

      const result = await client.listFacets();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('CH');
      expect(result[0].de).toBe('Eidgenossenschaft');
      expect(result[0].children?.[0].id).toBe('CH_BGer');
      expect(result[0].children?.[0].children?.[0].id).toBe('CH_BGer_001');
    });
  });

  describe('getDecision', () => {
    it('should fetch a decision by signature', async () => {
      const mockDoc = {
        date: '2024-06-15',
        hierarchy: ['CH', 'CH_BGer'],
        title: { de: 'Testentscheid' },
        abstract: { de: 'Testzusammenfassung' },
        attachment: { language: 'de', content: 'Full text' },
      };

      nock('https://entscheidsuche.test')
        .get('/docs/CH_BGer/CH_BGer_001_5A-123-2024_2024-06-15.json')
        .reply(200, mockDoc);

      const result = await client.getDecision('CH_BGer_001_5A-123-2024_2024-06-15');

      expect(result).not.toBeNull();
      expect(result?.decisionId).toBe('CH_BGer_001_5A-123-2024_2024-06-15');
      expect(result?.fullText).toBe('Full text');
    });

    it('should return null for non-existent decision', async () => {
      nock('https://entscheidsuche.test')
        .get('/docs/CH_BGer/INVALID.json')
        .reply(404);

      const result = await client.getDecision('INVALID');

      expect(result).toBeNull();
    });
  });
});
