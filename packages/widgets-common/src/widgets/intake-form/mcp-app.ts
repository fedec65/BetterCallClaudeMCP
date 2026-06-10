/**
 * W4 — Intake Form Widget
 *
 * Renders structured questions from the legal-intake skill as a form.
 * Adaptivity stays in the skill; the widget presents + collects responses.
 * Bridge: submit → structured answers back to model; follow-up round supported.
 */

import { t, detectLang, type Lang, type MessageKey } from '../../i18n/messages.js';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type QuestionType = 'text' | 'single' | 'multi' | 'date' | 'number' | 'yesno';

interface IntakeQuestion {
  id: string;
  text: string;
  type: QuestionType;
  options?: string[];
  required: boolean;
  hint?: string;
  section?: string;
}

interface IntakeData {
  questions: IntakeQuestion[];
  language?: string;
  caseTitle?: string;
  isFollowUp?: boolean;
}

interface WidgetState {
  view: 'form' | 'submitted' | 'followUp';
  data: IntakeData | null;
  answers: Record<string, string | string[]>;
  lang: Lang;
  round: number;       // 0 = initial, 1 = follow-up (max 1)
}

/* ------------------------------------------------------------------ */
/*  Globals                                                            */
/* ------------------------------------------------------------------ */

const app = document.getElementById('app')!;
let state: WidgetState = {
  view: 'form',
  data: null,
  answers: {},
  lang: 'en',
  round: 0,
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

  // Tool result or direct data
  if (msg.result?.content || msg.method === 'ui/setToolInput' || msg.method === 'tools/result') {
    try {
      const params = msg.result || msg.params;
      let data: IntakeData | null = null;

      if (params?.content) {
        const textItem = params.content.find((c: any) => c.type === 'text');
        if (textItem) data = JSON.parse(textItem.text);
      } else if (params?.questions) {
        data = params;
      }

      if (data?.questions) {
        if (data.isFollowUp && state.round >= 1) {
          // Max 1 follow-up round; ignore further
          return;
        }
        if (data.isFollowUp) {
          state.round = 1;
          state.view = 'followUp';
        } else {
          state.round = 0;
          state.view = 'form';
        }
        state.data = data;
        state.lang = detectLang(data.language);
        state.answers = {};
        render();
      }
    } catch { /* ignore */ }
  }

  // Theme
  if (msg.method === 'ui/setTheme') {
    document.documentElement.setAttribute('data-theme', msg.params?.theme || 'light');
  }
});

/* ------------------------------------------------------------------ */
/*  Sections                                                           */
/* ------------------------------------------------------------------ */

const SECTION_ORDER = ['context', 'parties', 'objective', 'constraints'];

function sectionLabel(section: string, lang: Lang): string {
  const key = `intake.section.${section}` as MessageKey;
  const val = t(key, lang);
  return val !== key ? val : section;
}

/* ------------------------------------------------------------------ */
/*  Rendering                                                          */
/* ------------------------------------------------------------------ */

function render(): void {
  if (!state.data) {
    app.innerHTML = `<div class="bcc-panel"><p>${t('detail.loading', state.lang)}</p></div>`;
    return;
  }

  const { questions, caseTitle, isFollowUp } = state.data;
  const lang = state.lang;

  // Group by section
  const sections = new Map<string, IntakeQuestion[]>();
  for (const q of questions) {
    const sec = q.section || 'other';
    if (!sections.has(sec)) sections.set(sec, []);
    sections.get(sec)!.push(q);
  }

  // Progress
  const answered = questions.filter(q => {
    const a = state.answers[q.id];
    return a !== undefined && a !== '' && !(Array.isArray(a) && a.length === 0);
  }).length;
  const required = questions.filter(q => q.required).length;
  const requiredAnswered = questions.filter(q => {
    if (!q.required) return true;
    const a = state.answers[q.id];
    return a !== undefined && a !== '' && !(Array.isArray(a) && a.length === 0);
  }).length;
  const progressPct = questions.length > 0 ? Math.round((answered / questions.length) * 100) : 0;

  // Sort sections
  const sortedSections = [...sections.entries()].sort((a, b) => {
    const ia = SECTION_ORDER.indexOf(a[0]);
    const ib = SECTION_ORDER.indexOf(b[0]);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });

  app.innerHTML = `
    <div class="bcc-panel">
      <h2>${isFollowUp ? t('intake.followUp', lang) : t('intake.title', lang)}</h2>
      ${caseTitle ? `<div class="bcc-info-row"><strong>${escapeHtml(caseTitle)}</strong></div>` : ''}

      <!-- Progress -->
      <div class="bcc-progress-bar">
        <div class="bcc-progress-fill" style="width:${progressPct}%"></div>
        <span class="bcc-progress-label">${t('intake.progress', lang)}: ${answered}/${questions.length}</span>
      </div>

      <form id="intake-form">
        ${sortedSections.map(([sec, qs]) => `
          <fieldset class="bcc-fieldset">
            <legend>${sectionLabel(sec, lang)}</legend>
            ${qs.map(q => renderQuestion(q, lang)).join('')}
          </fieldset>
        `).join('')}

        <div class="bcc-finalize-bar">
          <button type="submit" class="bcc-btn bcc-btn--primary" ${requiredAnswered < required ? 'disabled' : ''}>${t('intake.submit', lang)}</button>
        </div>
      </form>
    </div>
  `;

  bindEvents();
}

function renderQuestion(q: IntakeQuestion, lang: Lang): string {
  const val = state.answers[q.id];
  const requiredMark = q.required ? `<span class="bcc-required">*</span>` : '';

  let input = '';
  switch (q.type) {
    case 'text':
      input = `<textarea class="bcc-input" data-qid="${q.id}" rows="3" ${q.required ? 'required' : ''}>${escapeHtml((val as string) || '')}</textarea>`;
      break;

    case 'single':
      input = `<select class="bcc-input" data-qid="${q.id}" ${q.required ? 'required' : ''}>
        <option value="">—</option>
        ${(q.options || []).map(o => `<option value="${escapeHtml(o)}" ${val === o ? 'selected' : ''}>${escapeHtml(o)}</option>`).join('')}
      </select>`;
      break;

    case 'multi':
      input = `<div class="bcc-multi-group" data-qid="${q.id}">
        ${(q.options || []).map(o => {
          const checked = Array.isArray(val) && val.includes(o);
          return `<label class="bcc-checkbox"><input type="checkbox" value="${escapeHtml(o)}" ${checked ? 'checked' : ''} /> ${escapeHtml(o)}</label>`;
        }).join('')}
      </div>`;
      break;

    case 'date':
      input = `<input type="date" class="bcc-input" data-qid="${q.id}" value="${escapeHtml((val as string) || '')}" ${q.required ? 'required' : ''} />`;
      break;

    case 'number':
      input = `<input type="number" class="bcc-input" data-qid="${q.id}" value="${escapeHtml((val as string) || '')}" ${q.required ? 'required' : ''} />`;
      break;

    case 'yesno':
      input = `<div class="bcc-yesno-group" data-qid="${q.id}">
        <label class="bcc-radio"><input type="radio" name="q_${q.id}" value="yes" ${val === 'yes' ? 'checked' : ''} /> ${t('intake.yes', lang)}</label>
        <label class="bcc-radio"><input type="radio" name="q_${q.id}" value="no" ${val === 'no' ? 'checked' : ''} /> ${t('intake.no', lang)}</label>
      </div>`;
      break;

    default:
      input = `<input type="text" class="bcc-input" data-qid="${q.id}" value="${escapeHtml((val as string) || '')}" ${q.required ? 'required' : ''} />`;
  }

  return `
    <div class="bcc-question" data-qid="${q.id}">
      <label class="bcc-label">${escapeHtml(q.text)} ${requiredMark}</label>
      ${q.hint ? `<span class="bcc-hint">${escapeHtml(q.hint)}</span>` : ''}
      ${input}
    </div>
  `;
}

/* ------------------------------------------------------------------ */
/*  Event binding                                                      */
/* ------------------------------------------------------------------ */

function bindEvents(): void {
  // Track input changes
  app.querySelectorAll<HTMLElement>('[data-qid]').forEach(container => {
    const qid = container.dataset.qid!;

    // Text inputs, selects, date, number
    const input = container.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('input, textarea, select');
    if (input && container.tagName !== 'DIV') {
      input.addEventListener('input', () => {
        state.answers[qid] = input.value;
        updateSubmitButton();
      });
    }

    // Multi checkboxes
    if (container.classList.contains('bcc-multi-group')) {
      container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]').forEach(cb => {
        cb.addEventListener('change', () => {
          const checked = Array.from(container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]:checked')).map(c => c.value);
          state.answers[qid] = checked;
          updateSubmitButton();
        });
      });
    }

    // Yes/No radios
    if (container.classList.contains('bcc-yesno-group')) {
      container.querySelectorAll<HTMLInputElement>('input[type="radio"]').forEach(radio => {
        radio.addEventListener('change', () => {
          if (radio.checked) state.answers[qid] = radio.value;
          updateSubmitButton();
        });
      });
    }
  });

  // Also capture inputs directly under bcc-question divs
  app.querySelectorAll<HTMLElement>('.bcc-question').forEach(qDiv => {
    const qid = qDiv.dataset.qid!;
    const directInput = qDiv.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('.bcc-input');
    if (directInput) {
      directInput.addEventListener('input', () => {
        state.answers[qid] = directInput.value;
        updateSubmitButton();
      });
    }
  });

  // Form submit
  const form = document.getElementById('intake-form') as HTMLFormElement | null;
  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    handleSubmit();
  });
}

function updateSubmitButton(): void {
  if (!state.data) return;
  const required = state.data.questions.filter(q => q.required);
  const allFilled = required.every(q => {
    const a = state.answers[q.id];
    return a !== undefined && a !== '' && !(Array.isArray(a) && a.length === 0);
  });
  const btn = app.querySelector<HTMLButtonElement>('button[type="submit"]');
  if (btn) btn.disabled = !allFilled;
}

function handleSubmit(): void {
  if (!state.data) return;

  // Build structured response
  const response: Record<string, string | string[]> = {};
  for (const q of state.data.questions) {
    const a = state.answers[q.id];
    if (a !== undefined && a !== '' && !(Array.isArray(a) && a.length === 0)) {
      response[q.id] = a;
    }
  }

  // Send structured answers to model
  const payload = {
    type: state.data.isFollowUp ? 'follow_up_response' : 'intake_response',
    answers: response,
    round: state.round,
  };

  sendToModel(JSON.stringify(payload));

  state.view = 'submitted';
  app.innerHTML = `<div class="bcc-panel"><p>${t('intake.submit', state.lang)} ✓</p></div>`;
}

/* ------------------------------------------------------------------ */
/*  Utility                                                            */
/* ------------------------------------------------------------------ */

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Signal readiness
window.parent.postMessage({ jsonrpc: '2.0', method: 'ui/ready', params: {} }, '*');
