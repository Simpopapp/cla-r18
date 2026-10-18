// Merge determinístico das frases (PRD §13.3.4).
// Valida invariantes (todo k do lote presente exatamente 1×; tamanhos; h bate),
// nunca sobrescreve entrada válida, ordena chaves e grava
// src/data/plus/phrases/<tipo>.json. Uso:
//   node scripts/plus/merge-phrases.mjs [dir-com-lotes]
// (default: .opencode/work/plus/phrases-p1w)

import { readFileSync, writeFileSync, readdirSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { POLICY, priorityOf } from "./policy.mjs";

const ROOT = new URL("../../", import.meta.url).pathname;
const WORK = process.argv[2]
  ? join(ROOT, process.argv[2])
  : join(ROOT, ".opencode/work/plus/phrases-p1w");
const OUT = join(ROOT, "src/data/plus/phrases");

// hash canônico — mesmo algoritmo de src/lib/plus/phrases.ts
function normalizeSentenceForHash(s) {
  return s
    .replaceAll("\u2019", "'")
    .replaceAll("{{", " ")
    .replaceAll("}}", " ")
    .replace(/\d+/g, "#")
    .toLowerCase()
    .replace(/[^\w'-]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}
function hashSentence(sentence) {
  const normalized = normalizeSentenceForHash(sentence);
  let hash = 0x811c9dc5;
  for (let i = 0; i < normalized.length; i++) {
    hash ^= normalized.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

const inItems = new Map();
for (const f of readdirSync(WORK)
  .filter((f) => /^in-\d+\.json$/.test(f))
  .sort()) {
  for (const it of JSON.parse(readFileSync(join(WORK, f), "utf8"))) inItems.set(it.k, it);
}

// traduções: out-NNN.json valida contra o lote in-NNN; out-gN.json valida
// contra o conjunto global de k's (tradutor devolveu lotes mesclados)
const translations = new Map();
const errors = [];
for (const f of readdirSync(WORK)
  .filter((f) => /^out-\w+\.json$/.test(f))
  .sort()) {
  const batch = f.match(/^out-(\d+)\.json$/)?.[1];
  const batchKs = batch
    ? new Set(JSON.parse(readFileSync(join(WORK, `in-${batch}.json`), "utf8")).map((it) => it.k))
    : inItems;
  const { t } = JSON.parse(readFileSync(join(WORK, f), "utf8"));
  if (!Array.isArray(t)) throw new Error(`lote ${f}: "t" não é array`);
  for (const e of t) {
    if (!batchKs.has(e.k)) throw new Error(`lote ${f}: k fora do lote: ${e.k}`);
    if (translations.has(e.k)) throw new Error(`k traduzido 2×: ${e.k}`);
    translations.set(e.k, e);
  }
}

// montagem: tipo → qid → campo → array indexado por posição da frase
const byType = new Map();
let missing = 0;
for (const [k, item] of inItems) {
  const [type, qid, field, indexStr] = k.split("|");
  const index = Number(indexStr);
  const e = translations.get(k);
  if (!e) {
    missing++;
    continue;
  }
  if (typeof e.l !== "string" || e.l.length === 0 || e.l.length > 400) {
    errors.push(`${k}: literal vazio/longo`);
    continue;
  }
  if (e.c !== undefined && (typeof e.c !== "string" || e.c.length > 200)) {
    errors.push(`${k}: sentido geral longo`);
    continue;
  }
  const h = hashSentence(item.s);
  if (!POLICY[type]?.[field.replace(/\[\d+\]$/, "")]) {
    errors.push(`${k}: campo fora da política`);
    continue;
  }
  if (!byType.has(type)) byType.set(type, new Map());
  const byQid = byType.get(type);
  if (!byQid.has(qid)) byQid.set(qid, new Map());
  const byField = byQid.get(qid);
  if (!byField.has(field)) byField.set(field, []);
  byField.get(field)[index] = { h, l: e.l, c: e.c ?? "" };
}
if (errors.length > 0)
  console.error(`Entradas inválidas (${errors.length}):\n` + errors.join("\n"));

mkdirSync(OUT, { recursive: true });
let written = 0;
for (const [type, byQid] of byType) {
  const file = join(OUT, `${type}.json`);
  const existing = JSON.parse(readFileSync(file, "utf8"));
  const merged = { ...existing };
  for (const [qid, byField] of byQid) {
    merged[qid] ??= {};
    for (const [field, entries] of byField) {
      if (merged[qid][field]?.length > 0) continue; // nunca sobrescreve entrada válida
      // buracos (índice ausente) invalidam o array — só grava completo
      if (entries.some((e) => e === undefined)) continue;
      merged[qid][field] = entries;
      written += entries.length;
    }
  }
  const sorted = Object.fromEntries(
    Object.entries(merged)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([qid, fields]) => [
        qid,
        Object.fromEntries(Object.entries(fields).sort(([a], [b]) => a.localeCompare(b))),
      ]),
  );
  writeFileSync(file, JSON.stringify(sorted, null, 2) + "\n");
}

const byPriority = {
  P1: { total: 0, done: 0 },
  P2: { total: 0, done: 0 },
  P3: { total: 0, done: 0 },
};
for (const [k] of inItems) {
  const [type, , field] = k.split("|");
  const p = priorityOf(type, field.replace(/\[\d+\]$/, ""));
  byPriority[p].total++;
  if (translations.has(k)) byPriority[p].done++;
}
console.log(
  JSON.stringify(
    {
      total: inItems.size,
      translated: translations.size,
      missing,
      writtenNow: written,
      byPriority,
    },
    null,
    2,
  ),
);
