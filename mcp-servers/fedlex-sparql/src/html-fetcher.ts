/**
 * Fedlex HTML Fetcher
 *
 * Fetches consolidated legislation HTML from the Fedlex filestore and
 * extracts article text.  The SPARQL endpoint stores only structural
 * metadata (article URIs, subdivision type, modification dates) — the
 * actual text lives in the HTML manifestation produced for each
 * consolidation version.
 *
 * Flow:
 *   SR number
 *     → SPARQL: act URI + latest consolidation + HTML filestore URL
 *     → HTTP GET: download HTML
 *     → regex: extract <article id="art_NNN"> element
 *     → strip tags: return plain text with title
 */

import { SPARQLClient } from './sparql-client.js';
import { withPrefixes } from './queries/prefixes.js';
import { escapeForSPARQL } from './sparql-client.js';
import type { Language } from './types/legislation.js';

// Language code → EU authority URI segment
const LANG_AUTHORITY: Record<string, string> = {
  de: 'DEU',
  fr: 'FRA',
  it: 'ITA',
  rm: 'ROH',
  en: 'ENG',
};

/** Cached HTML keyed by `${actUri}/${consolidationDate}/${lang}` */
const htmlCache = new Map<string, { html: string; fetchedAt: number }>();
const HTML_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

export interface ArticleHtml {
  articleNumber: string;
  title: string;
  textContent: string;
}

export interface ConsolidationInfo {
  actUri: string;
  consolidationUri: string;
  dateApplicability: string;
  htmlUrl: string;
  actTitle?: string;
}

/**
 * Build a SPARQL query to find the HTML filestore URL for the current
 * consolidation of a given SR number in a given language.
 */
function buildHtmlUrlQuery(srNumber: string, language: Language): string {
  const langUri = `http://publications.europa.eu/resource/authority/language/${LANG_AUTHORITY[language] || 'DEU'}`;

  return withPrefixes(`
SELECT ?act ?consolidation ?dateApplicability ?htmlUrl ?actTitle
WHERE {
  ?act a jolux:ConsolidationAbstract ;
       jolux:classifiedByTaxonomyEntry ?taxonomy .
  ?taxonomy skos:notation ?srNumber .
  FILTER(STR(?srNumber) = "${escapeForSPARQL(srNumber)}")

  ?consolidation a jolux:Consolidation ;
                 jolux:isMemberOf ?act ;
                 jolux:dateApplicability ?dateApplicability .
  FILTER(?dateApplicability <= NOW())

  ?consolidation jolux:isRealizedBy ?expr .
  ?expr jolux:language <${langUri}> .
  ?expr jolux:isEmbodiedBy ?htmlManif .
  ?htmlManif jolux:userFormat <https://fedlex.data.admin.ch/vocabulary/user-format/html> ;
             jolux:isExemplifiedBy ?htmlUrl .

  OPTIONAL {
    ?taxonomy skos:prefLabel ?actTitle .
    FILTER(LANG(?actTitle) = "${language}")
  }
}
ORDER BY DESC(?dateApplicability)
LIMIT 1
  `);
}

/**
 * Resolve the consolidation info (act URI, HTML URL, date) for a given
 * SR number via SPARQL.
 */
export async function resolveConsolidation(
  client: SPARQLClient,
  srNumber: string,
  language: Language = 'de',
): Promise<ConsolidationInfo | null> {
  const query = buildHtmlUrlQuery(srNumber, language);
  const result = await client.query(query);
  const bindings = result.results.bindings;

  if (bindings.length === 0) return null;

  const b = bindings[0];
  return {
    actUri: client.extractValue(b.act) || '',
    consolidationUri: client.extractValue(b.consolidation) || '',
    dateApplicability: client.extractValue(b.dateApplicability) || '',
    htmlUrl: client.extractValue(b.htmlUrl) || '',
    actTitle: client.extractValue(b.actTitle),
  };
}

/**
 * Fetch the full HTML of a consolidated act from the Fedlex filestore.
 * Results are cached for 30 minutes.
 */
async function fetchActHtml(htmlUrl: string, cacheKey: string): Promise<string> {
  const cached = htmlCache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < HTML_CACHE_TTL_MS) {
    return cached.html;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30_000);

  try {
    const response = await fetch(htmlUrl, {
      headers: {
        'User-Agent': 'BetterCallClaude/2.0.1 (Swiss Legal Intelligence)',
        Accept: 'text/html',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Fedlex HTML fetch failed: ${response.status} ${response.statusText}`);
    }

    const html = await response.text();
    htmlCache.set(cacheKey, { html, fetchedAt: Date.now() });

    // Evict old entries to avoid unbounded growth
    if (htmlCache.size > 50) {
      const oldest = [...htmlCache.entries()]
        .sort((a, b) => a[1].fetchedAt - b[1].fetchedAt)[0];
      if (oldest) htmlCache.delete(oldest[0]);
    }

    return html;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Strip HTML tags and clean up whitespace, producing readable plain text.
 */
function stripHtml(html: string): string {
  return html
    // Replace <sup>N</sup> with superscript marker
    .replace(/<sup[^>]*>\s*(\d+)\s*<\/sup>/gi, '⁽$1⁾')
    // Replace &nbsp; and other entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    // Remove footnote blocks
    .replace(/<div class="footnotes">[\s\S]*?<\/div>/gi, '')
    // Replace <br> / <br/> with newline
    .replace(/<br\s*\/?>/gi, '\n')
    // Replace block-level elements with newlines
    .replace(/<\/(p|div|dl|dt|dd|li|h[1-6])>/gi, '\n')
    .replace(/<(p|div|dl|dt|dd|li|h[1-6])[^>]*>/gi, '')
    // Remove all remaining tags
    .replace(/<[^>]+>/g, '')
    // Collapse whitespace
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n/g, '\n')
    .trim();
}

/**
 * Extract a single article from the HTML by its article number.
 *
 * The Fedlex consolidated HTML uses `<article id="art_NNN">` elements.
 * Articles with letter suffixes use patterns like `art_407_a`.
 */
function extractArticleFromHtml(
  html: string,
  articleNumber: string,
): ArticleHtml | null {
  // Normalize: "Art. 177" → "177", "97a" → "97a"
  const normalized = articleNumber.replace(/^Art\.?\s*/i, '').trim();

  // Build the article id to search for
  // Standard: art_177, with letter: art_407_a, with bis: art_97a
  const idPatterns = [
    `art_${normalized}`,
    // Handle "97a" → "art_97_a"
    normalized.match(/^(\d+)([a-z])$/i)
      ? `art_${normalized.replace(/^(\d+)([a-z])$/i, '$1_$2')}`
      : null,
  ].filter(Boolean);

  for (const artId of idPatterns) {
    // Match the <article id="art_NNN">...</article> element
    // Use a non-greedy match up to the next </article>
    const regex = new RegExp(
      `<article\\s+id="${artId}"[^>]*>([\\s\\S]*?)</article>`,
      'i',
    );
    const match = html.match(regex);
    if (!match) continue;

    const articleHtml = match[1];

    let title = '';
    const headingHtml = articleHtml.match(/<h6[^>]*>([\s\S]*?)<\/h6>/i);
    if (headingHtml) {
      // Remove everything up to and including the closing </a> that wraps the
      // article number (the first anchor whose href points to the article).
      // Then check for a second anchor that contains the marginal note/title.
      const afterFirstAnchor = headingHtml[1].replace(
        /[\s\S]*?<a[^>]*href="#art_[^"]*"[^>]*>[\s\S]*?<\/a>/i,
        '',
      );
      // Remove footnote <sup> blocks between the number and the title
      const cleaned = afterFirstAnchor
        .replace(/<sup[^>]*>[\s\S]*?<\/sup>/gi, '')
        .replace(/<[^>]+>/g, '')
        .trim();
      // Guard against residual digits from split <b> tags (e.g. "8" from
      // "<b>Art.&nbsp;16</b><b>8</b>") — those are not titles.
      if (cleaned && !/^\d+$/.test(cleaned)) {
        title = cleaned;
      }
    }

    // Extract main text content from collapseable div
    const contentMatch = articleHtml.match(
      /<div class="collapseable">([\s\S]*?)(?:<div class="footnotes">|<\/div>\s*$)/i,
    );
    const contentHtml = contentMatch ? contentMatch[1] : articleHtml;
    const textContent = stripHtml(contentHtml);

    return {
      articleNumber: normalized,
      title,
      textContent,
    };
  }

  return null;
}

/**
 * Fetch and extract article text from the Fedlex HTML manifestation.
 *
 * This is the primary method for getting article text — the SPARQL
 * endpoint does not store article-level text.
 */
export async function fetchArticleText(
  client: SPARQLClient,
  srNumber: string,
  articleNumber: string,
  language: Language = 'de',
): Promise<{
  found: boolean;
  consolidation?: ConsolidationInfo;
  article?: ArticleHtml;
  fedlexUrl?: string;
}> {
  // 1. Resolve consolidation info via SPARQL
  const info = await resolveConsolidation(client, srNumber, language);
  if (!info) {
    return { found: false };
  }

  // 2. Fetch the HTML
  const cacheKey = `${info.consolidationUri}/${language}`;
  const html = await fetchActHtml(info.htmlUrl, cacheKey);

  // 3. Extract the article
  const article = extractArticleFromHtml(html, articleNumber);

  // 4. Build the human-readable Fedlex URL
  // e.g. https://www.fedlex.admin.ch/eli/cc/2010/262/de#art_177
  const eliPath = info.actUri.replace('https://fedlex.data.admin.ch/', '');
  const artAnchor = `art_${articleNumber.replace(/^Art\.?\s*/i, '').trim()}`;
  const fedlexUrl = `https://www.fedlex.admin.ch/${eliPath}/${language}#${artAnchor}`;

  if (!article) {
    return { found: false, consolidation: info, fedlexUrl };
  }

  return {
    found: true,
    consolidation: info,
    article,
    fedlexUrl,
  };
}
