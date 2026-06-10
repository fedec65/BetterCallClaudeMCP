# Architecture Decision: Presentation Tool Placement

## Context

Spec C (Phase 1) introduced MCP Apps widgets on three servers:
- `bge-search`: W1 jurisprudence browser
- `entscheidsuche`: W1 jurisprudence browser (shared template)
- `legal-persona`: W2 adversarial dashboard (`present_adversarial_analysis`)

The Phase 1 decision stated: _"tool su legal-persona; migrazione a micro-server UI dedicato solo se i tool di presentazione si moltiplicano in fase 2."_

Phase 2 adds:
- W3 citation validation panel → `legal-citations` (`review_citations`)
- W4 intake form → `legal-persona` (`present_intake_form`)
- W5 deadline calculator → new tool `compute_deadlines` (procedural domain)

## Options Evaluated

### A. Distributed (status quo)
Each presentation tool lives on the server closest to its domain:
- `present_adversarial_analysis` → `legal-persona` (strategy domain)
- `review_citations` → `legal-citations` (citation domain)
- `present_intake_form` → `legal-persona` (intake/strategy domain)
- `compute_deadlines` → `legal-persona` (procedural domain)

### B. Centralized micro-server `bcc-ui`
All presentation/widget tools on a single new server. Domain servers provide data; `bcc-ui` provides UI.

## Evaluation Criteria

| Criterion | Distributed (A) | Centralized (B) |
|---|---|---|
| **Railway overhead** | 0 extra services | +1 service, +1 deploy target |
| **Domain coupling** | Tools live next to the data they consume — `review_citations` composes `extract_citations`/`validate_citation` directly | Cross-server calls or shared library extraction needed |
| **User simplicity** | Users who connect only `legal-citations` get W3 automatically | Users must also connect `bcc-ui` to get widgets for any server |
| **Widget count** | ≤4 presentation tools across 2 servers | N/A (all in one) |
| **Migration cost** | None | Refactor Phase 1 tools + update all clients |

## Decision (2026-06-10)

**Stay distributed (Option A).**

With ≤4 presentation tools across 2 servers (`legal-citations`, `legal-persona`), the overhead of a dedicated UI server is not justified. The domain coupling advantage is significant: `review_citations` composes existing `legal-citations` logic (parser, validator, formatter) without cross-server calls, and `present_intake_form` naturally belongs alongside the legal strategy tools.

**Reassess when:** presentation tools exceed 5, or a server accumulates ≥3 presentation-only tools with no domain logic of their own.
