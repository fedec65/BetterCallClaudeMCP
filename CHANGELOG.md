# Changelog

## [1.2.0] — MCP Apps Phase 2 (Spec C-2)

### Added

- **W3 — Citation Validation Panel Widget** (`legal-citations` server)
  - `review_citations` tool: orchestrates `extract_citations` + `validate_citation` + `format_citation`
  - Green/yellow/red classification of all citations in a document
  - Per-citation correction proposals from the formatter
  - Batch actions: "Apply all corrections", "Convert all to [language]"
  - Single-citation actions: "Apply correction", "Ignore"
  - Finalize summary sent to model with applied/ignored/untouched counts
  - Text fallback: structured report with `[OK]`/`[WARN]`/`[ERR]` markers

- **W4 — Briefing Intake Form Widget** (`legal-persona` server)
  - `present_intake_form` tool: renders adaptive questions from `legal-intake` skill as a unified form
  - Questions grouped by section (context, parties, objective, constraints)
  - Progress indicator (answered/total)
  - Supports one follow-up round (max 1 additional question set)
  - Text fallback: structured markdown form with checkbox options

- **W5 — Deadline Calculator Widget** (`legal-persona` server)
  - `compute_deadlines` tool: rules-based deadline computation for ZPO/BGG procedures
  - ZPO Art. 142–149: dies a quo, day counting, weekend/holiday correction
  - Art. 145 ZPO / Art. 46 BGG: Gerichtsferien suspension (Easter, summer, winter)
  - BGG Art. 100–101: federal appeal deadlines (30d ordinary, 10d constitutional)
  - Cantonal holiday datasets for all 26 Swiss cantons
  - Step-by-step verifiable computation with rule citations
  - Permanent non-closeable disclaimer (DE/FR/IT/EN)
  - Holiday data verified date exposed in widget footer
  - Text fallback: full computation with disclaimer

- **Architecture decision document** (`docs/ARCHITECTURE.md`)
  - Evaluated distributed vs. centralized (bcc-ui micro-server) presentation tools
  - Decision: stay distributed with ≤4 presentation tools; reassess at >5 or ≥3 per server

- **Fristen GO/NO-GO gate assessment** (`docs/audit/FRISTEN-ASSESSMENT.md`)
  - Normative scope: ZPO + BGG confirmed
  - Holiday data: public dataset + annual manual verification
  - Disclaimer: all 4 languages, non-eludible placement
  - Test suite: 30 cases with expected outcomes

### Changed

- `legal-citations` HTTP factory: v1.1.0 → v1.2.0 — added `resources` capability, `review_citations` tool with `_meta.ui`
- `legal-persona` HTTP factory: v1.1.0 → v1.2.0 — added intake form + deadline calculator resources, 2 new tools
- `mcp-servers-http`: v1.1.0 → v1.2.0
- `widgets-common` build: 5 widgets (jurisprudence-browser, adversarial-dashboard, citation-validation, intake-form, deadline-calculator)
- 80+ new i18n keys for W3/W4/W5 across DE/FR/IT/EN

### Security / Privacy

- All Phase 2 widgets maintain zero-external-resources policy
- Deadline calculator operates locally with embedded holiday data — no external API calls
- Disclaimer text is non-eludible (permanent in widget, always-first in text fallback)

---

## [1.1.0] — MCP Apps Phase 1 (Spec C)

### Added

- **MCP Apps Widget Infrastructure** (`packages/widgets-common/`)
  - Legal-oriented design system (dark/light, "carta da lettere legale" palette, serif typography for legal text)
  - i18n system with DE/FR/IT/EN translations for all widget labels (language follows query, fallback EN)
  - Vite build pipeline producing self-contained single-file HTML widgets (zero external resources)
  - Helper utilities for raw Server API widget registration (`_meta.ui`, resource handlers)

- **W1 — Jurisprudence Browser Widget**
  - Interactive search results browser for BGE and cantonal decisions
  - Filters: date range, language, chamber, canton (entscheidsuche), sort order
  - Detail view: on-demand loading of full decision text via `get_bge_decision` / `get_decision_details`
  - "Usa nell'analisi" bridge action: sends selected citation + extract to conversation context
  - "Copia citazione" clipboard action
  - Shared widget template across `bge-search` and `entscheidsuche` servers

- **W2 — Adversarial Analysis Dashboard Widget**
  - Three-column layout: Advocate / Adversary / Judge perspectives
  - Probability gauge for judicial synthesis score
  - Expandable arguments with strength indicators, legal basis, cited decisions
  - "Approfondisci" bridge action: asks model to stress-test a specific argument
  - "Export" bridge action: asks model to write synthesis to bcc-output/ file
  - Clickable citation references linking to W1 detail view

- **`present_adversarial_analysis` tool** on `legal-persona` server
  - Input schema matching adversarial-analysis skill output (advocate/adversary/judicial synthesis)
  - Renders W2 dashboard for MCP Apps clients
  - Structured text fallback for non-MCP-Apps clients

- **Regression tests** for text-only fallback backward compatibility

### Changed

- `bge-search` server: v2.0.0 → v2.1.0 — added `resources` capability, `_meta.ui` on search tools
- `entscheidsuche` server: v2.0.0 → v2.1.0 — added `resources` capability, `_meta.ui` on search/detail tools
- `legal-persona` HTTP factory: v1.0.0 → v1.1.0 — added `resources` capability, new tool

### Security / Privacy

- Zero external network requests from widget templates (no CDN, fonts, analytics, tracking)
- No telemetry in widget code
- Templates receive only tool result data, never credentials or server configuration
