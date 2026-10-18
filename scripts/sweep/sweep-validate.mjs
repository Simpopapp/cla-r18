// ===== sweep-validate.mjs — schema + faixas + C1–C4 (PRD2 §2, §8) =====
// Dev-time only. Valida lotes de candidatos normalizados (Fase 2+):
//   node scripts/sweep/sweep-validate.mjs <extracted.json>
// Regras: fonte aprovada em sources-sweep.json · evidência C1–C4 por item ·
// faixas do PRD1 §6.8 (RANGES) → fora da faixa vai para review.json, não descarta.
import { readJson, writeJson } from "../bank/lib.mjs";
import { SWEEP_FILE, REVIEW_FILE, EVIDENCE_KINDS, TIERS } from "./sweep-lib.mjs";
import { RANGES, TASK_TYPES, dedupeKey } from "../bank/lib.mjs";

const file = process.argv[2];
if (!file) {
  console.error("usage: sweep-validate.mjs <extracted.json>");
  process.exit(1);
}

const items = readJson(file, []);
const sources = readJson(SWEEP_FILE(), { sources: [] });
const approved = new Map(
  sources.sources
    .filter(
      (s) =>
        ["verificada", "corroborada", "comunitaria"].includes(s.status) ||
        (s.status ?? "").startsWith("aprovada"),
    )
    .map((s) => [s.id, s]),
);
const review = readJson(REVIEW_FILE(), { version: 1, items: [] });

function words(s) {
  return String(s ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}
function fieldOf(type, d) {
  const r = RANGES[type];
  if (!r) return null;
  if (type === "sgd") return (d.turns ?? []).length;
  return d[r.field];
}

const out = { valid: [], rejected: [], review: 0 };
for (const it of items) {
  const src = approved.get(it.source?.id ?? "");
  if (!src) {
    out.rejected.push({ why: "fonte não aprovada", id: it.source?.id });
    continue;
  }
  const ev = it.evidence ?? [];
  const kinds = new Set(ev.map((e) => e.kind));
  const hasEvidence = ev.length > 0 && [...kinds].some((k) => EVIDENCE_KINDS.includes(k));
  if (!hasEvidence) {
    out.rejected.push({ why: "sem evidência C1–C4", id: it.id });
    continue;
  }
  if (!TASK_TYPES.includes(it.type)) {
    out.rejected.push({ why: "tipo desconhecido", id: it.type });
    continue;
  }
  if (!dedupeKey(it.type, it)) {
    out.rejected.push({ why: "chave de dedupe vazia", id: it.id });
    continue;
  }
  const r = RANGES[it.type];
  if (r) {
    const v = fieldOf(it.type, it.data ?? {});
    const n = r.unit === "words" ? words(v) : Number(v ?? 0);
    if (n < r.min || n > r.max) {
      review.items.push({
        ...it,
        reviewReason: `${r.field} fora da faixa (${n} ${r.unit}, faixa ${r.min}–${r.max})`,
      });
      out.review++;
      continue;
    }
  }
  out.valid.push(it);
}
writeJson(REVIEW_FILE(), review);
writeJson(file.replace(/\.json$/, ".validated.json"), out);
console.log(
  JSON.stringify(
    { valid: out.valid.length, rejected: out.rejected.length, review: out.review },
    null,
    1,
  ),
);
