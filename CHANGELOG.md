# Changelog

## [Unreleased] — MCP Apps Phase 1 (Spec C)

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
