# Stage 06 — Inteligência (retroativo)

Date: 2026-10-17 UTC (written retroactively at the stage-07 monitor recommendation)
Status: delivered before Stage 07; reconstructed from the roadmap record of the delivery date.

## Delivered
- `queue` (smart/due/counts/errors), resumable sessions + `/session`, `diagnostics`, `estimate`, `readiness`, `goal`, `studyPlan`, `report`.
- Complete home (countdown, day plan, chips) and `/progress` (estimates, comparisons, SVG charts, errors, copyable/downloadable weekly report), plus the exam-readiness section in Settings.

## Gates (from the roadmap record of 2026-10-17)
- vitest 266/266 (+53 new in queue/estimate/goal/studyPlan/diagnostics/report/sessions) · tsgo clean · build OK · lint 0 errors (10 pre-existing warnings).
- Session resume after reload verified in Playwright (in-progress banner → resume → discard → completion → per-type summary → archive → history).
- No screen mixes scales: estimates always labeled "estimativa de treino" (10–90); exercise notes (0–100) kept separate.
- Zero new runtime dependencies; no generated files edited.

## Decisions recorded
- `emptyState()` now clones `DEFAULT_SETTINGS` — a shared empty-settings object leaked test mutations between tests.
- Attempts inside a session record with `mode: "session"` and advance the draft cursor in `PracticeEngine`.

## Honest limits
- This file is retroactive: the numbers above are the roadmap record from the delivery date, not re-measured today.
- Confidence labels on estimates below n = 10 are "baixa" by design (see estimate tests).
