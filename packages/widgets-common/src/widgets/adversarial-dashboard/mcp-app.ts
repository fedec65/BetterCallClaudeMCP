/**
 * W2 — Adversarial Analysis Dashboard Widget
 *
 * Three-column layout: Advocate / Adversary / Judge
 * with expandable arguments, probability gauge, and bridge actions.
 */

import { t, detectLang, type Lang } from '../../i18n/messages';

// --- Types (matching present_adversarial_analysis input schema) ---

interface Argument {
  thesis: string;
  legalBasis?: string;
  citedDecisions?: string[];
  strength: 'high' | 'medium' | 'low';
}

interface Perspective {
  arguments: Argument[];
  summary?: string;
}

interface JudicialSynthesis {
  probabilityScore: number;
  reasoning: string;
  keyFactors?: string[];
}

interface AnalysisData {
  advocate: Perspective;
  adversary: Perspective;
  judicialSynthesis: JudicialSynthesis;
  language?: string;
  caseTitle?: string;
}

interface WidgetState {
  lang: Lang;
  data: AnalysisData | null;
}

// --- Globals ---

const state: WidgetState = {
  lang: 'de',
  data: null,
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

  if (msg.type === 'tool-result' || msg.method === 'notifications/tools/result') {
    handleToolResult(msg.params ?? msg.data ?? msg.result);
  }
  if (msg.method === 'notifications/tools/input') {
    handleToolInput(msg.params);
  }
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
  if (args.advocate && args.adversary && args.judicialSynthesis) {
    state.data = args as unknown as AnalysisData;
    render();
  }
}

function handleToolResult(data: unknown): void {
  if (!data || typeof data !== 'object') return;
  const result = data as Record<string, unknown>;

  const content = result.content as Array<{ type: string; text?: string }> | undefined;
  if (content && Array.isArray(content)) {
    const textItem = content.find((c) => c.type === 'text' && c.text);
    if (textItem?.text) {
      try { handleToolResult(JSON.parse(textItem.text)); } catch { /* ignore */ }
      return;
    }
  }

  if ('advocate' in result && 'adversary' in result && 'judicialSynthesis' in result) {
    state.data = result as unknown as AnalysisData;
    if (result.language) state.lang = detectLang(result.language as string);
    render();
  }
}

// --- Rendering ---

function render(): void {
  if (!state.data) {
    app.innerHTML = `<div class="bcc-loading">${t('detail.loading', state.lang)}</div>`;
    return;
  }

  const d = state.data;
  const lang = state.lang;
  const score = d.judicialSynthesis.probabilityScore;
  const gaugeColor = score >= 60 ? 'var(--bcc-success)' : score >= 40 ? 'var(--bcc-warning)' : 'var(--bcc-danger)';

  let html = `
    <div class="bcc-header">
      <div>
        <div class="bcc-header__title">${t('adversarial.title', lang)}</div>
        ${d.caseTitle ? `<div class="bcc-header__subtitle">${escHtml(d.caseTitle)}</div>` : ''}
      </div>
      <button class="bcc-btn" id="btn-export">${t('adversarial.export', lang)}</button>
    </div>

    <div class="bcc-panel bcc-mb-sm">
      <div class="bcc-flex bcc-items-center bcc-justify-between bcc-mb-sm">
        <strong>${t('adversarial.judicialSynthesis', lang)}</strong>
        <span class="bcc-badge ${score >= 60 ? 'bcc-badge--success' : score >= 40 ? 'bcc-badge--warning' : 'bcc-badge--danger'}">${score}%</span>
      </div>
      <div class="bcc-gauge">
        <div class="bcc-gauge__bar">
          <div class="bcc-gauge__fill" style="width:${score}%;background:${gaugeColor};"></div>
        </div>
        <div class="bcc-gauge__label" style="color:${gaugeColor};">${score}%</div>
      </div>
      <div class="bcc-legal-text bcc-mt-sm" style="font-size:var(--bcc-text-sm);">${escHtml(d.judicialSynthesis.reasoning)}</div>
      ${d.judicialSynthesis.keyFactors ? `<div class="bcc-mt-sm">${d.judicialSynthesis.keyFactors.map((f) => `<span class="bcc-badge bcc-mt-sm" style="margin-right:0.25rem;">${escHtml(f)}</span>`).join('')}</div>` : ''}
    </div>

    <div class="bcc-columns">
      ${renderPerspective(d.advocate, t('adversarial.advocate', lang), 'advocate', lang)}
      ${renderPerspective(d.adversary, t('adversarial.adversary', lang), 'adversary', lang)}
      ${renderJudgeColumn(d.judicialSynthesis, lang)}
    </div>`;

  app.innerHTML = html;
  bindEvents();
}

function renderPerspective(p: Perspective, title: string, role: string, lang: Lang): string {
  let html = `<div class="bcc-panel">
    <h3 style="font-size:var(--bcc-text-base);font-weight:600;margin-bottom:0.5rem;">${escHtml(title)}</h3>`;

  if (p.summary) {
    html += `<div class="bcc-legal-text bcc-mb-sm" style="font-size:var(--bcc-text-sm);">${escHtml(p.summary)}</div>`;
  }

  for (let i = 0; i < p.arguments.length; i++) {
    const arg = p.arguments[i];
    html += renderArgument(arg, role, i, lang);
  }

  html += '</div>';
  return html;
}

function renderArgument(arg: Argument, role: string, idx: number, lang: Lang): string {
  const strengthLabel = arg.strength === 'high'
    ? t('adversarial.strengthHigh', lang)
    : arg.strength === 'medium'
      ? t('adversarial.strengthMedium', lang)
      : t('adversarial.strengthLow', lang);

  const strengthClass = arg.strength === 'high'
    ? 'bcc-badge--success'
    : arg.strength === 'medium'
      ? 'bcc-badge--warning'
      : 'bcc-badge--danger';

  let html = `<div class="bcc-expandable" id="arg-${role}-${idx}">
    <div class="bcc-expandable__header" data-target="arg-${role}-${idx}">
      <span class="bcc-expandable__arrow">▶</span>
      <span style="flex:1;font-size:var(--bcc-text-sm);">${escHtml(arg.thesis.substring(0, 80))}${arg.thesis.length > 80 ? '…' : ''}</span>
      <span class="bcc-badge ${strengthClass}">${strengthLabel}</span>
    </div>
    <div class="bcc-expandable__body">
      <div class="bcc-legal-text">${escHtml(arg.thesis)}</div>`;

  if (arg.legalBasis) {
    html += `<div class="bcc-mt-sm"><strong style="font-size:var(--bcc-text-xs);">${t('adversarial.legalBasis', lang)}:</strong> <span style="font-size:var(--bcc-text-sm);">${escHtml(arg.legalBasis)}</span></div>`;
  }

  if (arg.citedDecisions && arg.citedDecisions.length > 0) {
    html += `<div class="bcc-mt-sm">${arg.citedDecisions.map((c) => `<span class="bcc-badge bcc-badge--accent bcc-citation-ref" data-citation="${escHtml(c)}" style="cursor:pointer;margin-right:0.25rem;">${escHtml(c)}</span>`).join('')}</div>`;
  }

  html += `<div class="bcc-mt-sm"><button class="bcc-btn bcc-btn--sm btn-deepen" data-role="${role}" data-idx="${idx}">${t('adversarial.deepen', lang)}</button></div>`;
  html += '</div></div>';
  return html;
}

function renderJudgeColumn(synthesis: JudicialSynthesis, lang: Lang): string {
  return `<div class="bcc-panel">
    <h3 style="font-size:var(--bcc-text-base);font-weight:600;margin-bottom:0.5rem;">${t('adversarial.judge', lang)}</h3>
    <div class="bcc-flex bcc-items-center bcc-gap-sm bcc-mb-sm">
      <strong style="font-size:var(--bcc-text-sm);">${t('adversarial.probability', lang)}</strong>
      <span class="bcc-badge ${synthesis.probabilityScore >= 60 ? 'bcc-badge--success' : synthesis.probabilityScore >= 40 ? 'bcc-badge--warning' : 'bcc-badge--danger'}">${synthesis.probabilityScore}%</span>
    </div>
    <div class="bcc-legal-text" style="font-size:var(--bcc-text-sm);">${escHtml(synthesis.reasoning)}</div>
    ${synthesis.keyFactors ? `<div class="bcc-mt-sm"><strong style="font-size:var(--bcc-text-xs);">Key factors:</strong>${synthesis.keyFactors.map((f) => `<div style="font-size:var(--bcc-text-sm);margin-top:0.25rem;">• ${escHtml(f)}</div>`).join('')}</div>` : ''}
  </div>`;
}

// --- Event binding ---

function bindEvents(): void {
  // Expandable toggle
  app.querySelectorAll('.bcc-expandable__header').forEach((el) => {
    el.addEventListener('click', () => {
      const target = (el as HTMLElement).dataset.target!;
      document.getElementById(target)?.classList.toggle('bcc-expandable--open');
    });
  });

  // Deepen buttons
  app.querySelectorAll('.btn-deepen').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const ds = (el as HTMLElement).dataset;
      const role = ds.role!;
      const idx = parseInt(ds.idx!, 10);
      const perspective = role === 'advocate' ? state.data!.advocate : state.data!.adversary;
      const arg = perspective.arguments[idx];
      sendToModel(
        `Please deepen and stress-test this ${role} argument:\n\nThesis: ${arg.thesis}\nLegal basis: ${arg.legalBasis || 'N/A'}\nCited decisions: ${arg.citedDecisions?.join(', ') || 'none'}`,
      );
    });
  });

  // Export button
  document.getElementById('btn-export')?.addEventListener('click', () => {
    sendToModel(
      'Please write the adversarial analysis synthesis to the output file following the bcc-output/ convention (Spec B/D2).',
    );
  });

  // Citation references → search in W1
  app.querySelectorAll('.bcc-citation-ref').forEach((el) => {
    el.addEventListener('click', () => {
      const citation = (el as HTMLElement).dataset.citation!;
      callTool('search_bge', { query: citation });
    });
  });
}

// --- Util ---

function escHtml(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// --- Init ---

render();

window.parent.postMessage({
  jsonrpc: '2.0',
  method: 'notifications/initialized',
  params: {},
}, '*');
