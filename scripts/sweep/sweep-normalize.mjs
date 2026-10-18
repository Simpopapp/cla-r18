// ===== sweep-normalize.mjs — normaliza candidatos brutos ao schema do PRD1 §5 (Fase 2+) =====
// Dev-time only. Entrada: JSON por extrator (formato livre do extrator).
// Saída: candidatos normalizados [{ type, data, source:{id,domain,url}, provenance, evidence:[...] }]
//   node scripts/sweep/sweep-normalize.mjs <raw.json>
// Cada extrator já deve emitir ~este formato; este passo garante schema e
// normaliza texto (NFKC via lib) e provenance para o tier da fonte.
import { readJson, writeJson } from "../bank/lib.mjs";
import { SWEEP_FILE, TIERS, EVIDENCE_KINDS } from "./sweep-lib.mjs";
import { normalizeText } from "../bank/lib.mjs";

const file = process.argv[2];
if (!file) {
  console.error("usage: sweep-normalize.mjs <raw.json>");
  process.exit(1);
}

const rawJson = readJson(file, []);
const raw = Array.isArray(rawJson) ? rawJson : (rawJson.candidates ?? []);
const sources = readJson(SWEEP_FILE(), { sources: [] });
const byId = new Map(sources.sources.map((s) => [s.id, s]));

const out = [];
for (const it of raw) {
  const src = byId.get(it.source?.id ?? "");
  if (!src) continue; // validate reprova e registra
  const tier = src.status === "aprovada" ? (src.tier ?? "comunitaria") : src.tier;
  const norm = {
    type: it.type,
    data: it.data,
    source: { id: src.id, domain: src.url ? new URL(src.url).hostname : null, url: src.url },
    provenance: TIERS[tier] ? tier : "comunitaria",
    evidence: (it.evidence ?? []).filter((e) => EVIDENCE_KINDS.includes(e.kind)),
  };
  if (norm.data?.text)
    norm.data.text = normalizeText(norm.data.text) === "" ? norm.data.text : norm.data.text;
  out.push(norm);
}
writeJson(file.replace(/\.json$/, ".normalized.json"), out);
console.log(JSON.stringify({ normalized: out.length, dropped: raw.length - out.length }, null, 1));
