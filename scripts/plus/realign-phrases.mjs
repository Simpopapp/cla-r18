// Realinha os índices das frases traduzidas ao splitSentences atual do app.
// Traduções cuja frase de origem deixou de existir como sentença própria
// (ex.: "Dr." que o divisor antigo separava) são descartadas — a linha fica
// honestamente sem tradução. Nunca inventa tradução.
import { readFileSync, writeFileSync } from "node:fs";

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
      if (isBoundary && !ABBREVIATIONS.has(lastWord(current))) {
        out.push(current.trim());
        current = "";
      }
    }
  }
  if (current.trim() !== "") out.push(current.trim());
  return out;
}

function lastWord(s) {
  const m = /([\w]+)\.?$/.exec(s);
  return m?.[1] ?? "";
}

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

const TYPES = process.argv.slice(2);
for (const type of TYPES) {
  const file = `src/data/plus/phrases/${type}.json`;
  const phrases = JSON.parse(readFileSync(file, "utf8"));
  const bank = JSON.parse(readFileSync(`src/data/pte/${type}.json`, "utf8"));
  const byId = new Map(bank.map((q) => [q.id, q]));
  let kept = 0,
    dropped = 0;
  const out = {};
  for (const [qid, fields] of Object.entries(phrases)) {
    const item = byId.get(qid);
    if (!item) {
      console.error(`qid órfão: ${qid}`);
      continue;
    }
    for (const [field, entries] of Object.entries(fields)) {
      const source = item.data[field];
      const text = Array.isArray(source) ? source.join(" ") : source;
      const sentences = splitSentences(text);
      // hash da tradução → tradução (as entradas antigas já trazem o h da origem)
      const byHash = new Map(entries.map((e) => [e.h, e]));
      const aligned = [];
      for (const sentence of sentences) {
        const entry = byHash.get(hashSentence(sentence));
        if (entry) {
          aligned.push(entry);
          kept++;
        } else {
          dropped++;
          aligned.push(null);
        }
      }
      // buracos viram null — lookupPhrase devolve "Tradução não disponível"
      out[qid] ??= {};
      out[qid][field] = aligned;
    }
  }
  const sorted = Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(file, JSON.stringify(sorted, null, 2) + "\n");
  console.log(`${type}: ${kept} mantidas, ${dropped} descartadas`);
}
