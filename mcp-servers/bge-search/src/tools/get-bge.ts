import type {
  GetBGEInput,
  BGEDocumentOutput,
  BGESection,
  Language,
  Consideration,
} from '../types.js';

const BGE_SEARCH_API_BASE = 'https://bger.ch/api/v1';

/**
 * Parse BGE citation into its components
 * Accepts formats: "BGE 145 III 229", "ATF 140 II 315", "DTF 138 I 1"
 */
export function parseCitation(citation: string): {
  volume: number;
  section: BGESection;
  page: number;
} {
  const match = citation.match(/^(?:BGE|ATF|DTF)\s+(\d+)\s+(I|Ia|II|III|IV|V|VI)\s+(\d+)$/);
  if (!match) {
    throw new Error(`Invalid citation format: ${citation}`);
  }

  return {
    volume: parseInt(match[1]!, 10),
    section: match[2] as BGESection,
    page: parseInt(match[3]!, 10),
  };
}

/**
 * Build the BGE document URL with query parameters
 */
export function buildBGEUrl(input: GetBGEInput): string {
  const { volume, section, page } = parseCitation(input.citation);

  const params = new URLSearchParams();
  params.set('includeConsiderations', String(input.includeConsiderations));

  if (input.language !== undefined) {
    params.set('language', input.language);
  }

  return `${BGE_SEARCH_API_BASE}/bge/${volume}/${section}/${page}?${params.toString()}`;
}

/**
 * Raw API response structure for BGE document
 */
interface ApiBGEResponse {
  citation: string;
  volume: number;
  section: string;
  page: number;
  title: string;
  date: string;
  language: string;
  regeste?: string;
  sachverhalt?: string;
  considerations?: Array<{
    number: string;
    title?: string;
    content: string;
  }>;
  dispositiv?: string;
  url?: string;
}

/**
 * Parse the API response into our output format
 */
export function parseBGEResponse(response: ApiBGEResponse): BGEDocumentOutput {
  const considerations: Consideration[] | undefined = response.considerations?.map((c) => ({
    number: c.number,
    title: c.title,
    content: c.content,
  }));

  return {
    citation: response.citation,
    volume: response.volume,
    section: response.section as BGESection,
    page: response.page,
    title: response.title,
    date: response.date,
    language: response.language as Language,
    regeste: response.regeste,
    sachverhalt: response.sachverhalt,
    considerations,
    dispositiv: response.dispositiv,
    url: response.url,
  };
}

/**
 * Get a specific BGE document from API
 */
export async function getBGE(input: GetBGEInput): Promise<BGEDocumentOutput> {
  const url = buildBGEUrl(input);

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`BGE Search API error: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as ApiBGEResponse;

  return parseBGEResponse(data);
}
