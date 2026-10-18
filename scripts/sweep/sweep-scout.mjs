// ===== sweep-scout.mjs — descoberta adaptativa (PRD2 §5, Ap. D) =====
// Dev-time only. Registers candidate sources with evidence into
// .opencode/work/sweep/sources-sweep.json. Actual candidate discovery in
// Fase 1 runs via read-only subagent batches (lots/) — this script validates,
// merges and versions their output:
//   node scripts/sweep/sweep-scout.mjs .opencode/work/sweep/lots/sweep-lot-01.json
// Lot schema (subagent output — untrusted, re-verify every URL before gate):
//   [{ url, types: [], apparentVolume, positiveSignals: [], negativeSignals: [], quotes: [] }]
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { SWEEP_FILE } from "./sweep-lib.mjs";
import { readJson, writeJson } from "../bank/lib.mjs";

const SRC_FILE = SWEEP_FILE();
const lotsDir = path.join(path.dirname(SRC_FILE), "lots");

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error("usage: sweep-scout.mjs <lot.json ...>  (lots live in " + lotsDir + ")");
  process.exit(1);
}

const sources = readJson(SRC_FILE, { version: 1, updated: "", sources: [] });
const known = new Set(sources.sources.map((s) => s.url));
let added = 0,
  skipped = 0,
  invalid = 0;
for (const f of files) {
  const lot = readJson(f, []);
  if (!Array.isArray(lot)) {
    console.error(`lot ${f}: not an array, skipped`);
    invalid++;
    continue;
  }
  for (const c of lot) {
    if (!c || typeof c.url !== "string" || !/^https?:\/\//.test(c.url) || !Array.isArray(c.types)) {
      invalid++;
      continue;
    }
    if (known.has(c.url)) {
      skipped++;
      continue;
    }
    sources.sources.push({
      id: `cand-${sources.sources.length + 1}`,
      url: c.url,
      types: c.types,
      status: "candidata", // gate (PRD2 Ap. E) decides aprovada/reprovada
      operatorGroup: null, // set during gate
      evidence: {
        positiveSignals: c.positiveSignals ?? [],
        negativeSignals: c.negativeSignals ?? [],
        quotes: c.quotes ?? [],
      },
      apparentVolume: c.apparentVolume ?? null,
      origin: path.basename(f),
    });
    known.add(c.url);
    added++;
  }
}
sources.updated = new Date().toISOString().slice(0, 10);
writeJson(SRC_FILE, sources);
console.log(
  JSON.stringify({ added, skipped, invalid, totalCandidates: sources.sources.length }, null, 1),
);
