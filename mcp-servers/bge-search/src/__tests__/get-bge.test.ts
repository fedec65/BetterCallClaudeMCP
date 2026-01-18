import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GetBGEInputSchema, BGECitationSchema, type GetBGEInput } from '../types.js';
import { getBGE, buildBGEUrl, parseBGEResponse, parseCitation } from '../tools/get-bge.js';

describe('BGECitationSchema', () => {
  it('should accept valid German citation format', () => {
    const result = BGECitationSchema.parse('BGE 145 III 229');
    expect(result).toBe('BGE 145 III 229');
  });

  it('should accept valid French citation format', () => {
    const result = BGECitationSchema.parse('ATF 140 II 315');
    expect(result).toBe('ATF 140 II 315');
  });

  it('should accept valid Italian citation format', () => {
    const result = BGECitationSchema.parse('DTF 138 I 1');
    expect(result).toBe('DTF 138 I 1');
  });

  it('should accept all valid sections', () => {
    const sections = ['I', 'Ia', 'II', 'III', 'IV', 'V', 'VI'];
    for (const section of sections) {
      const citation = `BGE 145 ${section} 229`;
      const result = BGECitationSchema.parse(citation);
      expect(result).toBe(citation);
    }
  });

  it('should reject invalid citation format', () => {
    expect(() => BGECitationSchema.parse('BGE145III229')).toThrow();
    expect(() => BGECitationSchema.parse('BGE 145 VII 229')).toThrow();
    expect(() => BGECitationSchema.parse('145 III 229')).toThrow();
    expect(() => BGECitationSchema.parse('BGE III 229')).toThrow();
    expect(() => BGECitationSchema.parse('')).toThrow();
  });
});

describe('GetBGEInputSchema', () => {
  it('should validate a minimal valid input', () => {
    const input = { citation: 'BGE 145 III 229' };
    const result = GetBGEInputSchema.parse(input);
    expect(result.citation).toBe('BGE 145 III 229');
    expect(result.includeConsiderations).toBe(true); // default value
  });

  it('should validate input with all fields', () => {
    const input: GetBGEInput = {
      citation: 'ATF 140 II 315',
      includeConsiderations: false,
      language: 'fr',
    };
    const result = GetBGEInputSchema.parse(input);
    expect(result).toEqual(input);
  });

  it('should reject invalid citation', () => {
    expect(() => GetBGEInputSchema.parse({ citation: 'invalid' })).toThrow(
      'Invalid BGE citation format'
    );
  });

  it('should accept all valid languages', () => {
    const languages = ['de', 'fr', 'it'];
    for (const lang of languages) {
      const result = GetBGEInputSchema.parse({
        citation: 'BGE 145 III 229',
        language: lang,
      });
      expect(result.language).toBe(lang);
    }
  });
});

describe('parseCitation', () => {
  it('should parse German citation', () => {
    const result = parseCitation('BGE 145 III 229');
    expect(result.volume).toBe(145);
    expect(result.section).toBe('III');
    expect(result.page).toBe(229);
  });

  it('should parse French citation', () => {
    const result = parseCitation('ATF 140 II 315');
    expect(result.volume).toBe(140);
    expect(result.section).toBe('II');
    expect(result.page).toBe(315);
  });

  it('should parse Italian citation', () => {
    const result = parseCitation('DTF 138 I 1');
    expect(result.volume).toBe(138);
    expect(result.section).toBe('I');
    expect(result.page).toBe(1);
  });

  it('should parse citation with Ia section', () => {
    const result = parseCitation('BGE 130 Ia 55');
    expect(result.volume).toBe(130);
    expect(result.section).toBe('Ia');
    expect(result.page).toBe(55);
  });
});

describe('buildBGEUrl', () => {
  it('should build URL with citation only', () => {
    const url = buildBGEUrl({
      citation: 'BGE 145 III 229',
      includeConsiderations: true,
    });
    expect(url).toContain('/bge/145/III/229');
    expect(url).toContain('includeConsiderations=true');
  });

  it('should build URL without considerations', () => {
    const url = buildBGEUrl({
      citation: 'BGE 145 III 229',
      includeConsiderations: false,
    });
    expect(url).toContain('includeConsiderations=false');
  });

  it('should build URL with language parameter', () => {
    const url = buildBGEUrl({
      citation: 'ATF 140 II 315',
      includeConsiderations: true,
      language: 'fr',
    });
    expect(url).toContain('/bge/140/II/315');
    expect(url).toContain('language=fr');
  });

  it('should handle different citation formats', () => {
    const urlDE = buildBGEUrl({
      citation: 'BGE 145 III 229',
      includeConsiderations: true,
    });
    const urlFR = buildBGEUrl({
      citation: 'ATF 145 III 229',
      includeConsiderations: true,
    });
    const urlIT = buildBGEUrl({
      citation: 'DTF 145 III 229',
      includeConsiderations: true,
    });

    // All should resolve to the same document path
    expect(urlDE).toContain('/bge/145/III/229');
    expect(urlFR).toContain('/bge/145/III/229');
    expect(urlIT).toContain('/bge/145/III/229');
  });
});

describe('parseBGEResponse', () => {
  it('should parse full BGE response', () => {
    const apiResponse = {
      citation: 'BGE 145 III 229',
      volume: 145,
      section: 'III',
      page: 229,
      title: 'Vertragshaftung, Art. 97 OR',
      date: '2019-05-15',
      language: 'de',
      regeste: 'Regeste zum Urteil...',
      sachverhalt: 'A. Die Klägerin...',
      considerations: [
        { number: '1', title: 'Formelles', content: 'Die Beschwerde...' },
        { number: '2', title: 'Materielles', content: 'In der Sache...' },
        { number: '2.1', content: 'Die Vorinstanz hat...' },
      ],
      dispositiv: '1. Die Beschwerde wird gutgeheissen...',
      url: 'https://bger.ch/bge-145-iii-229',
    };

    const result = parseBGEResponse(apiResponse);
    expect(result.citation).toBe('BGE 145 III 229');
    expect(result.volume).toBe(145);
    expect(result.section).toBe('III');
    expect(result.page).toBe(229);
    expect(result.title).toBe('Vertragshaftung, Art. 97 OR');
    expect(result.regeste).toBe('Regeste zum Urteil...');
    expect(result.sachverhalt).toBe('A. Die Klägerin...');
    expect(result.considerations).toHaveLength(3);
    expect(result.considerations?.[0]?.number).toBe('1');
    expect(result.considerations?.[0]?.title).toBe('Formelles');
    expect(result.dispositiv).toBe('1. Die Beschwerde wird gutgeheissen...');
  });

  it('should handle missing optional fields', () => {
    const apiResponse = {
      citation: 'BGE 140 II 315',
      volume: 140,
      section: 'II',
      page: 315,
      title: 'Test Decision',
      date: '2014-06-20',
      language: 'de',
    };

    const result = parseBGEResponse(apiResponse);
    expect(result.regeste).toBeUndefined();
    expect(result.sachverhalt).toBeUndefined();
    expect(result.considerations).toBeUndefined();
    expect(result.dispositiv).toBeUndefined();
    expect(result.url).toBeUndefined();
  });

  it('should parse response with empty considerations', () => {
    const apiResponse = {
      citation: 'BGE 138 I 1',
      volume: 138,
      section: 'I',
      page: 1,
      title: 'Constitutional Decision',
      date: '2012-01-15',
      language: 'de',
      considerations: [],
    };

    const result = parseBGEResponse(apiResponse);
    expect(result.considerations).toEqual([]);
  });
});

describe('getBGE', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    global.fetch = mockFetch as typeof fetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should fetch and return BGE document', async () => {
    const mockResponse = {
      citation: 'BGE 145 III 229',
      volume: 145,
      section: 'III',
      page: 229,
      title: 'Vertragshaftung, Art. 97 OR',
      date: '2019-05-15',
      language: 'de',
      regeste: 'Regeste zum Urteil...',
      considerations: [
        { number: '1', content: 'Die Beschwerde...' },
      ],
      url: 'https://bger.ch/bge-145-iii-229',
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const result = await getBGE({
      citation: 'BGE 145 III 229',
      includeConsiderations: true,
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(result.citation).toBe('BGE 145 III 229');
    expect(result.title).toBe('Vertragshaftung, Art. 97 OR');
    expect(result.considerations).toHaveLength(1);
  });

  it('should throw error on API failure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    });

    await expect(
      getBGE({ citation: 'BGE 999 III 1', includeConsiderations: true })
    ).rejects.toThrow('BGE Search API error: 404 Not Found');
  });

  it('should throw error on network failure', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    await expect(
      getBGE({ citation: 'BGE 145 III 229', includeConsiderations: true })
    ).rejects.toThrow('Network error');
  });

  it('should request correct language from API', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          citation: 'ATF 140 II 315',
          volume: 140,
          section: 'II',
          page: 315,
          title: 'Test',
          date: '2014-06-20',
          language: 'fr',
        }),
    });

    await getBGE({
      citation: 'ATF 140 II 315',
      includeConsiderations: true,
      language: 'fr',
    });

    const calledUrl = mockFetch.mock.calls[0]?.[0] as string;
    expect(calledUrl).toContain('language=fr');
  });

  it('should request without considerations when specified', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          citation: 'BGE 145 III 229',
          volume: 145,
          section: 'III',
          page: 229,
          title: 'Test',
          date: '2019-05-15',
          language: 'de',
        }),
    });

    await getBGE({
      citation: 'BGE 145 III 229',
      includeConsiderations: false,
    });

    const calledUrl = mockFetch.mock.calls[0]?.[0] as string;
    expect(calledUrl).toContain('includeConsiderations=false');
  });

  it('should handle BGE with full content', async () => {
    const mockResponse = {
      citation: 'BGE 145 III 229',
      volume: 145,
      section: 'III',
      page: 229,
      title: 'Vertragshaftung',
      date: '2019-05-15',
      language: 'de',
      regeste: 'Regeste...',
      sachverhalt: 'Sachverhalt...',
      considerations: [
        { number: '1', title: 'Formelles', content: 'Text...' },
        { number: '2', title: 'Materielles', content: 'Text...' },
        { number: '2.1', content: 'Text...' },
        { number: '2.2', content: 'Text...' },
        { number: '3', title: 'Kosten', content: 'Text...' },
      ],
      dispositiv: 'Dispositiv...',
      url: 'https://bger.ch/bge-145-iii-229',
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const result = await getBGE({
      citation: 'BGE 145 III 229',
      includeConsiderations: true,
    });

    expect(result.regeste).toBe('Regeste...');
    expect(result.sachverhalt).toBe('Sachverhalt...');
    expect(result.considerations).toHaveLength(5);
    expect(result.dispositiv).toBe('Dispositiv...');
  });
});
