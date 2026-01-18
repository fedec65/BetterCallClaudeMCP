import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SearchInputSchema, type SearchInput } from '../types.js';
import { searchDecisions, buildSearchUrl, parseSearchResponse } from '../tools/search.js';

describe('SearchInputSchema', () => {
  it('should validate a minimal valid input', () => {
    const input = { query: 'Vertragshaftung' };
    const result = SearchInputSchema.parse(input);
    expect(result.query).toBe('Vertragshaftung');
    expect(result.limit).toBe(20); // default value
  });

  it('should validate a complete input with all fields', () => {
    const input: SearchInput = {
      query: 'Art. 97 OR',
      courts: ['BGer', 'ZH'],
      dateFrom: '2020-01-01',
      dateTo: '2024-12-31',
      canton: 'ZH',
      legalDomain: 'civil',
      language: 'de',
      limit: 50,
    };
    const result = SearchInputSchema.parse(input);
    expect(result).toEqual(input);
  });

  it('should reject empty query', () => {
    expect(() => SearchInputSchema.parse({ query: '' })).toThrow();
  });

  it('should reject invalid date format', () => {
    expect(() =>
      SearchInputSchema.parse({ query: 'test', dateFrom: '01-01-2020' })
    ).toThrow('Date must be YYYY-MM-DD format');
  });

  it('should reject invalid court code', () => {
    expect(() =>
      SearchInputSchema.parse({ query: 'test', courts: ['INVALID'] })
    ).toThrow();
  });

  it('should reject limit outside valid range', () => {
    expect(() =>
      SearchInputSchema.parse({ query: 'test', limit: 0 })
    ).toThrow();
    expect(() =>
      SearchInputSchema.parse({ query: 'test', limit: 101 })
    ).toThrow();
  });

  it('should reject invalid legal domain', () => {
    expect(() =>
      SearchInputSchema.parse({ query: 'test', legalDomain: 'invalid' as any })
    ).toThrow();
  });

  it('should accept all valid legal domains', () => {
    const domains = ['civil', 'criminal', 'administrative', 'constitutional', 'social', 'tax'];
    for (const domain of domains) {
      const result = SearchInputSchema.parse({ query: 'test', legalDomain: domain });
      expect(result.legalDomain).toBe(domain);
    }
  });

  it('should accept all valid languages', () => {
    const languages = ['de', 'fr', 'it'];
    for (const lang of languages) {
      const result = SearchInputSchema.parse({ query: 'test', language: lang });
      expect(result.language).toBe(lang);
    }
  });
});

describe('buildSearchUrl', () => {
  it('should build URL with only query parameter', () => {
    const url = buildSearchUrl({ query: 'Vertragshaftung', limit: 20 });
    expect(url).toContain('query=Vertragshaftung');
    expect(url).toContain('limit=20');
  });

  it('should build URL with court filters', () => {
    const url = buildSearchUrl({ query: 'test', courts: ['BGer', 'ZH'], limit: 20 });
    // URLSearchParams encodes comma as %2C
    expect(url).toContain('courts=BGer%2CZH');
  });

  it('should build URL with date range', () => {
    const url = buildSearchUrl({
      query: 'test',
      dateFrom: '2020-01-01',
      dateTo: '2024-12-31',
      limit: 20,
    });
    expect(url).toContain('dateFrom=2020-01-01');
    expect(url).toContain('dateTo=2024-12-31');
  });

  it('should build URL with canton filter', () => {
    const url = buildSearchUrl({ query: 'test', canton: 'ZH', limit: 20 });
    expect(url).toContain('canton=ZH');
  });

  it('should build URL with legal domain filter', () => {
    const url = buildSearchUrl({ query: 'test', legalDomain: 'civil', limit: 20 });
    expect(url).toContain('legalDomain=civil');
  });

  it('should build URL with language filter', () => {
    const url = buildSearchUrl({ query: 'test', language: 'fr', limit: 20 });
    expect(url).toContain('language=fr');
  });

  it('should encode special characters in query', () => {
    const url = buildSearchUrl({ query: 'Art. 97 Abs. 1 OR', limit: 20 });
    // URLSearchParams encodes spaces as + (which is valid for query strings)
    expect(url).toContain('query=Art.+97+Abs.+1+OR');
  });
});

describe('parseSearchResponse', () => {
  it('should parse empty response', () => {
    const response = { results: [], total: 0 };
    const result = parseSearchResponse(response, 'test', {});
    expect(result.results).toEqual([]);
    expect(result.totalCount).toBe(0);
    expect(result.query).toBe('test');
  });

  it('should parse response with results', () => {
    const response = {
      results: [
        {
          id: '123',
          title: 'BGE 145 III 229',
          court: 'BGer',
          date: '2019-05-15',
          reference: 'BGE 145 III 229',
          summary: 'Vertragshaftung',
          language: 'de',
        },
      ],
      total: 1,
    };
    const result = parseSearchResponse(response, 'Vertragshaftung', {});
    expect(result.results).toHaveLength(1);
    expect(result.results[0]?.id).toBe('123');
    expect(result.results[0]?.title).toBe('BGE 145 III 229');
    expect(result.totalCount).toBe(1);
  });

  it('should preserve filter information in output', () => {
    const filters = {
      courts: ['BGer'],
      dateFrom: '2020-01-01',
      canton: 'ZH',
    };
    const result = parseSearchResponse({ results: [], total: 0 }, 'test', filters);
    expect(result.filters).toEqual(filters);
  });

  it('should handle missing optional fields gracefully', () => {
    const response = {
      results: [
        {
          id: '123',
          title: 'Test Decision',
          court: 'BGer',
          date: '2020-01-01',
          reference: 'Test-123',
          language: 'de',
          // no summary, no url
        },
      ],
      total: 1,
    };
    const result = parseSearchResponse(response, 'test', {});
    expect(result.results[0]?.summary).toBeUndefined();
    expect(result.results[0]?.url).toBeUndefined();
  });
});

describe('searchDecisions', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    global.fetch = mockFetch as typeof fetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should call API and return parsed results', async () => {
    const mockResponse = {
      results: [
        {
          id: 'doc-123',
          title: 'BGE 145 III 229',
          court: 'BGer',
          date: '2019-05-15',
          reference: 'BGE 145 III 229',
          summary: 'Vertragshaftung gemäss Art. 97 OR',
          language: 'de',
          url: 'https://entscheidsuche.ch/doc/123',
        },
      ],
      total: 1,
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const result = await searchDecisions({ query: 'Vertragshaftung', limit: 20 });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(result.results).toHaveLength(1);
    expect(result.results[0]?.title).toBe('BGE 145 III 229');
    expect(result.totalCount).toBe(1);
  });

  it('should throw error on API failure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });

    await expect(searchDecisions({ query: 'test', limit: 20 })).rejects.toThrow(
      'Entscheidsuche API error: 500 Internal Server Error'
    );
  });

  it('should throw error on network failure', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    await expect(searchDecisions({ query: 'test', limit: 20 })).rejects.toThrow(
      'Network error'
    );
  });

  it('should pass all filters to API', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ results: [], total: 0 }),
    });

    await searchDecisions({
      query: 'test',
      courts: ['BGer'],
      dateFrom: '2020-01-01',
      dateTo: '2024-12-31',
      canton: 'ZH',
      legalDomain: 'civil',
      language: 'de',
      limit: 50,
    });

    const calledUrl = mockFetch.mock.calls[0]?.[0] as string;
    expect(calledUrl).toContain('courts=BGer');
    expect(calledUrl).toContain('dateFrom=2020-01-01');
    expect(calledUrl).toContain('dateTo=2024-12-31');
    expect(calledUrl).toContain('canton=ZH');
    expect(calledUrl).toContain('legalDomain=civil');
    expect(calledUrl).toContain('language=de');
    expect(calledUrl).toContain('limit=50');
  });
});
