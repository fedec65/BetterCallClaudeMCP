/**
 * W1 — Jurisprudence Browser Widget
 *
 * Interactive search results browser for bge-search and entscheidsuche.
 * Communicates with host via MCP Apps bridge (JSON-RPC postMessage).
 */

import { t, detectLang, type Lang } from '../../i18n/messages';

// --- Types ---

interface Decision {
  decisionId: string;
  title: string;
  summary?: string;
  decisionDate: string;
  court?: string;
  chamber?: string;
  canton?: string;
  language?: string;
  legalAreas?: string[];
  bgeReference?: string;
  fullText?: string;
  url?: string;
  courtLevel?: string;
}

interface SearchData {
  decisions: Decision[];
  totalResults: number;
  searchTimeMs: number;
  facets?: {
    byCourtLevel?: Record<string, number>;
    byCanton?: Record<string, number>;
  };
}

interface WidgetState {
  lang: Lang;
  data: SearchData | null;
  view: 'list' | 'detail';
  selectedDecision: Decision | null;
  detailLoading: boolean;
  serverType: 'bge-search' | 'entscheidsuche';
  currentQuery?: string;
}

// --- Globals ---

const state: WidgetState = {
  lang: 'de',
  data: null,
  view: 'list',
  selectedDecision: null,
  detailLoading: false,
  serverType: 'bge-search',
};

const app = document.getElementById('app')!;

// --- MCP Apps Bridge ---

function callTool(name: string, args: Record<string, unknown>): void {
  window.parent.postMessage({
    jsonrpc: '2.0',
    method: 'tools/call',
    params: { name, arguments: args },
    id: `bcc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  }, '*');
}

function sendToModel(text: string): void {
  window.parent.postMessage({
    jsonrpc: '2.0',
    method: 'ui/updateModelContext',
    params: { context: [{ type: 'text', text }] },
    id: `bcc-ctx-${Date.now()}`,
  }, '*');
}

// --- Listen for host messages ---

window.addEventListener('message', (event) => {
  const msg = event.data;
  if (!msg || typeof msg !== 'object') return;

  // Initial tool result data
  if (msg.type === 'tool-result' || msg.method === 'notifications/tools/result') {
    handleToolResult(msg.params ?? msg.data ?? msg.result);
  }
  // Tool input with initial data
  if (msg.method === 'notifications/tools/input') {
    handleToolInput(msg.params);
  }
  // Theme signal from host
  if (msg.method === 'notifications/context/changed' || msg.type === 'context-changed') {
    const ctx = msg.params?.context ?? msg.data;
    if (ctx?.theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else if (ctx?.theme === 'light') {
      document.documentElement.removeAttribute('data-theme');
    }
  }
});

function handleToolInput(params: Record<string, unknown> | undefined): void {
  if (!params) return;
  const args = (params.arguments ?? params.input ?? params) as Record<string, unknown>;
  if (args.language) state.lang = detectLang(args.language as string);
  if (args.query) state.currentQuery = args.query as string;
  if (args._serverType) state.serverType = args._serverType as 'bge-search' | 'entscheidsuche';
}

function handleToolResult(data: unknown): void {
  if (!data || typeof data !== 'object') return;

  const result = data as Record<string, unknown>;

  // Tool call result wrapper
  const content = result.content as Array<{ type: string; text?: string }> | undefined;
  if (content && Array.isArray(content)) {
    const textItem = content.find((c) => c.type === 'text' && c.text);
    if (textItem?.text) {
      try {
        handleToolResult(JSON.parse(textItem.text));
      } catch { /* ignore parse errors */ }
      return;
    }
  }

  // Decision detail response
  if ('found' in result && 'decision' in result) {
    if (result.found && result.decision) {
      state.selectedDecision = result.decision as Decision;
      state.detailLoading = false;
      state.view = 'detail';
      render();
    }
    return;
  }

  // Search results
  if ('decisions' in result && Array.isArray(result.decisions)) {
    state.data = result as unknown as SearchData;
    state.view = 'list';
    render();
  }
}

// --- Rendering ---

function render(): void {
  if (state.view === 'detail' && state.selectedDecision) {
    renderDetail();
  } else if (state.data) {
    renderList();
  } else {
    app.innerHTML = `<div class="bcc-loading">${t('detail.loading', state.lang)}</div>`;
  }
}

function renderList(): void {
  const data = state.data!;
  const lang = state.lang;
  const showCanton = state.serverType === 'entscheidsuche';

  let html = `
    <div class="bcc-header">
      <div>
        <div class="bcc-header__title">${t('search.results', lang)}</div>
        <div class="bcc-header__subtitle">${data.totalResults} ${t('search.totalResults', lang)} · ${data.searchTimeMs}ms</div>
      </div>
    </div>
    <div class="bcc-filter-bar" id="filter-bar">
      <label>${t('filter.dateFrom', lang)}</label>
      <input type="date" id="f-date-from" />
      <label>${t('filter.dateTo', lang)}</label>
      <input type="date" id="f-date-to" />
      <label>${t('filter.language', lang)}</label>
      <select id="f-lang">
        <option value="">${t('filter.all', lang)}</option>
        <option value="de">DE</option>
        <option value="fr">FR</option>
        <option value="it">IT</option>
      </select>`;

  if (showCanton) {
    html += `
      <label>${t('filter.canton', lang)}</label>
      <select id="f-canton">
        <option value="">${t('filter.all', lang)}</option>
        <option value="ZH">Zürich</option>
        <option value="BE">Bern</option>
        <option value="GE">Genève</option>
        <option value="BS">Basel-Stadt</option>
        <option value="VD">Vaud</option>
        <option value="TI">Ticino</option>
      </select>`;
  }

  html += `
      <label>${t('filter.sort', lang)}</label>
      <select id="f-sort">
        <option value="relevance">${t('filter.sortRelevance', lang)}</option>
        <option value="date">${t('filter.sortDate', lang)}</option>
      </select>
      <button class="bcc-btn bcc-btn--sm" id="btn-apply-filter">${t('filter.apply', lang)}</button>
      <button class="bcc-btn bcc-btn--sm" id="btn-reset-filter">${t('filter.reset', lang)}</button>
    </div>`;

  if (data.decisions.length === 0) {
    html += `<div class="bcc-panel" style="text-align:center;padding:2rem;">${t('search.noResults', lang)}</div>`;
  } else {
    html += `<table class="bcc-results-table"><thead><tr>
      <th>${t('detail.court', lang)}</th>
      <th>${t('detail.date', lang)}</th>
      <th>${t('detail.chamber', lang)}</th>
      <th>${t('filter.language', lang)}</th>
      ${showCanton ? `<th>${t('filter.canton', lang)}</th>` : ''}
      <th></th>
    </tr></thead><tbody>`;

    for (const d of data.decisions) {
      const citation = d.bgeReference || d.title || d.decisionId;
      const snippet = d.summary ? d.summary.substring(0, 150) + (d.summary.length > 150 ? '…' : '') : '';
      html += `<tr>
        <td>
          <span class="bcc-citation-link" data-id="${escHtml(d.decisionId)}" data-bge="${escHtml(d.bgeReference || '')}">${escHtml(citation)}</span>
          ${snippet ? `<div class="bcc-snippet">${escHtml(snippet)}</div>` : ''}
        </td>
        <td>${escHtml(d.decisionDate)}</td>
        <td>${d.chamber ? `<span class="bcc-badge">${escHtml(d.chamber)}</span>` : ''}</td>
        <td>${d.language ? `<span class="bcc-badge">${escHtml(d.language.toUpperCase())}</span>` : ''}</td>
        ${showCanton ? `<td>${d.canton ? `<span class="bcc-badge">${escHtml(d.canton)}</span>` : ''}</td>` : ''}
        <td class="bcc-flex bcc-gap-sm">
          <button class="bcc-btn bcc-btn--sm bcc-btn--primary btn-use" data-id="${escHtml(d.decisionId)}" data-citation="${escHtml(citation)}" data-summary="${escHtml(d.summary || '')}">${t('action.useInAnalysis', lang)}</button>
          <button class="bcc-btn bcc-btn--sm btn-copy" data-citation="${escHtml(citation)}">${t('action.copyCitation', lang)}</button>
        </td>
      </tr>`;
    }
    html += '</tbody></table>';
  }

  app.innerHTML = html;
  bindListEvents();
}

function renderDetail(): void {
  const d = state.selectedDecision!;
  const lang = state.lang;
  const citation = d.bgeReference || d.title || d.decisionId;

  if (state.detailLoading) {
    app.innerHTML = `<div class="bcc-loading">${t('detail.loading', lang)}</div>`;
    return;
  }

  let html = `
    <div class="bcc-detail-panel">
      <button class="bcc-btn bcc-btn--sm" id="btn-back">${t('detail.back', lang)}</button>
      <div class="bcc-header bcc-mt-sm">
        <div class="bcc-header__title">${escHtml(citation)}</div>
      </div>
      <div class="bcc-detail-panel__meta">
        <span class="bcc-badge">${escHtml(d.decisionDate)}</span>
        ${d.court ? `<span class="bcc-badge">${escHtml(d.court)}</span>` : ''}
        ${d.chamber ? `<span class="bcc-badge">${escHtml(d.chamber)}</span>` : ''}
        ${d.language ? `<span class="bcc-badge">${escHtml(d.language.toUpperCase())}</span>` : ''}
        ${d.canton ? `<span class="bcc-badge">${escHtml(d.canton)}</span>` : ''}
      </div>`;

  if (d.legalAreas && d.legalAreas.length > 0) {
    html += `<div class="bcc-mb-sm"><strong>${t('detail.legalAreas', lang)}:</strong> ${d.legalAreas.map((a) => `<span class="bcc-badge bcc-badge--accent">${escHtml(a)}</span>`).join(' ')}</div>`;
  }

  if (d.summary) {
    html += `<div class="bcc-panel bcc-mb-sm"><h3 style="font-size:var(--bcc-text-sm);margin-bottom:0.5rem;">${t('detail.summary', lang)}</h3><div class="bcc-legal-text">${escHtml(d.summary)}</div></div>`;
  }

  if (d.fullText) {
    html += `<div class="bcc-panel bcc-mb-sm"><h3 style="font-size:var(--bcc-text-sm);margin-bottom:0.5rem;">${t('detail.fullText', lang)}</h3><div class="bcc-legal-text" style="max-height:400px;overflow-y:auto;">${escHtml(d.fullText)}</div></div>`;
  }

  html += `
      <div class="bcc-flex bcc-gap-sm bcc-mt-sm">
        <button class="bcc-btn bcc-btn--primary btn-use" data-id="${escHtml(d.decisionId)}" data-citation="${escHtml(citation)}" data-summary="${escHtml(d.summary || '')}">${t('action.useInAnalysis', lang)}</button>
        <button class="bcc-btn btn-copy" data-citation="${escHtml(citation)}">${t('action.copyCitation', lang)}</button>
      </div>
    </div>`;

  app.innerHTML = html;
  bindDetailEvents();
}

// --- Event binding ---

function bindListEvents(): void {
  // Citation clicks → detail view
  app.querySelectorAll('.bcc-citation-link').forEach((el) => {
    el.addEventListener('click', () => {
      const id = (el as HTMLElement).dataset.id!;
      const bge = (el as HTMLElement).dataset.bge;
      loadDetail(id, bge);
    });
  });

  // "Use in analysis" buttons
  app.querySelectorAll('.btn-use').forEach((el) => {
    el.addEventListener('click', () => {
      const ds = (el as HTMLElement).dataset;
      sendToModel(
        `Selected decision for analysis:\nCitation: ${ds.citation}\nSummary: ${ds.summary?.substring(0, 500) || 'N/A'}`,
      );
    });
  });

  // Copy citation buttons
  app.querySelectorAll('.btn-copy').forEach((el) => {
    el.addEventListener('click', () => {
      const citation = (el as HTMLElement).dataset.citation!;
      navigator.clipboard.writeText(citation).then(() => {
        const btn = el as HTMLButtonElement;
        const orig = btn.textContent;
        btn.textContent = t('action.copied', state.lang);
        setTimeout(() => { btn.textContent = orig; }, 1500);
      });
    });
  });

  // Filter apply
  document.getElementById('btn-apply-filter')?.addEventListener('click', applyFilters);
  document.getElementById('btn-reset-filter')?.addEventListener('click', () => {
    (document.getElementById('f-date-from') as HTMLInputElement).value = '';
    (document.getElementById('f-date-to') as HTMLInputElement).value = '';
    (document.getElementById('f-lang') as HTMLSelectElement).value = '';
    const canton = document.getElementById('f-canton') as HTMLSelectElement | null;
    if (canton) canton.value = '';
    (document.getElementById('f-sort') as HTMLSelectElement).value = 'relevance';
  });
}

function bindDetailEvents(): void {
  document.getElementById('btn-back')?.addEventListener('click', () => {
    state.view = 'list';
    state.selectedDecision = null;
    render();
  });

  app.querySelectorAll('.btn-use').forEach((el) => {
    el.addEventListener('click', () => {
      const ds = (el as HTMLElement).dataset;
      sendToModel(
        `Selected decision for analysis:\nCitation: ${ds.citation}\nSummary: ${ds.summary?.substring(0, 500) || 'N/A'}`,
      );
    });
  });

  app.querySelectorAll('.btn-copy').forEach((el) => {
    el.addEventListener('click', () => {
      const citation = (el as HTMLElement).dataset.citation!;
      navigator.clipboard.writeText(citation).then(() => {
        const btn = el as HTMLButtonElement;
        const orig = btn.textContent;
        btn.textContent = t('action.copied', state.lang);
        setTimeout(() => { btn.textContent = orig; }, 1500);
      });
    });
  });
}

// --- Actions ---

function loadDetail(decisionId: string, bgeRef?: string): void {
  state.detailLoading = true;
  state.view = 'detail';
  render();

  if (bgeRef && state.serverType === 'bge-search') {
    callTool('get_bge_decision', { citation: bgeRef });
  } else {
    callTool('get_decision_details', { decisionId });
  }
}

function applyFilters(): void {
  const dateFrom = (document.getElementById('f-date-from') as HTMLInputElement).value;
  const dateTo = (document.getElementById('f-date-to') as HTMLInputElement).value;
  const language = (document.getElementById('f-lang') as HTMLSelectElement).value;
  const canton = (document.getElementById('f-canton') as HTMLSelectElement | null)?.value;

  const args: Record<string, unknown> = {
    query: state.currentQuery || '',
  };
  if (dateFrom) args.dateFrom = dateFrom;
  if (dateTo) args.dateTo = dateTo;
  if (language) args.language = language;
  if (canton) args.cantons = [canton];

  const toolName = state.serverType === 'bge-search' ? 'search_bge' : 'search_decisions';
  callTool(toolName, args);
}

// --- Util ---

function escHtml(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// --- Init: listen for initial data from host ---

render();

// Signal readiness
window.parent.postMessage({
  jsonrpc: '2.0',
  method: 'notifications/initialized',
  params: {},
}, '*');
