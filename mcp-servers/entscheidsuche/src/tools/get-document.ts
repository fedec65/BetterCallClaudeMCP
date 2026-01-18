import type { GetDocumentInput, DocumentOutput, CitationReference, Language } from '../types.js';

const ENTSCHEIDSUCHE_API_BASE = 'https://entscheidsuche.ch/api/v1';

/**
 * Build the document URL with query parameters
 */
export function buildDocumentUrl(input: GetDocumentInput): string {
  const encodedId = encodeURIComponent(input.documentId);
  const params = new URLSearchParams();
  params.set('format', input.format);

  return `${ENTSCHEIDSUCHE_API_BASE}/documents/${encodedId}?${params.toString()}`;
}

/**
 * Raw API response structure for document
 */
interface ApiDocumentResponse {
  id: string;
  title: string;
  court: string;
  date: string;
  reference: string;
  language: string;
  content: string;
  summary?: string;
  citations?: Array<{
    citation: string;
    type: 'bge' | 'statute' | 'other';
    context?: string;
  }>;
  metadata: {
    legalDomain?: string;
    judges?: string[];
    parties?: string;
    procedureType?: string;
  };
  url?: string;
}

/**
 * Parse the API response into our output format
 */
export function parseDocumentResponse(response: ApiDocumentResponse): DocumentOutput {
  const citations: CitationReference[] | undefined = response.citations?.map((c) => ({
    citation: c.citation,
    type: c.type,
    context: c.context,
  }));

  return {
    id: response.id,
    title: response.title,
    court: response.court,
    date: response.date,
    reference: response.reference,
    language: response.language as Language,
    content: response.content,
    summary: response.summary,
    citations,
    metadata: {
      legalDomain: response.metadata.legalDomain,
      judges: response.metadata.judges,
      parties: response.metadata.parties,
      procedureType: response.metadata.procedureType,
    },
    url: response.url,
  };
}

/**
 * Get a specific document from entscheidsuche.ch API
 */
export async function getDocument(input: GetDocumentInput): Promise<DocumentOutput> {
  const url = buildDocumentUrl(input);

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Entscheidsuche API error: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as ApiDocumentResponse;

  return parseDocumentResponse(data);
}
