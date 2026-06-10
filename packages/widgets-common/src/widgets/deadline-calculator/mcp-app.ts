/**
 * W5 — Deadline Calculator (Fristenrechner)
 *
 * Renders computation results from compute_deadlines tool.
 * Shows timeline with step-by-step computation, holidays, suspensions.
 * Permanent disclaimer (not closeable).
 * Bridge: "Insert into memo" sends computation to model.
 */

import { t, detectLang, type Lang } from '../../i18n/messages.js';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ComputationStep {
  day: number;
  date: string;       // ISO date
  description: string;
  isHoliday?: boolean;
  isSuspension?: boolean;
  rule?: string;       // e.g. "Art. 142 Abs. 1 ZPO"
}

interface DeadlineResult {
  label: string;
  date: string;        // ISO date
  rule: string;        // normative citation
  computation: ComputationStep[];
  holidays: string[];
  suspensions?: { from: string; to: string; rule: string }[];
}

interface DeadlineData {
  procedureType: string;
  notificationDate: string;
  canton: string;
  language?: string;
  deadlines: DeadlineResult[];
  outOfScope?: string;
  lastVerified?: string;
}

interface WidgetState {
  view: 'loading' | 'results' | 'error';
  data: DeadlineData | null;
  lang: Lang;
  expandedIdx: number | null;
}

/* ------------------------------------------------------------------ */
/*  Globals                                                            */
/* ------------------------------------------------------------------ */

const app = document.getElementById('app')!;
let state: WidgetState = {
  view: 'loading',
  data: null,
  lang: 'en',
  expandedIdx: null,
};

/* ------------------------------------------------------------------ */
/*  MCP Apps bridge                                                    */
/* ------------------------------------------------------------------ */

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

  if (msg.result?.content || msg.method === 'ui/setToolInput' || msg.method === 'tools/result') {
    try {
      const params = msg.result || msg.params;
      let data: DeadlineData | null = null;

      if (params?.content) {
        const textItem = params.content.find((c: any) => c.type === 'text');
        if (textItem) data = JSON.parse(textItem.text);
      } else if (params?.deadlines || params?.outOfScope) {
        data = params;
      }

      if (data) {
        state.data = data;
        state.lang = detectLang(data.language);
        state.view = data.outOfScope ? 'error' : 'results';
        state.expandedIdx = null;
        render();
      }
    } catch { /* ignore */ }
  }

  if (msg.method === 'ui/setTheme') {
    document.documentElement.setAttribute('data-theme', msg.params?.theme || 'light');
  }
});

/* ------------------------------------------------------------------ */
/*  Rendering                                                          */
/* ------------------------------------------------------------------ */

function render(): void {
  const lang = state.lang;

  // Disclaimer is always visible
  const disclaimer = `<div class="bcc-disclaimer">${t('fristen.disclaimer', lang)}</div>`;

  if (state.view === 'loading' || !state.data) {
    app.innerHTML = `<div class="bcc-panel">${disclaimer}<p>${t('detail.loading', lang)}</p></div>`;
    return;
  }

  if (state.view === 'error' && state.data.outOfScope) {
    app.innerHTML = `<div class="bcc-panel">${disclaimer}
      <h2>${t('fristen.title', lang)}</h2>
      <div class="bcc-badge bcc-badge--red">${t('fristen.outOfScope', lang)}</div>
      <p>${escapeHtml(state.data.outOfScope)}</p>
    </div>`;
    return;
  }

  const { deadlines, procedureType, notificationDate, canton, lastVerified } = state.data;

  app.innerHTML = `
    <div class="bcc-panel">
      ${disclaimer}
      <h2>${t('fristen.title', lang)}</h2>

      <div class="bcc-info-row">
        <span>${t('fristen.procedure', lang)}: <strong>${escapeHtml(procedureType)}</strong></span>
        <span>${t('fristen.notificationDate', lang)}: <strong>${escapeHtml(notificationDate)}</strong></span>
        <span>${t('fristen.canton', lang)}: <strong>${escapeHtml(canton)}</strong></span>
      </div>

      ${lastVerified ? `<div class="bcc-info-row bcc-info-row--meta">${t('fristen.lastVerified', lang)}: ${escapeHtml(lastVerified)}</div>` : ''}

      <div class="bcc-deadline-list">
        ${deadlines.map((d, i) => renderDeadline(d, i, lang)).join('')}
      </div>

      <div class="bcc-finalize-bar">
        <button class="bcc-btn bcc-btn--primary" id="insert-memo">${t('fristen.insertInMemo', lang)}</button>
      </div>
    </div>
  `;

  bindEvents();
}

function renderDeadline(d: DeadlineResult, idx: number, lang: Lang): string {
  const isExpanded = state.expandedIdx === idx;

  return `
    <div class="bcc-deadline-item ${isExpanded ? 'bcc-expanded' : ''}">
      <div class="bcc-deadline-header" data-expand="${idx}">
        <span class="bcc-deadline-label">${escapeHtml(d.label)}</span>
        <span class="bcc-deadline-date"><strong>${escapeHtml(d.date)}</strong></span>
        <span class="bcc-deadline-rule">${escapeHtml(d.rule)}</span>
        <span class="bcc-expand-icon">${isExpanded ? '▾' : '▸'}</span>
      </div>
      ${isExpanded ? `
        <div class="bcc-deadline-detail">
          <table class="bcc-results-table">
            <thead>
              <tr>
                <th>#</th>
                <th>${t('detail.date', lang)}</th>
                <th>${t('fristen.computation', lang)}</th>
                <th>${t('fristen.rule', lang)}</th>
              </tr>
            </thead>
            <tbody>
              ${d.computation.map(step => `
                <tr class="${step.isHoliday ? 'bcc-row--holiday' : ''} ${step.isSuspension ? 'bcc-row--suspension' : ''}">
                  <td>${step.day}</td>
                  <td>${escapeHtml(step.date)}</td>
                  <td>${escapeHtml(step.description)}${step.isHoliday ? ` <span class="bcc-badge bcc-badge--yellow">${t('fristen.holiday', lang)}</span>` : ''}${step.isSuspension ? ` <span class="bcc-badge bcc-badge--yellow">${t('fristen.suspension', lang)}</span>` : ''}</td>
                  <td>${step.rule ? escapeHtml(step.rule) : ''}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          ${d.holidays.length > 0 ? `<div class="bcc-holidays-note">${t('fristen.holiday', lang)}: ${d.holidays.map(h => escapeHtml(h)).join(', ')}</div>` : ''}
        </div>
      ` : ''}
    </div>
  `;
}

/* ------------------------------------------------------------------ */
/*  Event binding                                                      */
/* ------------------------------------------------------------------ */

function bindEvents(): void {
  // Expand/collapse
  app.querySelectorAll<HTMLElement>('[data-expand]').forEach(el => {
    el.addEventListener('click', () => {
      const idx = Number(el.dataset.expand);
      state.expandedIdx = state.expandedIdx === idx ? null : idx;
      render();
    });
  });

  // Insert into memo
  document.getElementById('insert-memo')?.addEventListener('click', () => {
    if (!state.data) return;

    let memo = `[Deadline calculation — ${state.data.procedureType}]\n`;
    memo += `Notification: ${state.data.notificationDate}, Canton: ${state.data.canton}\n\n`;

    for (const d of state.data.deadlines) {
      memo += `${d.label}: ${d.date} (${d.rule})\n`;
      memo += `Computation:\n`;
      for (const step of d.computation) {
        memo += `  Day ${step.day}: ${step.date} — ${step.description}`;
        if (step.rule) memo += ` [${step.rule}]`;
        if (step.isHoliday) memo += ' (holiday)';
        if (step.isSuspension) memo += ' (judicial recess)';
        memo += '\n';
      }
      memo += '\n';
    }

    memo += `DISCLAIMER: ${t('fristen.disclaimer', state.lang)}\n`;
    memo += `\nPlease insert this computation (with disclaimer) into the memo per bcc-output/ convention.`;

    sendToModel(memo);
  });
}

/* ------------------------------------------------------------------ */
/*  Utility                                                            */
/* ------------------------------------------------------------------ */

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Signal readiness
window.parent.postMessage({ jsonrpc: '2.0', method: 'ui/ready', params: {} }, '*');
