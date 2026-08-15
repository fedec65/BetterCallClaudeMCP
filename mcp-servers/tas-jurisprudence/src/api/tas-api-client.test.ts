/**
 * Tests for the JSON API client used by tas-jurisprudence.
 *
 * The global `fetch` is stubbed so no real network calls happen.
 * The rate limiter is disabled by `vitest.setup.ts` (interval=0) so
 * consecutive calls don't serialize.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  searchCasDecisions,
  getAwardDetails,
  getRecentDecisions,
  __resetCachesForTest
} from './tas-api-client.js';
import { awardCache, recentCache, searchCache, sportCache, newSiteCache } from '../infrastructure/cache.js';

// Helper: build a Response-like object for the mocked fetch.
function jsonResponse(body: unknown, init: { status?: number; statusText?: string } = {}): Response {
  const status = init.status ?? 200;
  return new Response(JSON.stringify(body), {
    status,
    statusText: init.statusText ?? 'OK',
    headers: { 'Content-Type': 'application/json' }
  });
}

function htmlResponse(html: string): Response {
  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html' }
  });
}

/**
 * Empty-page handlers for the new-site (www.tas-cas.org) index so tests
 * that don't exercise the scraper stay hermetic and fast.
 */
const EMPTY_NEW_SITE_HANDLERS = {
  'www.tas-cas.org/en/jurisprudence/recent-decisions': () => htmlResponse('<html><body></body></html>'),
  'www.tas-cas.org/fr/jurisprudence/recent-decisions': () => htmlResponse('<html><body></body></html>'),
  'www.tas-cas.org/es/jurisprudence/recent-decisions': () => htmlResponse('<html><body></body></html>'),
  'www.tas-cas.org/en/add/jurisprudence': () => htmlResponse('<html><body></body></html>')
};

/** One new-site award anchor (backslash hrefs, as rendered live). */
function newSiteAnchor(pdfPath: string, spanText: string): string {
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

function sampleSearchItem(overrides: Partial<{
  guid: string;
  title: string;
  procedure: string;
  decisionDate: string;
  appellants: string;
  respondents: string;
  sportEn: string;
  sportFr: string;
  outcome: string;
}> = {}) {
  // 'in' check so callers can override to null/empty and force falsy mapping.
  return {
    guid: overrides.guid ?? 'g-1',
    title: overrides.title ?? '2023/A/10168',
    procedure: overrides.procedure ?? 'A',
    decisionDate: overrides.decisionDate ?? '2024-02-15T00:00:00',
    appellants: overrides.appellants ?? 'Olympiacos FC',
    respondents: overrides.respondents ?? 'FIFA',
    sportEn: 'sportEn' in overrides ? overrides.sportEn : 'Football',
    sportFr: 'sportFr' in overrides ? overrides.sportFr : 'Football',
    outcome: overrides.outcome ?? 'Appeal dismissed'
  };
}

function sampleDetail(overrides: Record<string, unknown> = {}) {
  return {
    guid: 'g-1',
    fileName: '10168.pdf',
    title: '2023/A/10168',
    decisionDate: '2024-02-15T00:00:00',
    language: { isoCode: 'en' },
    caseLawProcedure: { abreviation: 'A', nameEn: 'Appeal' },
    sport: { nameEn: 'Football' },
    matter: { nameEn: 'Disciplinary' },
    outcome: { decision: 'Appeal dismissed' },
    year: 2023,
    appellants: ['Olympiacos FC'],
    respondents: ['FIFA'],
    arbitrators: [
      { name: 'Jane Doe', role: 'President', countryName: 'Switzerland' },
      { name: 'John Roe', role: 'Arbitrator 1', countryName: 'Italy' }
    ],
    keywords: [{ nameEn: 'Match fixing', nameFr: 'Manipulation de matchs' }],
    ...overrides
  };
}

beforeEach(() => {
  __resetCachesForTest();
  searchCache.clear();
  awardCache.clear();
  recentCache.clear();
  sportCache.clear();
  newSiteCache.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('searchCasDecisions', () => {
  it('maps a basic search item, keeps reps out of parties, builds pdf from title', async () => {
    makeFetchSpy({
      '/CaseLawDocument/SearchCaseLawDocument': () =>
        jsonResponse({
          currentPage: 1, totalPages: 1, pageSize: 10, totalCount: 1,
          hasPrevious: false, hasNext: false,
          items: [sampleSearchItem({
            appellantsRep: null,
            // site sends these fields too; we must NOT include them in parties.
            appellants: 'Olympiacos FC',
            respondents: 'FIFA'
          })]
        })
    });

    const result = await searchCasDecisions({
      query: 'Olympiacos',
      page: 1,
      page_size: 10
    });

    expect(result.results).toHaveLength(1);
    const r = result.results[0];
    expect(r.case_number).toBe('2023/A/10168');
    expect(r.case_number_normalized).toBe('CAS 2023/A/10168');
    expect(r.title).toBe('Olympiacos FC v. FIFA');
    expect(r.parties.appellant).toBe('Olympiacos FC');
    expect(r.parties.respondent).toBe('FIFA');
    expect(r.pdf_url).toBe('https://jurisprudence.tas-cas.org/pdf/10168.pdf');
    expect(r.snippet).toBe('Outcome: Appeal dismissed');
    expect(r.procedure_type).toBe('Appeal');
    // Offset-less API dates must keep their calendar day (no TZ shift).
    expect(r.date).toBe('2024-02-15');
  });

  it('omits Content for the wildcard "*" query', async () => {
    const fetchSpy = makeFetchSpy({
      '/Sport/Search': () =>
        jsonResponse({ items: [{ guid: 'sport-1', nameEn: 'Football', nameFr: 'Football' }] }),
      '/CaseLawDocument/SearchCaseLawDocument': () =>
        jsonResponse({
          currentPage: 1, totalPages: 1, pageSize: 25, totalCount: 0,
          hasPrevious: false, hasNext: false, items: []
        })
    });

    await searchCasDecisions({
      query: '*',
      sport: 'Football',
      page: 1,
      page_size: 10
    });

    const searchCall = fetchSpy.mock.calls.find((c) =>
      String(c[0]).includes('/CaseLawDocument/SearchCaseLawDocument')
    );
    expect(searchCall).toBeDefined();
    const calledUrl = String(searchCall![0]);
    expect(calledUrl).not.toContain('Content=');
    expect(calledUrl).toContain('/CaseLawDocument/SearchCaseLawDocument');
  });

  it('maps year range and procedure filter to Start/EndDecisionDate + Procedures guid', async () => {
    const fetchSpy = makeFetchSpy({
      '/SearchCaseLawDocument': () =>
        jsonResponse({
          currentPage: 1, totalPages: 1, pageSize: 10, totalCount: 0,
          hasPrevious: false, hasNext: false, items: []
        }),
      '/AllCaseLawProcedures': () =>
        jsonResponse([{ abreviation: 'A', guid: 'guid-A' }]),
      '/Sport/Search': () => jsonResponse({ items: [] })
    });

    await searchCasDecisions({
      query: 'foo',
      procedure_type: 'Appeal',
      year_from: 2020,
      year_to: 2024,
      page: 1,
      page_size: 10
    });

    const searchCall = fetchSpy.mock.calls.find((c) =>
      String(c[0]).includes('/CaseLawDocument/SearchCaseLawDocument')
    );
    const url = String(searchCall![0]);
    expect(url).toContain('StartDecisionDate=2020-01-01');
    expect(url).toContain('EndDecisionDate=2024-12-31');
    expect(url).toContain('Procedures=');
  });

  it('maps a compound case number title to a first-number pdf url', async () => {
    makeFetchSpy({
      '/SearchCaseLawDocument': () =>
        jsonResponse({
          currentPage: 1, totalPages: 1, pageSize: 10, totalCount: 1,
          hasPrevious: false, hasNext: false,
          items: [sampleSearchItem({
            title: '2020/A/7019 & 7035',
            guid: 'g-2'
          })]
        })
    });

    const result = await searchCasDecisions({
      query: 'compound', page: 1, page_size: 10
    });

    expect(result.results).toHaveLength(1);
    expect(result.results[0].pdf_url).toBe('https://jurisprudence.tas-cas.org/pdf/7019.pdf');
  });

  it('returns null sport/procedure for missing data', async () => {
    makeFetchSpy({
      '/SearchCaseLawDocument': () =>
        jsonResponse({
          currentPage: 1, totalPages: 1, pageSize: 10, totalCount: 1,
          hasPrevious: false, hasNext: false,
          items: [sampleSearchItem({
            sportEn: null,
            sportFr: null,
            procedure: 'AUS'
          })]
        })
    });

    const result = await searchCasDecisions({
      query: 'foo', page: 1, page_size: 10
    });
    expect(result.results[0].sport).toBeNull();
    expect(result.results[0].procedure_type).toBeNull();
  });

  it('returns an empty result (no search fetch) when the sport cannot be resolved', async () => {
    const fetchSpy = makeFetchSpy({
      '/Sport/Search': () => jsonResponse({ items: [] }),
      '/CaseLawDocument/SearchCaseLawDocument': () => {
        throw new Error('search must not be called when the sport is unresolved');
      }
    });

    const result = await searchCasDecisions({
      query: '*', sport: 'Underwater Basket Weaving', page: 1, page_size: 10
    });

    expect(result.results).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.filters_applied.sport).toBe('Underwater Basket Weaving');
    expect(
      fetchSpy.mock.calls.some((c) => String(c[0]).includes('/CaseLawDocument/SearchCaseLawDocument'))
    ).toBe(false);
  });

  it('returns an empty result (no search fetch) when the procedure GUID is unknown', async () => {
    const fetchSpy = makeFetchSpy({
      '/AllCaseLawProcedures': () => jsonResponse([]),
      '/CaseLawDocument/SearchCaseLawDocument': () => {
        throw new Error('search must not be called when the procedure is unresolved');
      }
    });

    const result = await searchCasDecisions({
      query: 'foo', procedure_type: 'Appeal', page: 1, page_size: 10
    });

    expect(result.results).toEqual([]);
    expect(result.total).toBe(0);
    expect(
      fetchSpy.mock.calls.some((c) => String(c[0]).includes('/CaseLawDocument/SearchCaseLawDocument'))
    ).toBe(false);
  });
});

describe('getAwardDetails', () => {
  it('maps arbitrators (President vs Arbitrator 1/2) and keywords with nameFr fallback', async () => {
    makeFetchSpy({
      '/SearchCaseLawDocument': () =>
        jsonResponse({
          currentPage: 1, totalPages: 1, pageSize: 25, totalCount: 1,
          hasPrevious: false, hasNext: false,
          items: [{ ...sampleSearchItem(), guid: 'g-1' }]
        }),
      '/CaseLawDocument/g-1': () => jsonResponse(sampleDetail({
        keywords: [
          { nameEn: null, nameFr: 'Only French keyword' }
        ]
      }))
    });

    const result = await getAwardDetails('CAS 2023/A/10168');
    expect(result.found).toBe(true);
    const award = result.award!;
    expect(award.arbitrators).toEqual([
      { name: 'Jane Doe', role: 'President', nationality: 'Switzerland' },
      { name: 'John Roe', role: 'Arbitrator', nationality: 'Italy' }
    ]);
    expect(award.keywords).toEqual(['Only French keyword']);
    expect(award.pdf_url).toBe('https://jurisprudence.tas-cas.org/pdf/10168.pdf');
    expect(award.parties.appellant).toBe('Olympiacos FC');
    expect(award.parties.respondent).toBe('FIFA');
  });

  it('returns not-found when no exact-title match exists', async () => {
    makeFetchSpy({
      ...EMPTY_NEW_SITE_HANDLERS,
      '/SearchCaseLawDocument': () =>
        jsonResponse({
          currentPage: 1, totalPages: 1, pageSize: 25, totalCount: 0,
          hasPrevious: false, hasNext: false, items: []
        })
    });

    const result = await getAwardDetails('CAS 2099/A/1');
    expect(result.found).toBe(false);
    expect(result.error).toBe('Case not found');
  });

  it('uses the guid from a details=... URL directly', async () => {
    let detailCalled = false;
    makeFetchSpy({
      '/CaseLawDocument/g-from-url': () => {
        detailCalled = true;
        return jsonResponse(sampleDetail({ guid: 'g-from-url', fileName: '10168.pdf' }));
      },
      '/SearchCaseLawDocument': () => {
        throw new Error('should not be called when guid is in the URL');
      }
    });

    const result = await getAwardDetails(
      undefined,
      'https://jurisprudence.tas-cas.org/search?q=test&details=g-from-url'
    );
    expect(result.found).toBe(true);
    expect(detailCalled).toBe(true);
    expect(result.award?.pdf_url).toBe('https://jurisprudence.tas-cas.org/pdf/10168.pdf');
  });

  it('looks up by case number stripping the CAS prefix the site does not use', async () => {
    const fetchSpy = makeFetchSpy({
      '/SearchCaseLawDocument': () =>
        jsonResponse({
          currentPage: 1, totalPages: 1, pageSize: 25, totalCount: 1,
          hasPrevious: false, hasNext: false,
          items: [{ ...sampleSearchItem(), title: '2023/A/10168', guid: 'g-1' }]
        }),
      '/CaseLawDocument/g-1': () => jsonResponse(sampleDetail({ guid: 'g-1' }))
    });

    const result = await getAwardDetails('CAS 2023/A/10168');

    expect(result.found).toBe(true);
    const lookupUrl = String(
      fetchSpy.mock.calls.find((c) => String(c[0]).includes('/SearchCaseLawDocument'))![0]
    );
    // Site titles have no "CAS " prefix — the query must send the bare number.
    expect(lookupUrl).toContain('Content=2023%2FA%2F10168');
    expect(lookupUrl).not.toContain('CAS');
  });

  it('matches short case numbers without the zero-padding normalization adds', async () => {
    const fetchSpy = makeFetchSpy({
      '/SearchCaseLawDocument': () =>
        jsonResponse({
          currentPage: 1, totalPages: 1, pageSize: 25, totalCount: 1,
          hasPrevious: false, hasNext: false,
          items: [{ ...sampleSearchItem(), title: '2023/ADD/62', guid: 'g-62' }]
        }),
      '/CaseLawDocument/g-62': () => jsonResponse(sampleDetail({ guid: 'g-62', fileName: '62.pdf' }))
    });

    // Normalizes to "CAS 2023/ADD/0062" internally; site title is unpadded.
    const result = await getAwardDetails('CAS 2023/ADD/62');

    expect(result.found).toBe(true);
    const lookupUrl = String(
      fetchSpy.mock.calls.find((c) => String(c[0]).includes('/SearchCaseLawDocument'))![0]
    );
    expect(lookupUrl).toContain('Content=2023%2FADD%2F62');
    expect(result.award!.pdf_url).toBe('https://jurisprudence.tas-cas.org/pdf/62.pdf');
  });

  it('rejects invalid case_number input with a clear error', async () => {
    const result = await getAwardDetails('not a case number');
    expect(result.found).toBe(false);
    expect(result.error).toMatch(/Invalid case number format/);
  });
});

describe('getRecentDecisions', () => {
  it('returns mapped decisions with pdf and source url', async () => {
    makeFetchSpy({
      ...EMPTY_NEW_SITE_HANDLERS,
      '/SearchCaseLawDocument': () =>
        jsonResponse({
          currentPage: 1, totalPages: 1, pageSize: 5, totalCount: 5,
          hasPrevious: false, hasNext: false,
          items: [
            sampleSearchItem({ guid: 'g-1', title: '2023/A/10168' }),
            sampleSearchItem({ guid: 'g-2', title: '2022/A/9328 & 9329' })
          ]
        })
    });

    const result = await getRecentDecisions(5);
    expect(result.source).toBe('jurisprudence.tas-cas.org');
    expect(result.decisions).toHaveLength(2);
    expect(result.decisions[0].pdf_url).toBe('https://jurisprudence.tas-cas.org/pdf/10168.pdf');
    expect(result.decisions[1].pdf_url).toBe('https://jurisprudence.tas-cas.org/pdf/9328.pdf');
    expect(result.decisions[0].source_url).toContain('details=g-1');
  });

  it('titles recent decisions with the parties when available', async () => {
    makeFetchSpy({
      ...EMPTY_NEW_SITE_HANDLERS,
      '/SearchCaseLawDocument': () =>
        jsonResponse({
          currentPage: 1, totalPages: 1, pageSize: 5, totalCount: 2,
          hasPrevious: false, hasNext: false,
          items: [
            sampleSearchItem({
              guid: 'g-1',
              title: '2023/A/10168',
              appellants: 'Olympiacos FC',
              respondents: 'FIFA'
            }),
            sampleSearchItem({ guid: 'g-2', title: '2022/A/9328', appellants: '', respondents: '' })
          ]
        })
    });

    const result = await getRecentDecisions(5);

    expect(result.decisions[0].title).toBe('Olympiacos FC v. FIFA');
    expect(result.decisions[0].case_number).toBe('2023/A/10168');
    // No parties: fall back to a descriptive title instead of the bare number.
    expect(result.decisions[1].title).toBe('CAS Decision CAS 2022/A/9328');
    // Calendar day preserved, not shifted by TZ conversion.
    expect(result.decisions[0].date).toBe('2024-02-15');
  });

  it('returns empty list with error source on upstream failure', async () => {
    makeFetchSpy({
      ...EMPTY_NEW_SITE_HANDLERS,
      '/SearchCaseLawDocument': () => new Response('boom', { status: 500, statusText: 'Server Error' })
    });
    const result = await getRecentDecisions(5);
    expect(result.decisions).toEqual([]);
    expect(result.source).toMatch(/^error:/);
  });

  it('requests decision-date desc ordering from the API (#45)', async () => {
    const fetchSpy = makeFetchSpy({
      ...EMPTY_NEW_SITE_HANDLERS,
      '/SearchCaseLawDocument': () =>
        jsonResponse({
          currentPage: 1, totalPages: 1, pageSize: 5, totalCount: 2,
          hasPrevious: false, hasNext: false,
          items: [
            sampleSearchItem({ guid: 'g-1', title: '2023/A/9757', decisionDate: '2024-04-02T00:00:00' }),
            sampleSearchItem({ guid: 'g-2', title: '2023/A/10168', decisionDate: '2024-02-29T00:00:00' })
          ]
        })
    });

    const result = await getRecentDecisions(5);

    const requestedUrl = String(fetchSpy.mock.calls[0][0]);
    expect(requestedUrl).toContain('OrderByColumn=DecisionDate');
    expect(requestedUrl).toContain('OrderByDirection=desc');
    // Decisions come back in date-desc order.
    expect(result.decisions[0].date >= result.decisions[1].date).toBe(true);
  });
});

describe('resilience', () => {
  it('does NOT retry on 4xx upstream responses', async () => {
    const fetchSpy = vi.fn(async () =>
      new Response('Content field is required', { status: 400, statusText: 'Bad Request' })
    );
    vi.stubGlobal('fetch', fetchSpy);

    await expect(searchCasDecisions({ query: 'foo', page: 1, page_size: 1 })).rejects.toThrow();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('retries on 5xx and eventually throws with the upstream body excerpt', async () => {
    const fetchSpy = vi.fn(async () =>
      new Response('upstream exploded', { status: 502, statusText: 'Bad Gateway' })
    );
    vi.stubGlobal('fetch', fetchSpy);

    await expect(searchCasDecisions({ query: 'foo', page: 1, page_size: 1 }))
      .rejects.toThrow(/upstream exploded/);
    expect(fetchSpy.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(fetchSpy.mock.calls.length).toBeLessThanOrEqual(3);
  });

  it('sanitizes HTML upstream error bodies before echoing them to the client', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(
          '<html>\r\n<head><title>Upstream Oops</title></head>\r\n<body>Internal stack trace...</body>\r\n</html>',
          { status: 500, statusText: 'Internal Server Error' }
        )
      )
    );

    const assertion = await searchCasDecisions({ query: 'foo', page: 1, page_size: 1 }).then(
      () => null,
      (err: unknown) => err as Error
    );
    expect(assertion).toBeInstanceOf(Error);
    const msg = assertion!.message;
    expect(msg).toContain('Upstream Oops');
    // No raw HTML, no stack-trace body, single short line.
    expect(msg).not.toContain('<');
    expect(msg).not.toContain('Internal stack trace');
    expect(msg.split('\n')).toHaveLength(1);
    expect(msg.length).toBeLessThan(200);
  });
});

describe('referential caching', () => {
  it('fetches the procedure map once across calls', async () => {
    let procedureCalls = 0;
    makeFetchSpy({
      '/AllCaseLawProcedures': () => {
        procedureCalls++;
        return jsonResponse([{ abreviation: 'A', guid: 'guid-A' }]);
      },
      '/Sport/Search': () => jsonResponse({ items: [] }),
      '/SearchCaseLawDocument': () =>
        jsonResponse({
          currentPage: 1, totalPages: 1, pageSize: 10, totalCount: 0,
          hasPrevious: false, hasNext: false, items: []
        })
    });

    await searchCasDecisions({ query: 'foo', procedure_type: 'Appeal', page: 1, page_size: 10 });
    await searchCasDecisions({ query: 'bar', procedure_type: 'Appeal', page: 1, page_size: 10 });

    expect(procedureCalls).toBe(1);
  });

  it('resolves each sport name with one call to /Sport/Search', async () => {
    let sportCalls = 0;
    makeFetchSpy({
      '/Sport/Search': () => {
        sportCalls++;
        return jsonResponse({ items: [{ guid: 'sport-1', nameEn: 'Football', nameFr: 'Football' }] });
      },
      '/SearchCaseLawDocument': () =>
        jsonResponse({
          currentPage: 1, totalPages: 1, pageSize: 10, totalCount: 0,
          hasPrevious: false, hasNext: false, items: []
        })
    });

    await searchCasDecisions({ query: '*', sport: 'Football', page: 1, page_size: 10 });
    await searchCasDecisions({ query: '*', sport: 'Football', page: 1, page_size: 10 });
    await searchCasDecisions({ query: '*', sport: 'FOOTBALL', page: 1, page_size: 10 });

    expect(sportCalls).toBe(1);
  });
});

describe('new-site (www.tas-cas.org) integration', () => {
  const NEW_SITE_EN_PAGE = newSiteAnchor(
    'generated\\assets\\lists\\abc-guid\\11887.pdf',
    'CAS 2025/A/11887 KSC Lokeren Temse v. FIFA'
  );

  function newSiteHandlers(enHtml: string) {
    return {
      ...EMPTY_NEW_SITE_HANDLERS,
      'www.tas-cas.org/en/jurisprudence/recent-decisions': () => htmlResponse(enHtml)
    };
  }

  describe('getRecentDecisions merge', () => {
    it('unions API items with disjoint new-site items and excludes duplicates', async () => {
      makeFetchSpy({
        ...newSiteHandlers(
          NEW_SITE_EN_PAGE +
          // Same normalized number as the API item: API record must win.
          newSiteAnchor('generated\\assets\\lists\\g\\10168.pdf', 'CAS 2023/A/10168 Dup v. FIFA')
        ),
        '/SearchCaseLawDocument': () =>
          jsonResponse({
            currentPage: 1, totalPages: 1, pageSize: 10, totalCount: 1,
            hasPrevious: false, hasNext: false,
            items: [sampleSearchItem({ guid: 'g-1', title: '2023/A/10168', decisionDate: '2024-02-15T00:00:00' })]
          })
      });

      const result = await getRecentDecisions(10);

      expect(result.decisions).toHaveLength(2);
      // Undated new-site item sorts by its case year (2025-12-31 heuristic),
      // ahead of the API item dated 2024-02-15.
      expect(result.decisions[0].case_number_normalized).toBe('CAS 2025/A/11887');
      expect(result.decisions[0].date).toBe('');
      expect(result.decisions[0].sport).toBeNull();
      expect(result.decisions[0].title).toBe('KSC Lokeren Temse v. FIFA');
      expect(result.decisions[0].pdf_url)
        .toBe('https://www.tas-cas.org/generated/assets/lists/abc-guid/11887.pdf');
      expect(result.decisions[0].source_url)
        .toBe('https://www.tas-cas.org/en/jurisprudence/recent-decisions');
      // Duplicate excluded: the API record is kept, with its real metadata.
      expect(result.decisions[1].case_number).toBe('2023/A/10168');
      expect(result.decisions[1].date).toBe('2024-02-15');
    });

    it('slices the merged list to the requested limit', async () => {
      makeFetchSpy({
        ...newSiteHandlers(NEW_SITE_EN_PAGE),
        '/SearchCaseLawDocument': () =>
          jsonResponse({
            currentPage: 1, totalPages: 1, pageSize: 1, totalCount: 1,
            hasPrevious: false, hasNext: false,
            items: [sampleSearchItem({ guid: 'g-1', title: '2023/A/10168' })]
          })
      });

      const result = await getRecentDecisions(1);
      expect(result.decisions).toHaveLength(1);
      expect(result.decisions[0].case_number_normalized).toBe('CAS 2025/A/11887');
    });

    it('still returns API results when all new-site pages fail', async () => {
      makeFetchSpy({
        'www.tas-cas.org': () => {
          throw new Error('new site down');
        },
        '/SearchCaseLawDocument': () =>
          jsonResponse({
            currentPage: 1, totalPages: 1, pageSize: 10, totalCount: 1,
            hasPrevious: false, hasNext: false,
            items: [sampleSearchItem({ guid: 'g-1', title: '2023/A/10168' })]
          })
      });

      const result = await getRecentDecisions(10);
      expect(result.decisions).toHaveLength(1);
      expect(result.decisions[0].case_number).toBe('2023/A/10168');
    }, 15000);
  });

  describe('getAwardDetails fallback', () => {
    it('resolves uncategorized awards from the new-site index with pdf_url', async () => {
      makeFetchSpy({
        ...newSiteHandlers(NEW_SITE_EN_PAGE),
        '/SearchCaseLawDocument': () =>
          jsonResponse({
            currentPage: 1, totalPages: 1, pageSize: 25, totalCount: 0,
            hasPrevious: false, hasNext: false, items: []
          })
      });

      const result = await getAwardDetails('CAS 2025/A/11887');

      expect(result.found).toBe(true);
      const award = result.award!;
      expect(award.case_number_normalized).toBe('CAS 2025/A/11887');
      expect(award.pdf_url)
        .toBe('https://www.tas-cas.org/generated/assets/lists/abc-guid/11887.pdf');
      expect(award.source_url).toBe('https://www.tas-cas.org/en/jurisprudence/recent-decisions');
      // No fabricated metadata for uncategorized awards.
      expect(award.date).toBe('');
      expect(award.sport).toBeNull();
      expect(award.arbitrators).toEqual([]);
      expect(award.keywords).toEqual([]);
      expect(award.summary).toBeNull();
    });

    it('returns not-found when the case is in neither the API nor the new-site index', async () => {
      makeFetchSpy({
        ...newSiteHandlers(NEW_SITE_EN_PAGE),
        '/SearchCaseLawDocument': () =>
          jsonResponse({
            currentPage: 1, totalPages: 1, pageSize: 25, totalCount: 0,
            hasPrevious: false, hasNext: false, items: []
          })
      });

      const result = await getAwardDetails('CAS 2099/A/1');
      expect(result.found).toBe(false);
      expect(result.error).toBe('Case not found');
    });
  });

  describe('searchCasDecisions fallback', () => {
    it('matches the new-site index when an unfiltered query has zero API hits', async () => {
      makeFetchSpy({
        ...newSiteHandlers(NEW_SITE_EN_PAGE),
        '/SearchCaseLawDocument': () =>
          jsonResponse({
            currentPage: 1, totalPages: 1, pageSize: 10, totalCount: 0,
            hasPrevious: false, hasNext: false, items: []
          })
      });

      const result = await searchCasDecisions({ query: 'Lokeren', page: 1, page_size: 10 });

      expect(result.total).toBe(1);
      expect(result.results).toHaveLength(1);
      const r = result.results[0];
      expect(r.case_number_normalized).toBe('CAS 2025/A/11887');
      expect(r.pdf_url)
        .toBe('https://www.tas-cas.org/generated/assets/lists/abc-guid/11887.pdf');
      expect(r.url).toBe('https://www.tas-cas.org/en/jurisprudence/recent-decisions');
      expect(r.sport).toBeNull();
      expect(r.date).toBe('');
    });

    it('never falls back for sport-filtered queries (no silent widening)', async () => {
      const fetchSpy = makeFetchSpy({
        '/Sport/Search': () =>
          jsonResponse({ items: [{ guid: 'sport-1', nameEn: 'Football', nameFr: 'Football' }] }),
        '/SearchCaseLawDocument': () =>
          jsonResponse({
            currentPage: 1, totalPages: 1, pageSize: 10, totalCount: 0,
            hasPrevious: false, hasNext: false, items: []
          }),
        'www.tas-cas.org': () => {
          throw new Error('new-site index must not be fetched for filtered queries');
        }
      });

      const result = await searchCasDecisions({
        query: 'Lokeren', sport: 'Football', page: 1, page_size: 10
      });

      expect(result.results).toEqual([]);
      expect(result.total).toBe(0);
      expect(
        fetchSpy.mock.calls.some((c) => String(c[0]).includes('www.tas-cas.org'))
      ).toBe(false);
    });

    it('never falls back for procedure-filtered queries', async () => {
      const fetchSpy = makeFetchSpy({
        '/AllCaseLawProcedures': () =>
          jsonResponse([{ abreviation: 'A', guid: 'guid-A' }]),
        '/SearchCaseLawDocument': () =>
          jsonResponse({
            currentPage: 1, totalPages: 1, pageSize: 10, totalCount: 0,
            hasPrevious: false, hasNext: false, items: []
          }),
        'www.tas-cas.org': () => {
          throw new Error('new-site index must not be fetched for filtered queries');
        }
      });

      const result = await searchCasDecisions({
        query: 'Lokeren', procedure_type: 'Appeal', page: 1, page_size: 10
      });

      expect(result.results).toEqual([]);
      expect(
        fetchSpy.mock.calls.some((c) => String(c[0]).includes('www.tas-cas.org'))
      ).toBe(false);
    });
  });
});
