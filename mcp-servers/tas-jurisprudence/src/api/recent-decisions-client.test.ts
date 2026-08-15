/**
 * Tests for the new-site (www.tas-cas.org) recent-decisions client.
 *
 * The global `fetch` is stubbed so no real network calls happen; fixture
 * HTML mirrors the page structure verified live on 2026-08-15.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getNewSiteIndex, parseRecentDecisionsHtml } from './recent-decisions-client.js';
import { newSiteCache } from '../infrastructure/cache.js';

const EN_URL = 'https://www.tas-cas.org/en/jurisprudence/recent-decisions';

function htmlResponse(html: string, init: { status?: number; statusText?: string } = {}): Response {
  return new Response(html, {
    status: init.status ?? 200,
    statusText: init.statusText ?? 'OK',
    headers: { 'Content-Type': 'text/html' }
  });
}

/** One award anchor exactly as rendered by the site (backslash hrefs). */
function awardAnchor(pdfPath: string, spanText: string): string {
  return (
    `<a href="${pdfPath}" target="_blank">` +
    `<div class="share-point-quick-link">` +
    `<div class="quick-link-image"><img src="icon.png"/></div>` +
    `<div class="quick-link-text"><span>${spanText}</span></div>` +
    `</div></a>`
  );
}

function makeFetchSpy(handlers: Record<string, (url: string) => Response | Promise<Response>>) {
  const fn = vi.fn(async (input: RequestInfo | URL): Promise<Response> => {
    const url = typeof input === 'string' ? input : input.toString();
    for (const [pattern, handler] of Object.entries(handlers)) {
      if (url.includes(pattern)) {
        return await handler(url);
      }
    }
    throw new Error(`Unhandled fetch URL in test: ${url}`);
  });
  vi.stubGlobal('fetch', fn);
  return fn;
}

beforeEach(() => {
  newSiteCache.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('parseRecentDecisionsHtml', () => {
  it('parses a standard award anchor, resolving backslash hrefs to absolute URLs', () => {
    const html = awardAnchor(
      'generated\\assets\\lists\\abc-guid\\11887.pdf',
      'CAS 2025/A/11887 KSC Lokeren Temse v. FIFA'
    );
    const entries = parseRecentDecisionsHtml(html, EN_URL, 'en');

    expect(entries).toHaveLength(1);
    expect(entries[0]).toEqual({
      caseNumber: '2025/A/11887',
      caseNumberNormalized: 'CAS 2025/A/11887',
      parties: 'KSC Lokeren Temse v. FIFA',
      language: 'en',
      pdfUrl: 'https://www.tas-cas.org/generated/assets/lists/abc-guid/11887.pdf',
      pageUrl: EN_URL
    });
  });

  it('decodes HTML entities in the span text', () => {
    const html = awardAnchor(
      'generated\\assets\\lists\\g\\1234.pdf',
      'CAS 2024/A/1234 Club A &amp; Club B v. FIFA'
    );
    const entries = parseRecentDecisionsHtml(html, EN_URL, 'en');
    expect(entries[0].parties).toBe('Club A & Club B v. FIFA');
  });

  it('handles irregular ADD spacing ("2022/ADD/ 56")', () => {
    const html = awardAnchor(
      'generated\\assets\\lists\\g\\56.pdf',
      'CAS ADD Award 2022/ADD/ 56 International Surfing Association v. Vasco Ribeiro'
    );
    const entries = parseRecentDecisionsHtml(html, 'https://www.tas-cas.org/en/add/jurisprudence', 'en');

    expect(entries).toHaveLength(1);
    expect(entries[0].caseNumber).toBe('2022/ADD/56');
    expect(entries[0].caseNumberNormalized).toBe('CAS 2022/ADD/0056');
    expect(entries[0].parties).toBe('International Surfing Association v. Vasco Ribeiro');
  });

  it('splits compound "&" entries into one entry per case number sharing the PDF', () => {
    const html = awardAnchor(
      'generated\\assets\\lists\\g\\compound.pdf',
      'CAS 2020/ADD/12 Player A v. Federation & 2020/ADD/13 Player B v. Federation'
    );
    const entries = parseRecentDecisionsHtml(html, EN_URL, 'en');

    expect(entries).toHaveLength(2);
    expect(entries.map((e) => e.caseNumber)).toEqual(['2020/ADD/12', '2020/ADD/13']);
    expect(entries[0].pdfUrl).toBe(entries[1].pdfUrl);
    // Parties are taken from the text after the LAST case-number token.
    expect(entries[0].parties).toBe('Player B v. Federation');
    expect(entries[1].parties).toBe('Player B v. Federation');
  });

  it('skips anchors without a recognizable case number and non-PDF links', () => {
    const html =
      awardAnchor('generated\\assets\\lists\\g\\x.pdf', 'Some promotional link') +
      '<a href="/en/jurisprudence"><span>Read more</span></a>' +
      awardAnchor('generated\\assets\\lists\\g\\ok.pdf', 'CAS 2025/A/11887 X v. Y');
    const entries = parseRecentDecisionsHtml(html, EN_URL, 'en');

    expect(entries).toHaveLength(1);
    expect(entries[0].caseNumber).toBe('2025/A/11887');
  });

  it('skips tokens whose case type is not a known CAS procedure', () => {
    const html = awardAnchor(
      'generated\\assets\\lists\\g\\x.pdf',
      'CAS 2025/XYZ/99 Unknown v. Type'
    );
    expect(parseRecentDecisionsHtml(html, EN_URL, 'en')).toEqual([]);
  });

  it('tags entries with the page language (fr/es variants)', () => {
    const html = awardAnchor(
      'generated\\assets\\lists\\g\\100.pdf',
      'TAS 2025/A/100 Club C v. UEFA'
    );
    const entries = parseRecentDecisionsHtml(
      html,
      'https://www.tas-cas.org/fr/jurisprudence/recent-decisions',
      'fr'
    );
    expect(entries[0].language).toBe('fr');
    expect(entries[0].caseNumber).toBe('2025/A/100');
  });

  it('returns null parties when nothing follows the case number', () => {
    const html = awardAnchor('generated\\assets\\lists\\g\\100.pdf', 'CAS 2025/A/100');
    const entries = parseRecentDecisionsHtml(html, EN_URL, 'en');
    expect(entries[0].parties).toBeNull();
  });
});

describe('getNewSiteIndex', () => {
  const EMPTY = '<html><body></body></html>';

  function allPagesHandler(overrides: Record<string, string> = {}) {
    const pages: Record<string, string> = {
      'www.tas-cas.org/en/jurisprudence/recent-decisions': EMPTY,
      'www.tas-cas.org/fr/jurisprudence/recent-decisions': EMPTY,
      'www.tas-cas.org/es/jurisprudence/recent-decisions': EMPTY,
      'www.tas-cas.org/en/add/jurisprudence': EMPTY,
      ...overrides
    };
    const handlers: Record<string, () => Response> = {};
    for (const [pattern, html] of Object.entries(pages)) {
      handlers[pattern] = () => htmlResponse(html);
    }
    return handlers;
  }

  it('merges all four pages and dedupes by normalized case number (en wins)', async () => {
    const fetchSpy = makeFetchSpy(allPagesHandler({
      'www.tas-cas.org/en/jurisprudence/recent-decisions': awardAnchor(
        'generated\\assets\\lists\\g\\11887.pdf', 'CAS 2025/A/11887 Lokeren v. FIFA'),
      'www.tas-cas.org/fr/jurisprudence/recent-decisions': awardAnchor(
        'generated\\assets\\lists\\g\\11887-fr.pdf', 'CAS 2025/A/11887 Lokeren c. FIFA') +
        awardAnchor('generated\\assets\\lists\\g\\200.pdf', 'CAS 2024/A/200 Club D v. UEFA'),
      'www.tas-cas.org/en/add/jurisprudence': awardAnchor(
        'generated\\assets\\lists\\g\\56.pdf', 'CAS ADD Award 2022/ADD/ 56 ISA v. Ribeiro')
    }));

    const index = await getNewSiteIndex();

    expect(index).toHaveLength(3);
    // The duplicate keeps the English entry (en page is fetched first).
    const lokeren = index.find((e) => e.caseNumberNormalized === 'CAS 2025/A/11887')!;
    expect(lokeren.language).toBe('en');
    expect(lokeren.pdfUrl).toContain('11887.pdf');
    expect(fetchSpy).toHaveBeenCalledTimes(4);
  });

  it('caches the merged index (second call does not refetch)', async () => {
    const fetchSpy = makeFetchSpy(allPagesHandler());

    await getNewSiteIndex();
    await getNewSiteIndex();

    expect(fetchSpy).toHaveBeenCalledTimes(4);
  });

  it('keeps the other pages when a single language page fails', async () => {
    makeFetchSpy({
      ...allPagesHandler({
        'www.tas-cas.org/en/jurisprudence/recent-decisions': awardAnchor(
          'generated\\assets\\lists\\g\\11887.pdf', 'CAS 2025/A/11887 Lokeren v. FIFA')
      }),
      'www.tas-cas.org/fr/jurisprudence/recent-decisions': () => {
        throw new Error('fr page down');
      }
    });

    const index = await getNewSiteIndex();

    expect(index.map((e) => e.caseNumberNormalized)).toEqual(['CAS 2025/A/11887']);
  }, 15000);

  it('returns [] and does NOT cache when every page fails (no negative caching)', async () => {
    let down = true;
    const fetchSpy = vi.fn(async (): Promise<Response> => {
      if (down) throw new Error('site down');
      return htmlResponse(
        awardAnchor('generated\\assets\\lists\\g\\11887.pdf', 'CAS 2025/A/11887 Lokeren v. FIFA')
      );
    });
    vi.stubGlobal('fetch', fetchSpy);

    const first = await getNewSiteIndex();
    expect(first).toEqual([]);

    // Site recovers: the next call must refetch instead of serving the
    // cached all-failure result.
    down = false;
    const second = await getNewSiteIndex();
    expect(second).toHaveLength(1);
    expect(second[0].caseNumberNormalized).toBe('CAS 2025/A/11887');
  }, 15000);
});
