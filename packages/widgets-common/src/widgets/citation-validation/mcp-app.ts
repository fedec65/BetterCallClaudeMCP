/**
 * W3 — Citation Validation Panel
 *
 * Receives review_citations result data via MCP Apps host messaging.
 * Displays green/yellow/red classification with corrections.
 * Bridge actions: Apply correction, Apply all, Ignore, Convert all, Finalize.
 */

import { t, detectLang, type Lang, type MessageKey } from '../../i18n/messages.js';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ReviewedCitation {
  id: number;
  original: string;
  context: string;       // surrounding sentence
  position: { start: number; end: number };
  status: 'green' | 'yellow' | 'red';
  type: string;          // bge, statute, cantonal, etc.
  correction?: string;
  reason?: string;
  ignored?: boolean;
  applied?: boolean;
}

interface ReviewData {
  citations: ReviewedCitation[];
  dominantLanguage?: string;
  textLength?: number;
  language?: string;
  _chunk?: { current: number; total: number };
}

interface WidgetState {
  view: 'loading' | 'results';
  data: ReviewData | null;
  lang: Lang;
  filter: 'all' | 'green' | 'yellow' | 'red';
}

/* ------------------------------------------------------------------ */
/*  Globals                                                            */
/* ------------------------------------------------------------------ */

const app = document.getElementById('app')!;
let state: WidgetState = {
  view: 'loading',
  data: null,
  lang: 'en',
  filter: 'all',
};

let pendingCallId = 0;

/* ------------------------------------------------------------------ */
/*  MCP Apps bridge                                                    */
/* ------------------------------------------------------------------ */

function callTool(toolName: string, args: Record<string, unknown>): number {
  const id = ++pendingCallId;
  window.parent.postMessage({
    jsonrpc: '2.0', id, method: 'tools/call',
    params: { name: toolName, arguments: args },
  }, '*');
  return id;
}

function sendToModel(text: string): void {
  window.parent.postMessage({
    jsonrpc: '2.0', method: 'ui/updateModelContext',
    params: { context: text },
  }, '*');
}

/* ------------------------------------------------------------------ */
/*  Host message listener                                              */
/* ------------------------------------------------------------------ */

window.addEventListener('message', (ev) => {
  const msg = ev.data;
  if (!msg || typeof msg !== 'object') return;

  // Tool result with review data
  if (msg.result && msg.result.content) {
    try {
      const textItem = msg.result.content.find((c: any) => c.type === 'text');
      if (textItem) {
        const parsed = JSON.parse(textItem.text);
        if (parsed.citations) {
          state.data = parsed as ReviewData;
          state.lang = detectLang(parsed.language || parsed.dominantLanguage);
          state.view = 'results';
          render();
        }
      }
    } catch { /* ignore parse errors */ }
  }

  // Direct tool input (initial data from host)
  if (msg.method === 'ui/setToolInput' || msg.method === 'tools/result') {
    try {
      const params = msg.params || msg.result;
      let data: ReviewData | null = null;

      if (params?.content) {
        const textItem = params.content.find((c: any) => c.type === 'text');
        if (textItem) data = JSON.parse(textItem.text);
      } else if (params?.citations) {
        data = params;
      }

      if (data?.citations) {
        state.data = data;
        state.lang = detectLang(data.language || data.dominantLanguage);
        state.view = 'results';
        render();
      }
    } catch { /* ignore */ }
  }

  // Theme
  if (msg.method === 'ui/setTheme') {
    const theme = msg.params?.theme || 'light';
    document.documentElement.setAttribute('data-theme', theme);
  }
});

/* ------------------------------------------------------------------ */
/*  Rendering                                                          */
/* ------------------------------------------------------------------ */

function render(): void {
  if (state.view === 'loading' || !state.data) {
    app.innerHTML = `<div class="bcc-panel"><p>${t('citation.processing', state.lang)}</p></div>`;
    return;
  }

  const { citations, dominantLanguage, _chunk } = state.data;
  const lang = state.lang;

  const green = citations.filter(c => c.status === 'green').length;
  const yellow = citations.filter(c => c.status === 'yellow').length;
  const red = citations.filter(c => c.status === 'red').length;

  const filtered = state.filter === 'all'
    ? citations
    : citations.filter(c => c.status === state.filter);

  const hasCorrections = citations.some(c => (c.status === 'yellow' || c.status === 'red') && c.correction && !c.ignored && !c.applied);

  app.innerHTML = `
    <div class="bcc-panel">
      <h2>${t('citation.title', lang)}</h2>

      ${_chunk ? `<div class="bcc-badge">${t('citation.chunk', lang)} ${_chunk.current}/${_chunk.total}</div>` : ''}

      <!-- Summary -->
      <div class="bcc-summary-bar">
        <span class="bcc-summary-total">${citations.length} ${t('citation.found', lang)}</span>
        <span class="bcc-badge bcc-badge--green" data-filter="green">${green} ${t('citation.valid', lang)}</span>
        <span class="bcc-badge bcc-badge--yellow" data-filter="yellow">${yellow} ${t('citation.warning', lang)}</span>
        <span class="bcc-badge bcc-badge--red" data-filter="red">${red} ${t('citation.invalid', lang)}</span>
        ${state.filter !== 'all' ? `<button class="bcc-btn bcc-btn--sm" data-filter="all">${t('filter.all', lang)}</button>` : ''}
      </div>

      ${dominantLanguage ? `<div class="bcc-info-row">${t('citation.dominantLang', lang)}: <strong>${dominantLanguage.toUpperCase()}</strong></div>` : ''}

      <!-- Actions bar -->
      <div class="bcc-filter-bar">
        ${hasCorrections ? `<button class="bcc-btn bcc-btn--primary" id="apply-all">${t('citation.applyAll', lang)}</button>` : ''}
        <span class="bcc-convert-group">
          ${t('citation.convertAll', lang)}:
          <button class="bcc-btn bcc-btn--sm" data-convert="de">DE</button>
          <button class="bcc-btn bcc-btn--sm" data-convert="fr">FR</button>
          <button class="bcc-btn bcc-btn--sm" data-convert="it">IT</button>
          <button class="bcc-btn bcc-btn--sm" data-convert="en">EN</button>
        </span>
      </div>

      <!-- Citation list -->
      <div class="bcc-citation-list">
        ${filtered.map(c => renderCitation(c, lang)).join('')}
      </div>

      <!-- Finalize -->
      <div class="bcc-finalize-bar">
        <button class="bcc-btn bcc-btn--primary" id="finalize">${t('citation.finalize', lang)}</button>
      </div>
    </div>
  `;

  bindEvents();
}

function renderCitation(c: ReviewedCitation, lang: Lang): string {
  const statusClass = c.ignored ? 'ignored' : c.applied ? 'applied' : c.status;
  const statusLabel = c.ignored
    ? t('citation.ignored', lang)
    : c.applied
      ? t('citation.corrected', lang)
      : t(`citation.${c.status === 'green' ? 'valid' : c.status === 'yellow' ? 'warning' : 'invalid'}` as MessageKey, lang);

  return `
    <div class="bcc-citation-row bcc-citation--${statusClass}" data-id="${c.id}">
      <div class="bcc-citation-header">
        <span class="bcc-badge bcc-badge--${statusClass}">${statusLabel}</span>
        <code class="bcc-citation-original">${escapeHtml(c.original)}</code>
        <span class="bcc-citation-type">${c.type}</span>
      </div>
      ${c.context ? `<div class="bcc-citation-context">${escapeHtml(c.context)}</div>` : ''}
      ${c.correction && !c.ignored && !c.applied ? `
        <div class="bcc-citation-correction">
          <span class="bcc-label">${t('citation.correction', lang)}:</span>
          <code>${escapeHtml(c.correction)}</code>
          ${c.reason ? `<span class="bcc-citation-reason">${escapeHtml(c.reason)}</span>` : ''}
        </div>
        <div class="bcc-citation-actions">
          <button class="bcc-btn bcc-btn--sm bcc-btn--primary" data-apply="${c.id}">${t('citation.applyCorrection', lang)}</button>
          <button class="bcc-btn bcc-btn--sm" data-ignore="${c.id}">${t('citation.ignore', lang)}</button>
        </div>
      ` : ''}
    </div>
  `;
}

/* ------------------------------------------------------------------ */
/*  Event binding                                                      */
/* ------------------------------------------------------------------ */

function bindEvents(): void {
  // Filter badges
  app.querySelectorAll<HTMLElement>('[data-filter]').forEach(el => {
    el.addEventListener('click', () => {
      const f = el.dataset.filter as WidgetState['filter'];
      state.filter = f;
      render();
    });
  });

  // Apply single correction
  app.querySelectorAll<HTMLElement>('[data-apply]').forEach(el => {
    el.addEventListener('click', () => {
      const id = Number(el.dataset.apply);
      const cit = state.data?.citations.find(c => c.id === id);
      if (cit && cit.correction) {
        sendToModel(`[Citation correction] Replace "${cit.original}" with "${cit.correction}"${cit.reason ? ` — ${cit.reason}` : ''}`);
        cit.applied = true;
        render();
      }
    });
  });

  // Ignore
  app.querySelectorAll<HTMLElement>('[data-ignore]').forEach(el => {
    el.addEventListener('click', () => {
      const id = Number(el.dataset.ignore);
      const cit = state.data?.citations.find(c => c.id === id);
      if (cit) {
        cit.ignored = true;
        sendToModel(`[Citation ignored] "${cit.original}" marked as acceptable by user.`);
        render();
      }
    });
  });

  // Apply all corrections
  const applyAllBtn = document.getElementById('apply-all');
  applyAllBtn?.addEventListener('click', () => {
    if (!state.data) return;
    const corrections: string[] = [];
    for (const cit of state.data.citations) {
      if ((cit.status === 'yellow' || cit.status === 'red') && cit.correction && !cit.ignored && !cit.applied) {
        cit.applied = true;
        corrections.push(`"${cit.original}" → "${cit.correction}"`);
      }
    }
    if (corrections.length > 0) {
      sendToModel(`[Apply all corrections]\n${corrections.join('\n')}\nPlease produce the corrected document with these replacements applied.`);
    }
    render();
  });

  // Convert all to language
  app.querySelectorAll<HTMLElement>('[data-convert]').forEach(el => {
    el.addEventListener('click', () => {
      const targetLang = el.dataset.convert;
      if (!state.data || !targetLang) return;
      const originals = state.data.citations.map(c => c.original);
      sendToModel(`[Convert all citations to ${targetLang.toUpperCase()}]\nCitations to convert:\n${originals.join('\n')}\nPlease use convert_citation for each and produce the updated document.`);
    });
  });

  // Finalize
  const finalizeBtn = document.getElementById('finalize');
  finalizeBtn?.addEventListener('click', () => {
    if (!state.data) return;
    const applied = state.data.citations.filter(c => c.applied);
    const ignored = state.data.citations.filter(c => c.ignored);
    const untouched = state.data.citations.filter(c => !c.applied && !c.ignored);

    let summary = `[Citation review finalized]\n`;
    summary += `Total: ${state.data.citations.length}\n`;
    summary += `Corrections applied: ${applied.length}\n`;
    summary += `Ignored: ${ignored.length}\n`;
    summary += `Unchanged: ${untouched.length}\n`;

    if (applied.length > 0) {
      summary += `\nApplied corrections:\n${applied.map(c => `  "${c.original}" → "${c.correction}"`).join('\n')}`;
    }
    if (ignored.length > 0) {
      summary += `\nIgnored (accepted as-is):\n${ignored.map(c => `  "${c.original}"`).join('\n')}`;
    }

    summary += `\nPlease update the document and sources.md accordingly.`;
    sendToModel(summary);
  });
}

/* ------------------------------------------------------------------ */
/*  Utility                                                            */
/* ------------------------------------------------------------------ */

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Signal readiness to host
window.parent.postMessage({ jsonrpc: '2.0', method: 'ui/ready', params: {} }, '*');
