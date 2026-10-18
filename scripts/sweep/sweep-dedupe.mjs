// ===== sweep-dedupe.mjs — PRD projeto 2 §4, §6.1 (Fase 0) =====
// Dev-time only. Modes:
//   --baseline   fingerprint the existing bank (src/data/pte/*.json) into
//                .opencode/work/sweep/baseline.json + intra-bank sanity check
//                (expected: 0 near-duplicate pairs ≥ NEAR_THRESHOLD).
//   --candidates <files...>   dedupe new candidate items against the baseline
//                bank, intra-batch and across batches; emits corroboration
//                records and an alias/discard plan (used from Fase 2 on).
// Reuses scripts/bank/lib.mjs (normalization, similarity, keys) — single source of truth.
import { mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import path from "node:path";
import {
  ROOT,
  OUT,
  TASK_TYPES,
  readJson,
  writeJson,
  sha1,
  dedupeKey,
  dedupeTokens,
  jaccard,
  diceTrigram,
  NEAR_THRESHOLD,
} from "../bank/lib.mjs";

const SWEEP = path.join(ROOT, ".opencode", "work", "sweep");
for (const d of [
  SWEEP,
  path.join(SWEEP, "raw"),
  path.join(SWEEP, "extracted"),
  path.join(SWEEP, "lots"),
])
  mkdirSync(d, { recursive: true });

const baselineFile = path.join(SWEEP, "baseline.json");
const corroborationFile = path.join(SWEEP, "corroboration.json");

function fingerprint(type, q) {
  const key = dedupeKey(type, q);
  const toks = dedupeTokens(type, q);
  const prefix = key.slice(0, 200);
  return {
    key: sha1(key),
    prefix,
    tokens: toks,
    id: q.id,
    type,
    provenance: q.provenance ?? null,
    source: q.source?.domain ?? null,
  };
}

function similarity(a, b) {
  return Math.max(jaccard(a.tokens, b.tokens), diceTrigram(a.tokens, b.tokens));
}

function loadBank() {
  const items = [];
  for (const type of TASK_TYPES) {
    const file = path.join(OUT, `${type}.json`);
    if (!existsSync(file)) continue;
    const arr = readJson(file, []);
    for (const q of arr) items.push(fingerprint(type, q));
  }
  return items;
}

function baseline() {
  const items = loadBank();
  // Sanity: intra-bank near-duplicate scan (same type only — PRD1 §6.4).
  const dupes = [];
  const byType = new Map();
  for (const it of items) {
    if (!byType.has(it.type)) byType.set(it.type, []);
    byType.get(it.type).push(it);
  }
  for (const [type, group] of byType) {
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const sim = similarity(group[i], group[j]);
        if (sim >= NEAR_THRESHOLD)
          dupes.push({ type, a: group[i].id, b: group[j].id, sim: +sim.toFixed(3) });
      }
    }
  }
  const out = {
    version: 1,
    generatedAt: new Date().toISOString().slice(0, 10),
    algorithm: "sha1(normalizeText(key per type)); prefix200; tokens for Jaccard/Dice",
    totalItems: items.length,
    byType: Object.fromEntries([...byType].map(([t, g]) => [t, g.length]).sort()),
    items: items.map(({ tokens, ...rest }) => rest), // tokens recomputed on load (derived)
  };
  writeJson(baselineFile, out);
  const report = {
    mode: "baseline",
    totalItems: items.length,
    nearDupPairs: dupes.length,
    dupes: dupes.slice(0, 20),
  };
  writeJson(path.join(SWEEP, "report-baseline.json"), report);
  console.log(JSON.stringify(report, null, 1));
  if (dupes.length > 0) {
    console.error("FAIL: intra-bank near-duplicates found");
    process.exit(1);
  }
}

function bestMatch(fp, entries) {
  // entries: fingerprints do banco OU { fp, cand } do intra-lote.
  // Match (PRD2 §4.1): chave exata (hash igual), prefixo 200 igual ou
  // max(Jaccard, Dice) ≥ NEAR_THRESHOLD. Retorna o melhor.
  let best = null;
  for (const e of entries) {
    const it = e.fp ?? e;
    let sim;
    if (fp.key === it.key || fp.prefix === it.prefix) sim = 1;
    else {
      sim = similarity(fp, it);
      if (sim < NEAR_THRESHOLD) continue;
    }
    if (!best || sim > best.sim) best = { id: it.id, sim: +sim.toFixed(3), entry: e };
  }
  return best;
}

function candidates(files) {
  // PRD2 §4.2–§4.4: dedupe contra o banco atual → intra/entre fontes novas.
  // Match contra o banco: candidato NÃO integra; alimenta corroboração do
  // item existente (fonte independente). Entre fontes novas: integra UMA
  // cópia (evidências fundidas) + corroboração para todas as fontes.
  // Comparação contra o banco REAL (fingerprint completo inclui tokens;
  // baseline.json não guarda data/tokens — são derivados).
  if (!existsSync(baselineFile)) {
    console.error("Run --baseline first.");
    process.exit(1);
  }
  const bankByType = new Map();
  for (const it of loadBank()) {
    if (!bankByType.has(it.type)) bankByType.set(it.type, []);
    bankByType.get(it.type).push(it);
  }
  const corroboration = readJson(corroborationFile, { version: 1, pairs: [] });
  const plan = { files: {}, integrated: 0, corroborated: 0, discarded: [] };
  let seq = 0;

  for (const file of files) {
    const doc = readJson(file, null);
    const wrapped = doc && !Array.isArray(doc);
    const cands = wrapped ? (doc.valid ?? []) : (doc ?? []);
    const accepted = [];
    const byType = new Map(); // type → [{ fp, cand }] já aceitos (intra-lote)
    for (const cand of cands) {
      const fp = fingerprint(cand.type, {
        id: `cand-${seq}`,
        data: cand.data,
        provenance: cand.provenance,
        source: cand.source,
      });
      seq++;
      const src = cand.source?.domain ?? null;

      // 1) dedupe contra o banco atual (PRD2 §4.2) — obrigatório e primeiro
      const bankHit = bestMatch(fp, bankByType.get(cand.type) ?? []);
      if (bankHit) {
        plan.discarded.push({
          cand: fp.id,
          why: "match banco",
          match: bankHit.id,
          sim: bankHit.sim,
          source: src,
        });
        corroboration.pairs.push({
          key: fp.key,
          matched: bankHit.id,
          source: src,
          sim: bankHit.sim,
        });
        plan.corroborated++;
        continue;
      }

      // 2) entre fontes novas (PRD2 §4.3): repetição é evidência, não perda
      const hit = bestMatch(fp, byType.get(cand.type) ?? []);
      if (hit) {
        const winner = hit.entry.cand;
        for (const ev of cand.evidence ?? []) {
          if (!winner.evidence.some((e) => e.url === ev.url && e.detail === ev.detail))
            winner.evidence.push(ev);
        }
        plan.discarded.push({
          cand: fp.id,
          why: "match intra-lote",
          match: hit.id,
          sim: hit.sim,
          source: src,
        });
        corroboration.pairs.push({ key: fp.key, matched: hit.id, source: src, sim: hit.sim });
        plan.corroborated++;
        continue;
      }

      accepted.push(cand);
      if (!byType.has(cand.type)) byType.set(cand.type, []);
      byType.get(cand.type).push({ fp, cand });
    }
    plan.files[path.basename(file)] = { candidates: cands.length, integrated: accepted.length };
    plan.integrated += accepted.length;
    if (wrapped) writeJson(file, { ...doc, valid: accepted });
    else writeJson(file, accepted);
  }
  writeJson(corroborationFile, corroboration);
  writeJson(path.join(SWEEP, "report-dedupe.json"), plan);
  console.log(
    JSON.stringify(
      {
        ...plan.files,
        integrated: plan.integrated,
        corroborated: plan.corroborated,
        discarded: plan.discarded.length,
        corroborationPairs: corroboration.pairs.length,
      },
      null,
      1,
    ),
  );
}

const args = process.argv.slice(2);
if (args[0] === "--baseline") baseline();
else if (args[0] === "--candidates") candidates(args.slice(1));
else {
  console.error("usage: sweep-dedupe.mjs --baseline | --candidates <files...>");
  process.exit(1);
}
