// Extração de frases para tradução (PRD §13.3.2).
// Segmenta cada campo elegível (plusFieldPolicy) e emite
// { k: "<tipo>|<qid>|<campo>|<i>", s, p } em lotes de ~80 (k único por frase).
// Saída: .opencode/work/plus/phrases/in-NNN.json (P1 primeiro).

import { readFileSync, writeFileSync, mkdirSync, readdirSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { POLICY, priorityOf } from "./policy.mjs";

const ROOT = new URL("../../", import.meta.url).pathname;
const BANK = join(ROOT, "src/data/pte");
const OUT = join(ROOT, ".opencode/work/plus/phrases");

const ABBREVIATIONS = new Set(["e.g", "i.e", "etc", "vs", "Dr", "Mr", "Mrs", "Ms", "St"]);
function splitSentences(text) {
  const trimmed = text.trim();
  if (trimmed === "") return [];
  const out = [];
  let current = "";
  const chars = [...trimmed];
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    current += ch;
    if (ch === "." || ch === "!" || ch === "?") {
      if (ch === "." && /\{\{\d+\}\}$/.test(current)) continue;
      const next = chars[i + 1];
      const isBoundary = next === undefined || next === " " || next === "\n";
      if (isBoundary && !ABBREVIATIONS.has(/([\w.]+)$/.exec(current)?.[1] ?? "")) {
        out.push(current.trim());
        current = "";
      }
    }
  }
  if (current.trim() !== "") out.push(current.trim());
  return out;
}

function fieldItems(data, field) {
  const m = /^(\w+)\[(\d+)\]$/.exec(field);
  if (m) {
    const arr = data[m[1]];
    const v = arr?.[Number(m[2])];
    return typeof v === "string" ? [{ key: field, text: v }] : [];
  }
  const v = data[field];
  if (typeof v === "string") return [{ key: field, text: v }];
  if (Array.isArray(v)) {
    return v
      .filter((x) => typeof x === "string")
      .map((text, i) => ({ key: `${field}[${i}]`, text }));
  }
  return [];
}

const items = [];
const seenK = new Set();
for (const file of readdirSync(BANK).filter((f) => f.endsWith(".json"))) {
  const type = file.replace(".json", "");
  const rules = POLICY[type];
  if (!rules) continue;
  for (const q of JSON.parse(readFileSync(join(BANK, file), "utf8"))) {
    for (const [field, rule] of Object.entries(rules)) {
      for (const { key, text } of fieldItems(q.data, field)) {
        splitSentences(text).forEach((s, i) => {
          const k = `${type}|${q.id}|${key}|${i}`;
          if (seenK.has(k)) throw new Error(`k duplicado: ${k}`);
          seenK.add(k);
          items.push({ k, s, p: priorityOf(type, field), native: rule.nativeAudio });
        });
      }
    }
  }
}

items.sort((a, b) => {
  const rank = { P1: 0, P2: 1, P3: 2 };
  return rank[a.p] - rank[b.p] || a.k.localeCompare(b.k);
});

mkdirSync(OUT, { recursive: true });
for (const f of readdirSync(OUT)) if (f.startsWith("in-")) unlinkSync(join(OUT, f));
const BATCH = 80;
let batch = 0;
const byPriority = { P1: 0, P2: 0, P3: 0 };
for (const it of items) byPriority[it.p]++;
for (let i = 0; i < items.length; i += BATCH) {
  batch++;
  writeFileSync(
    join(OUT, `in-${String(batch).padStart(3, "0")}.json`),
    JSON.stringify(items.slice(i, i + BATCH), null, 2),
  );
}

console.log(JSON.stringify({ total: items.length, byPriority, batches: batch }, null, 2));
