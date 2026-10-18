// ===== sweep-report.mjs — relatório da onda (PRD2 §13) =====
// Dev-time only. Agrega baseline + dedupe + lotes + revisão em um relatório:
//   node scripts/sweep/sweep-report.mjs
import { existsSync } from "node:fs";
import path from "node:path";
import { SWEEP_DIR, BASELINE_FILE, REVIEW_FILE } from "./sweep-lib.mjs";
import { readJson, writeJson } from "../bank/lib.mjs";
import { OUT, TASK_TYPES } from "../bank/lib.mjs";

const report = {
  version: 1,
  generatedAt: new Date().toISOString().slice(0, 10),
  phase: "Fase 0 — baseline (projeto 2)",
  baseline: existsSync(BASELINE_FILE()) ? readJson(BASELINE_FILE(), {}) : null,
  counts: {},
  review: existsSync(REVIEW_FILE()) ? readJson(REVIEW_FILE(), { items: [] }).items.length : 0,
  dedupe: existsSync(path.join(SWEEP_DIR, "report-dedupe.json"))
    ? readJson(path.join(SWEEP_DIR, "report-dedupe.json"), {})
    : null,
};
for (const t of TASK_TYPES) {
  const f = path.join(OUT, `${t}.json`);
  report.counts[t] = existsSync(f) ? readJson(f, []).length : 0;
}
report.total = Object.values(report.counts).reduce((a, b) => a + b, 0);
writeJson(path.join(SWEEP_DIR, "report.json"), report);
console.log(
  JSON.stringify({ total: report.total, byType: report.counts, review: report.review }, null, 1),
);
