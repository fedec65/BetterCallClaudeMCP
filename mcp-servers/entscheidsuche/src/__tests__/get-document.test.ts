import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GetDocumentInputSchema, type GetDocumentInput } from '../types.js';
import { getDocument, buildDocumentUrl, parseDocumentResponse } from '../tools/get-document.js';

describe('GetDocumentInputSchema', () => {
  it('should validate a minimal valid input', () => {
    const input = { documentId: 'doc-123' };
    const result = GetDocumentInputSchema.parse(input);
    expect(result.documentId).toBe('doc-123');
    expect(result.format).toBe('full'); // default value
  });

  it('should validate input with explicit format', () => {
    const input: GetDocumentInput = {
      documentId: 'bge-145-iii-229',
      format: 'summary',
    };
    const result = GetDocumentInputSchema.parse(input);
    expect(result).toEqual(input);
  });

  it('should reject empty documentId', () => {
    expect(() => GetDocumentInputSchema.parse({ documentId: '' })).toThrow('Document ID is required');
  });

  it('should reject invalid format', () => {
    expect(() =>
      GetDocumentInputSchema.parse({ documentId: 'doc-123', format: 'invalid' as any })
    ).toThrow();
  });

  it('should accept all valid formats', () => {
    const formats = ['full', 'summary', 'citations'];
    for (const format of formats) {
      const result = GetDocumentInputSchema.parse({ documentId: 'doc-123', format });
      expect(result.format).toBe(format);
    }
  });
});

describe('buildDocumentUrl', () => {
  it('should build URL with documentId only', () => {
    const url = buildDocumentUrl({ documentId: 'doc-123', format: 'full' });
    expect(url).toContain('/documents/doc-123');
    expect(url).toContain('format=full');
  });

  it('should build URL with summary format', () => {
    const url = buildDocumentUrl({ documentId: 'bge-145-iii-229', format: 'summary' });
    expect(url).toContain('/documents/bge-145-iii-229');
    expect(url).toContain('format=summary');
  });

  it('should build URL with citations format', () => {
    const url = buildDocumentUrl({ documentId: 'doc-456', format: 'citations' });
    expect(url).toContain('/documents/doc-456');
    expect(url).toContain('format=citations');
  });

  it('should encode special characters in documentId', () => {
    const url = buildDocumentUrl({ documentId: 'doc/special+chars', format: 'full' });
    expect(url).toContain(encodeURIComponent('doc/special+chars'));
  });
});

describe('parseDocumentResponse', () => {
  it('should parse full document response', () => {
    const apiResponse = {
      id: 'bge-145-iii-229',
      title: 'BGE 145 III 229',
      court: 'BGer',
      date: '2019-05-15',
      reference: 'BGE 145 III 229',
      language: 'de',
      content: 'Full text of the decision...',
      summary: 'Summary of the decision',
      citations: [
        { citation: 'Art. 97 OR', type: 'statute' as const, context: 'liability claim' },
        { citation: 'BGE 140 III 115', type: 'bge' as const, context: 'precedent' },
      ],
      metadata: {
        legalDomain: 'civil',
        judges: ['Judge A', 'Judge B'],
        parties: 'X v. Y',
        procedureType: 'appeal',
      },
      url: 'https://entscheidsuche.ch/doc/bge-145-iii-229',
    };

    const result = parseDocumentResponse(apiResponse);
    expect(result.id).toBe('bge-145-iii-229');
    expect(result.title).toBe('BGE 145 III 229');
    expect(result.court).toBe('BGer');
    expect(result.content).toBe('Full text of the decision...');
    expect(result.citations).toHaveLength(2);
    expect(result.citations?.[0]?.citation).toBe('Art. 97 OR');
    expect(result.metadata.legalDomain).toBe('civil');
  });

  it('should handle missing optional fields', () => {
    const apiResponse = {
      id: 'doc-123',
      title: 'Test Decision',
      court: 'ZH',
      date: '2020-01-01',
      reference: 'Test-123',
      language: 'de',
      content: 'Decision content',
      metadata: {},
    };

    const result = parseDocumentResponse(apiResponse);
    expect(result.summary).toBeUndefined();
    expect(result.citations).toBeUndefined();
    expect(result.url).toBeUndefined();
    expect(result.metadata.judges).toBeUndefined();
  });

  it('should parse summary format response', () => {
    const apiResponse = {
      id: 'doc-123',
      title: 'Test Decision',
      court: 'BGer',
      date: '2020-01-01',
      reference: 'Test-123',
      language: 'fr',
      content: '', // Empty in summary format
      summary: 'Brief summary of the decision',
      metadata: {},
    };

    const result = parseDocumentResponse(apiResponse);
    expect(result.summary).toBe('Brief summary of the decision');
    expect(result.content).toBe('');
  });

  it('should parse citations format response', () => {
    const apiResponse = {
      id: 'doc-123',
      title: 'Test Decision',
      court: 'BGer',
      date: '2020-01-01',
      reference: 'Test-123',
      language: 'de',
      content: '', // Empty in citations format
      citations: [
        { citation: 'Art. 41 OR', type: 'statute' as const },
        { citation: 'Art. 97 OR', type: 'statute' as const },
        { citation: 'BGE 130 III 182', type: 'bge' as const },
      ],
      metadata: {},
    };

    const result = parseDocumentResponse(apiResponse);
    expect(result.citations).toHaveLength(3);
    expect(result.content).toBe('');
  });
});

describe('getDocument', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    global.fetch = mockFetch as typeof fetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should fetch and return full document', async () => {
    const mockResponse = {
      id: 'bge-145-iii-229',
      title: 'BGE 145 III 229',
      court: 'BGer',
      date: '2019-05-15',
      reference: 'BGE 145 III 229',
      language: 'de',
      content: 'Full text of the decision regarding Art. 97 OR...',
      summary: 'Contract liability case',
      citations: [
        { citation: 'Art. 97 OR', type: 'statute', context: 'main claim' },
      ],
      metadata: {
        legalDomain: 'civil',
        judges: ['Judge A'],
      },
      url: 'https://entscheidsuche.ch/doc/bge-145-iii-229',
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const result = await getDocument({ documentId: 'bge-145-iii-229', format: 'full' });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(result.id).toBe('bge-145-iii-229');
    expect(result.title).toBe('BGE 145 III 229');
    expect(result.content).toContain('Art. 97 OR');
    expect(result.citations).toHaveLength(1);
  });

  it('should throw error on API failure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    });

    await expect(getDocument({ documentId: 'nonexistent', format: 'full' })).rejects.toThrow(
      'Entscheidsuche API error: 404 Not Found'
    );
  });

  it('should throw error on network failure', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    await expect(getDocument({ documentId: 'doc-123', format: 'full' })).rejects.toThrow(
      'Network error'
    );
  });

  it('should request correct format from API', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          id: 'doc-123',
          title: 'Test',
          court: 'BGer',
          date: '2020-01-01',
          reference: 'Test-123',
          language: 'de',
          content: '',
          summary: 'Summary only',
          metadata: {},
        }),
    });

    await getDocument({ documentId: 'doc-123', format: 'summary' });

    const calledUrl = mockFetch.mock.calls[0]?.[0] as string;
    expect(calledUrl).toContain('format=summary');
  });

  it('should handle document with all citation types', async () => {
    const mockResponse = {
      id: 'doc-complex',
      title: 'Complex Decision',
      court: 'BGer',
      date: '2021-03-15',
      reference: 'Complex-123',
      language: 'de',
      content: 'Decision text',
      citations: [
        { citation: 'Art. 97 OR', type: 'statute', context: 'contractual liability' },
        { citation: 'BGE 145 III 229', type: 'bge', context: 'precedent for damages' },
        { citation: 'Basler Kommentar', type: 'other', context: 'doctrine reference' },
      ],
      metadata: {
        legalDomain: 'civil',
        procedureType: 'appeal',
      },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const result = await getDocument({ documentId: 'doc-complex', format: 'citations' });

    expect(result.citations).toHaveLength(3);
    expect(result.citations?.find((c) => c.type === 'statute')).toBeDefined();
    expect(result.citations?.find((c) => c.type === 'bge')).toBeDefined();
    expect(result.citations?.find((c) => c.type === 'other')).toBeDefined();
  });
});
