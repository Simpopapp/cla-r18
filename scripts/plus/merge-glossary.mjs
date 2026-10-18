// Merge determinístico do glossário (PRD §13.3.4).
// Valida invariantes, nunca sobrescreve entrada válida, ordena chaves e grava
// src/data/plus/glossary.json. Lote inválido é rejeitado com erro (refazer).
// Uso: node scripts/plus/merge-glossary.mjs

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("../../", import.meta.url).pathname;
const WORK = join(ROOT, ".opencode/work/plus/words");
const OUT = join(ROOT, "src/data/plus/glossary.json");

const inFiles = readdirSync(WORK)
  .filter((f) => /^in-\d+\.json$/.test(f))
  .sort();
const inWords = new Set();
for (const f of inFiles) {
  for (const w of JSON.parse(readFileSync(join(WORK, f), "utf8")).words) inWords.add(w);
}

// traduções: out-NNN.json valida contra o lote in-NNN; out-gN.json valida
// contra o conjunto global de candidatas (tradutor devolveu lotes mesclados)
const translations = new Map();
let outFiles = 0;
for (const f of readdirSync(WORK)
  .filter((f) => /^out-\w+\.json$/.test(f))
  .sort()) {
  outFiles++;
  const batch = f.match(/^out-(\d+)\.json$/)?.[1];
  const batchWords = batch
    ? new Set(JSON.parse(readFileSync(join(WORK, `in-${batch}.json`), "utf8")).words)
    : inWords;
  const { t } = JSON.parse(readFileSync(join(WORK, f), "utf8"));
  if (!Array.isArray(t)) throw new Error(`lote ${f}: "t" não é array`);
  for (const e of t) {
    if (!batchWords.has(e.w)) throw new Error(`lote ${f}: palavra fora do lote: ${e.w}`);
    if (translations.has(e.w)) throw new Error(`palavra traduzida 2×: ${e.w}`);
    translations.set(e.w, e);
  }
}

const INVALID = /(^[^\wáéíóúâêôãõçàü]+|[^\wáéíóúâêôãõçàü]+$)/i;
function validate(e) {
  const literal = e.literal;
  if (typeof literal !== "string" || literal.length === 0 || literal.length > 60)
    return "literal vazio/longo";
  if (literal !== literal.toLowerCase()) return "literal não minúsculo";
  if (literal.split(/\s+/).length > 3) return "literal > 3 palavras";
  if (INVALID.test(literal)) return "literal com pontuação externa";
  if (literal.toLowerCase() === e.w.toLowerCase()) return "tradução = palavra inglesa";
  if (e.contextual !== null && e.contextual !== undefined) {
    if (typeof e.contextual !== "string" || e.contextual.length > 80) return "contextual longo";
    if (e.contextual.toLowerCase() === literal.toLowerCase()) return "contextual = literal";
  }
  return null;
}

const existing = JSON.parse(readFileSync(OUT, "utf8"));
const glossary = { ...existing };
let merged = 0;
let invalid = 0;
const errors = [];
for (const [word, e] of translations) {
  if (existing[word]) {
    merged++; // entrada válida existente nunca é sobrescrita
    continue;
  }
  const problem = validate(e);
  if (problem) {
    invalid++;
    errors.push(`${word}: ${problem}`);
    continue;
  }
  const entry = { literal: e.literal };
  if (e.contextual) entry.contextual = e.contextual;
  glossary[word] = entry;
  merged++;
}
if (errors.length > 0) {
  console.error(`Entradas inválidas rejeitadas (${invalid}):\n` + errors.join("\n"));
}

const sorted = Object.fromEntries(Object.entries(glossary).sort(([a], [b]) => a.localeCompare(b)));
writeFileSync(OUT, JSON.stringify(sorted, null, 2) + "\n");

const omitted = inWords.size - translations.size;
console.log(
  JSON.stringify(
    {
      candidates: inWords.size,
      translated: translations.size,
      merged: merged + Object.keys(existing).length - Object.keys(existing).length,
      totalInFile: Object.keys(sorted).length,
      invalid,
      omitted,
      coverage: +(translations.size / inWords.size).toFixed(4),
      batches: outFiles,
    },
    null,
    2,
  ),
);
if (translations.size / inWords.size < 0.95) {
  console.error(
    `Cobertura ${(translations.size / inWords.size).toFixed(3)} < 0,95 — complete os lotes que faltam.`,
  );
  process.exitCode = 1;
}
