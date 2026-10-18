// ===== extract-reorder — reorder_paragraphs de goarno + edknot =====
// Uso: node scripts/bank/extract-reorder.mjs
import { WORK, RAW, writeJson, makeId, readJson } from "./lib.mjs";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

function cleanLines(html) {
  let h = html.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "");
  h = h
    .replace(/<[^>]+>/g, "\n")
    .replace(/&nbsp;/g, " ")
    .replace(/&/g, "&")
    .replace(/"/g, '"')
    .replace(/&#x27;|&#39;|'/g, "'")
    .replace(/&rsquo;/g, "’")
    .replace(/&ldquo;|&rdquo;/g, "”")
    .replace(/>/g, ">")
    .replace(/</g, "<");
  return h
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

const items = [];

// ---- goarno: "Example N", 5 parágrafos, "Answer:", "4, 2, 5, 3, 1", texto na ordem ----
{
  const p = path.join(RAW, "goarno-reorder.html");
  if (existsSync(p)) {
    const lines = cleanLines(readFileSync(p, "utf8"));
    const blocks = [];
    let cur = null;
    for (const l of lines) {
      const m = l.match(/^(Example|Question)\s+(\d+)\s*$/);
      if (m) {
        if (cur) blocks.push(cur);
        cur = { n: Number(m[2]), lines: [] };
      } else if (cur) cur.lines.push(l);
    }
    if (cur) blocks.push(cur);
    let seq = 0;
    for (const b of blocks) {
      const ansIdx = b.lines.findIndex((l) => l.toLowerCase() === "answer:");
      if (ansIdx < 0) continue;
      const paragraphs = b.lines.slice(0, ansIdx);
      if (paragraphs.length < 4 || paragraphs.length > 6) continue;
      const orderRaw = b.lines[ansIdx + 1] ?? "";
      const order = orderRaw
        .split(",")
        .map((x) => Number(x.trim()))
        .filter(Number.isInteger);
      if (order.length !== paragraphs.length) continue;
      // paragraphs[] na ordem CORRETA: order[k] = posição (1-based) do parágrafo original na ordem final
      const correct = order.map((pos) => paragraphs[pos - 1]);
      if (correct.some((x) => !x)) continue;
      seq++;
      items.push({
        id: makeId("goarno", "reorder_paragraphs", seq),
        type: "reorder_paragraphs",
        source: {
          domain: "goarno.io",
          url: "https://goarno.io/blog/50-re-order-paragraphs-examples-pte/",
          attribution: "Arno (goarno.io) — Re-order Paragraphs, acesso 2026-10-17",
        },
        provenance: "comunitaria",
        data: { paragraphs: correct },
      });
    }
    console.log(`reorder (goarno): ${seq}`);
  }
}

// ---- edknot: N, título, N, parágrafos numerados (embaralhados), "Correct order", parágrafos numerados na ordem ----
{
  const p = path.join(RAW, "edknot-reorder.html");
  if (existsSync(p)) {
    const lines = cleanLines(readFileSync(p, "utf8"));
    let seq = 0;
    for (let i = 0; i < lines.length; i++) {
      if (!/^\d+$/.test(lines[i])) continue;
      const n = Number(lines[i]);
      const title = lines[i + 1] ?? "";
      if (!lines[i + 2] || !/^\d+$/.test(lines[i + 2])) continue;
      const mIdx = lines.findIndex((l, k) => k > i && l.toLowerCase() === "correct order");
      if (mIdx < 0 || mIdx > i + 30) continue;
      // parágrafos embaralhados: pares (número, texto) até mIdx
      const jumbled = [];
      let j = i + 2;
      while (j + 1 < mIdx) {
        if (/^\d+$/.test(lines[j]) && lines[j + 1]) {
          jumbled.push({ n: Number(lines[j]), text: lines[j + 1] });
          j += 2;
        } else break;
      }
      // ordem correta: pares (posição, texto) após "Correct order", até "Reorder it in the player"
      const correct = [];
      let k = mIdx + 1;
      while (k + 1 < lines.length) {
        if (!/^\d+$/.test(lines[k])) break;
        if (/Reorder it in the player|How it is scored/i.test(lines[k + 1])) break;
        if (/^\d+$/.test(lines[k + 1])) break;
        correct.push(lines[k + 1]);
        k += 2;
      }
      if (jumbled.length < 4 || jumbled.length > 6 || correct.length !== jumbled.length) continue;
      // validação: textos da ordem correta = conjunto dos embaralhados
      const setJ = new Set(jumbled.map((x) => x.text));
      if (correct.some((t) => !setJ.has(t))) continue;
      seq++;
      items.push({
        id: makeId("edknot", "reorder_paragraphs", seq),
        type: "reorder_paragraphs",
        topic: title,
        source: {
          domain: "edknot.com",
          url: "https://www.edknot.com/pte-practice/reorder-paragraph",
          attribution: "EdKnot — Re-order Paragraphs (12 itens), acesso 2026-10-17",
        },
        provenance: "comunitaria",
        data: { paragraphs: correct },
      });
      i = k;
    }
    console.log(`reorder (edknot): ${seq}`);
  }
}

writeJson(path.join(WORK, "extracted", "reorder_paragraphs.json"), items);

// registra fontes (sem duplicar)
const sp = path.join(WORK, "sources.json");
const sources = readJson(sp, { sources: [] });
const add = [
  {
    id: "goarno-reorder",
    domain: "goarno.io",
    url: "https://goarno.io/blog/50-re-order-paragraphs-examples-pte/",
    name: "Arno — 50 Re-order Paragraphs examples",
    types: ["reorder_paragraphs"],
    volume: "exemplos com gabarito e texto na ordem correta",
    evidence:
      "Página pública 200 OK sem login (cache 2026-10-17); gabarito explícito; amostra manual de 6 itens",
    confidence: 64,
    status: "aprovada",
    provenance: "comunitaria",
    license: "sem licença de reuso declarada; uso local e pessoal",
    notes:
      "Suspeita de geração sintética alta (scout 2026-10-17) — itens rotulados comunitaria; texto de 4–6 parágrafos verificado na extração.",
    checkedAt: "2026-10-17",
  },
  {
    id: "edknot-reorder",
    domain: "edknot.com",
    url: "https://www.edknot.com/pte-practice/reorder-paragraph",
    name: "EdKnot — Re-order Paragraphs (12 itens)",
    types: ["reorder_paragraphs"],
    volume: "12 itens com ordem correta visível",
    evidence:
      "Página pública 200 OK sem login (cache 2026-10-17); gabarito explícito; amostra manual de 2 itens",
    confidence: 65,
    status: "aprovada",
    provenance: "comunitaria",
    license: "sem licença de reuso declarada; uso local e pessoal",
    checkedAt: "2026-10-17",
  },
];
const ids = new Set(sources.sources.map((s) => s.id));
for (const s of add) if (!ids.has(s.id)) sources.sources.push(s);
writeJson(sp, sources);
console.log("sources.json atualizado");
