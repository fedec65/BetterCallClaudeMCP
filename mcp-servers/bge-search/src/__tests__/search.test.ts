import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SearchInputSchema, type SearchInput } from '../types.js';
import { searchBGE, buildSearchUrl, parseSearchResponse } from '../tools/search.js';

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
      volume: 145,
      section: 'III',
      yearFrom: 2015,
      yearTo: 2024,
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

  it('should reject invalid section', () => {
    expect(() =>
      SearchInputSchema.parse({ query: 'test', section: 'VII' as any })
    ).toThrow();
  });

  it('should reject invalid year range', () => {
    expect(() =>
      SearchInputSchema.parse({ query: 'test', yearFrom: 1800 })
    ).toThrow();
    expect(() =>
      SearchInputSchema.parse({ query: 'test', yearTo: 2200 })
    ).toThrow();
  });

  it('should reject limit outside valid range', () => {
    expect(() => SearchInputSchema.parse({ query: 'test', limit: 0 })).toThrow();
    expect(() => SearchInputSchema.parse({ query: 'test', limit: 101 })).toThrow();
  });

  it('should accept all valid sections', () => {
    const sections = ['I', 'Ia', 'II', 'III', 'IV', 'V', 'VI'];
    for (const section of sections) {
      const result = SearchInputSchema.parse({ query: 'test', section });
      expect(result.section).toBe(section);
    }
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

  it('should build URL with volume filter', () => {
    const url = buildSearchUrl({ query: 'test', volume: 145, limit: 20 });
    expect(url).toContain('volume=145');
  });

  it('should build URL with section filter', () => {
    const url = buildSearchUrl({ query: 'test', section: 'III', limit: 20 });
    expect(url).toContain('section=III');
  });

  it('should build URL with year range', () => {
    const url = buildSearchUrl({
      query: 'test',
      yearFrom: 2015,
      yearTo: 2024,
      limit: 20,
    });
    expect(url).toContain('yearFrom=2015');
    expect(url).toContain('yearTo=2024');
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
    // URLSearchParams encodes spaces as +
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
          citation: 'BGE 145 III 229',
          title: 'Vertragshaftung Art. 97 OR',
          date: '2019-05-15',
          section: 'III',
          volume: 145,
          page: 229,
          summary: 'Haftung für Nichterfüllung',
          language: 'de',
          url: 'https://bger.ch/bge-145-iii-229',
        },
      ],
      total: 1,
    };
    const result = parseSearchResponse(response, 'Vertragshaftung', {});
    expect(result.results).toHaveLength(1);
    expect(result.results[0]?.citation).toBe('BGE 145 III 229');
    expect(result.results[0]?.title).toBe('Vertragshaftung Art. 97 OR');
    expect(result.results[0]?.section).toBe('III');
    expect(result.results[0]?.volume).toBe(145);
    expect(result.totalCount).toBe(1);
  });

  it('should preserve filter information in output', () => {
    const filters = {
      volume: 145,
      section: 'III' as const,
      yearFrom: 2015,
      legalDomain: 'civil' as const,
    };
    const result = parseSearchResponse({ results: [], total: 0 }, 'test', filters);
    expect(result.filters).toEqual(filters);
  });

  it('should handle missing optional fields gracefully', () => {
    const response = {
      results: [
        {
          citation: 'BGE 140 II 315',
          title: 'Test Decision',
          date: '2014-06-20',
          section: 'II',
          volume: 140,
          page: 315,
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

describe('searchBGE', () => {
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
          citation: 'BGE 145 III 229',
          title: 'Vertragshaftung gemäss Art. 97 OR',
          date: '2019-05-15',
          section: 'III',
          volume: 145,
          page: 229,
          summary: 'Haftung für Nichterfüllung eines Vertrags',
          language: 'de',
          url: 'https://bger.ch/bge-145-iii-229',
        },
      ],
      total: 1,
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const result = await searchBGE({ query: 'Vertragshaftung', limit: 20 });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(result.results).toHaveLength(1);
    expect(result.results[0]?.title).toBe('Vertragshaftung gemäss Art. 97 OR');
    expect(result.totalCount).toBe(1);
  });

  it('should throw error on API failure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });

    await expect(searchBGE({ query: 'test', limit: 20 })).rejects.toThrow(
      'BGE Search API error: 500 Internal Server Error'
    );
  });

  it('should throw error on network failure', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    await expect(searchBGE({ query: 'test', limit: 20 })).rejects.toThrow('Network error');
  });

  it('should pass all filters to API', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ results: [], total: 0 }),
    });

    await searchBGE({
      query: 'test',
      volume: 145,
      section: 'III',
      yearFrom: 2015,
      yearTo: 2024,
      legalDomain: 'civil',
      language: 'de',
      limit: 50,
    });

    const calledUrl = mockFetch.mock.calls[0]?.[0] as string;
    expect(calledUrl).toContain('volume=145');
    expect(calledUrl).toContain('section=III');
    expect(calledUrl).toContain('yearFrom=2015');
    expect(calledUrl).toContain('yearTo=2024');
    expect(calledUrl).toContain('legalDomain=civil');
    expect(calledUrl).toContain('language=de');
    expect(calledUrl).toContain('limit=50');
  });

  it('should handle multiple results', async () => {
    const mockResponse = {
      results: [
        {
          citation: 'BGE 145 III 229',
          title: 'First Decision',
          date: '2019-05-15',
          section: 'III',
          volume: 145,
          page: 229,
          language: 'de',
        },
        {
          citation: 'BGE 140 III 115',
          title: 'Second Decision',
          date: '2014-03-10',
          section: 'III',
          volume: 140,
          page: 115,
          language: 'de',
        },
        {
          citation: 'BGE 138 III 425',
          title: 'Third Decision',
          date: '2012-07-25',
          section: 'III',
          volume: 138,
          page: 425,
          language: 'de',
        },
      ],
      total: 3,
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const result = await searchBGE({ query: 'Haftung', limit: 20 });

    expect(result.results).toHaveLength(3);
    expect(result.totalCount).toBe(3);
  });
});
