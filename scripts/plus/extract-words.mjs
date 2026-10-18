// Extração de palavras candidatas para o glossário (PRD §13.3.1).
// Varre os campos elegíveis do banco final, tokeniza (^[a-z]+(-[a-z]+)*$,
// 2–30 letras), conta frequências e seleciona candidatas por frequência até
// cobrir ≥ 97% das ocorrências (teto 8.000; PLUS_MAX_WORDS limita p/ tradução).
// Saída: .opencode/work/plus/words/in-NNN.json (lotes de 200).

import { readFileSync, writeFileSync, mkdirSync, readdirSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { POLICY } from "./policy.mjs";

const ROOT = new URL("../../", import.meta.url).pathname;
const BANK = join(ROOT, "src/data/pte");
const OUT = join(ROOT, ".opencode/work/plus/words");

const WORD_RE = /^[a-z]+(-[a-z]+)*$/;
const norm = (raw) =>
  raw
    .replaceAll("\u2019", "'")
    .toLowerCase()
    .replace(/^[^\w'-]+|[^\w'-]+$/g, "");

function splitWords(text) {
  return text
    .split(/\s+/)
    .map(norm)
    .filter((w) => WORD_RE.test(w) && w.length >= 2 && w.length <= 30);
}

function fieldTexts(data, field) {
  const m = /^(\w+)\[(\d+)\]$/.exec(field);
  if (m) {
    const arr = data[m[1]];
    return arr && typeof arr[Number(m[2])] === "string" ? [arr[Number(m[2])]] : [];
  }
  const v = data[field];
  if (typeof v === "string") return [v];
  if (Array.isArray(v)) return v.filter((x) => typeof x === "string");
  return [];
}

const freq = new Map();
let totalOccurrences = 0;
const files = readdirSync(BANK).filter((f) => f.endsWith(".json"));
for (const file of files) {
  const type = file.replace(".json", "");
  const rules = POLICY[type];
  if (!rules) continue;
  const questions = JSON.parse(readFileSync(join(BANK, file), "utf8"));
  for (const q of questions) {
    for (const [field] of Object.entries(rules)) {
      for (const text of fieldTexts(q.data, field)) {
        for (const w of splitWords(text)) {
          totalOccurrences++;
          freq.set(w, (freq.get(w) ?? 0) + 1);
        }
      }
    }
  }
}

const cap = Math.min(Number(process.env.PLUS_MAX_WORDS ?? 8000), 8000);
const sorted = [...freq.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
const candidates = [];
let covered = 0;
for (const [word, count] of sorted) {
  if (candidates.length >= cap) break;
  candidates.push(word);
  covered += count;
  if (covered / totalOccurrences >= 0.97) break;
}

mkdirSync(OUT, { recursive: true });
for (const f of readdirSync(OUT)) if (f.startsWith("in-")) unlinkSync(join(OUT, f));
const BATCH = 200;
let batch = 0;
for (let i = 0; i < candidates.length; i += BATCH) {
  batch++;
  writeFileSync(
    join(OUT, `in-${String(batch).padStart(3, "0")}.json`),
    JSON.stringify({ batch, words: candidates.slice(i, i + BATCH) }, null, 2),
  );
}

console.log(
  JSON.stringify(
    {
      totalOccurrences,
      uniqueWords: freq.size,
      candidates: candidates.length,
      coverage: +(covered / totalOccurrences).toFixed(4),
      batches: batch,
    },
    null,
    2,
  ),
);
