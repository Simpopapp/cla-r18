// ===== extract-wave2.mjs — extrator da onda 2 (Fase 3, PRD2 §6.1) =====
// Dev-time only. Fontes aprovadas onda 2 → candidatos normalizados.
//   node scripts/sweep/extract-wave2.mjs
// Entradas: raws em cache (.opencode/work/sweep/raw/, hash sha1(url)[:16]).
// Saída: .opencode/work/sweep/extracted/wave2-extracted.json
// Rejeições honestas: EdKnot MCQ (gabarito só no player) e demais fontes
// reprovadas no gate NÃO extraem (PRD2 §1.4 — sem gabarito, sem item).
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { ROOT } from "./sweep-lib.mjs";

const RAW = path.join(ROOT, ".opencode", "work", "sweep", "raw");
const OUT = path.join(ROOT, ".opencode", "work", "sweep", "extracted");
mkdirSync(OUT, { recursive: true });

const CAPTURED = "2026-10-18";

const SOURCES = {
  goarno_retell: {
    raw: "38f10827ff23cadf",
    url: "https://goarno.io/blog/re-tell-lecture-practice-questions-with-answers-pte-essential-questions/",
    catalog: "cand-42",
    evidence: {
      kind: "editorial",
      detail:
        "GoArno “Essential Questions” — 50 retell lectures com transcript completo e resposta-modelo no HTML (re-verificado no cache); capturado 2026-10-18.",
    },
  },
  goarno_dropdown: {
    raw: "ac9f8ae8ab013fa6",
    url: "https://goarno.io/blog/fill-in-the-blanks-dropdown-practice-questions-with-answers-pte-essential-questions/",
    catalog: "cand-46",
    evidence: {
      kind: "editorial",
      detail:
        "GoArno “Essential Questions” — 50 passagens dropdown com opções por lacuna e gabarito explícitos no HTML (re-verificado no cache); capturado 2026-10-18.",
    },
  },
  goarno_mcq: {
    raw: "e6840432997f7d98",
    url: "https://goarno.io/blog/multiple-choice-single-answer-reading-practice-questions-with-answers-pte-essential-questions/",
    catalog: "cand-54",
    evidence: {
      kind: "editorial",
      detail:
        "GoArno “Essential Questions” — 50 MCQ single answer com passagem, 4 opções e resposta explícitos no HTML (re-verificado no cache); capturado 2026-10-18.",
    },
  },
  edknot_dropdown: {
    raw: "5507ecf0ab13dd2a",
    url: "https://www.edknot.com/pte-practice/reading-dropdown-blanks",
    catalog: "cand-47",
    evidence: {
      kind: "editorial",
      detail:
        "EdKnot bank — 12 passagens dropdown com opções, gabarito e JSON-LD estruturado (Quiz/hasPart); atualizado 2026-10-06; capturado 2026-10-18.",
    },
  },
  ptehelper_swt: {
    raw: "635e4ec5b792caa1",
    url: "https://ptehelper.com.au/pte-summarize-written-text-with-answers/",
    catalog: "cand-55",
    evidence: {
      kind: "editorial",
      detail:
        "PTE Helper — 3 itens SWT completos (Original Text 150+ palavras + Solution em 1 frase, 54–67 palavras) no HTML; capturado 2026-10-18.",
    },
  },
  pteprep_reorder: {
    raw: "fa2ba95708a37dcd",
    url: "https://www.pteexampreparation.com/pte-reading/re-order-paragraphs/pte-academic-reading-reorder-paragraphs-practice-sample-answers/",
    catalog: "cand-56",
    evidence: {
      kind: "exam-mention",
      detail:
        "PTE Exam Preparation — título “PTE Repeated Reorder Paragraphs”; 5 itens (31–35) com blocos rotulados e ordem-correta explícita no HTML; conteúdo de 2018; capturado 2026-10-18.",
    },
  },
};

const candidates = [];
const skipped = {};

function stripTags(html) {
  return String(html ?? "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "") // sumários de âncora (ez-toc) confundem os marcadores
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&#8211;|&ndash;/g, "–")
    .replace(/&#8212;|&mdash;/g, "—")
    .replace(/&#8217;|&rsquo;/g, "’")
    .replace(/&#8216;|&lsquo;/g, "‘")
    .replace(/&#8220;|&ldquo;/g, "“")
    .replace(/&#8221;|&rdquo;/g, "”")
    .replace(/&amp;/g, "&")
    .replace(/&#\d+;/g, (m) => {
      try {
        return String.fromCodePoint(Number(m.slice(2, -1)));
      } catch {
        return " ";
      }
    });
}

function clean(s) {
  return String(s ?? "")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .trim();
}

function raw(name) {
  return readFileSync(path.join(RAW, name), "utf8");
}

function push(sourceId, type, data, extra = {}) {
  const src = SOURCES[sourceId];
  const domain = new URL(src.url).hostname.replace(/^www\./, "");
  candidates.push({
    type,
    data,
    ...extra,
    source: { id: src.catalog, domain, url: src.url },
    provenance: "comunitaria",
    evidence: [
      {
        sourceId,
        url: src.url,
        capturedAt: CAPTURED,
        kind: src.evidence.kind,
        detail: src.evidence.detail,
      },
    ],
  });
}

// keywords determinísticas (top-6 palavras de conteúdo por frequência) —
// mesmo critério do projeto 1 (extract-pearson-edknot.mjs)
const STOP = new Set(
  (
    "the this that these those and but for with from into over under about their there " +
    "which where when while what whom whose have has had will would could should " +
    "they them then than thus also more most some such only very much many been being " +
    "were was are our your your you its it's one two other others another because " +
    "after before between during through without within upon among across against " +
    "make made take taken give given get used using even ever still just like well " +
    "said says say more less same each both few own same so no nor not only"
  )
    .split(" ")
    .filter(Boolean),
);
function keywordsOf(text, n = 6) {
  const words = String(text ?? "")
    .toLowerCase()
    .replace(/[^a-z\s'-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3 && !STOP.has(w));
  const freq = new Map();
  for (const w of words) freq.set(w, (freq.get(w) ?? 0) + 1);
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, n)
    .map(([w]) => w);
}

function words(s) {
  return String(s ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

// ---- goarno retell_lecture: h2 Question N · Transcript · Sample Answer ----
{
  const html = raw(SOURCES.goarno_retell.raw);
  const parts = html.split(/<h2 id="question-\d+">Question \d+<\/h2>/).slice(1);
  let ok = 0;
  for (const part of parts) {
    const t = /<strong>Transcript:<\/strong>\s*<em>([\s\S]*?)<\/em>/.exec(part);
    const s = /Sample Answer:<\/strong>[\s\S]*?<p><em>([\s\S]*?)<\/em>/.exec(part);
    if (!t) continue;
    const transcript = clean(stripTags(t[1]));
    const sample = s ? clean(stripTags(s[1])) : undefined;
    const nw = words(transcript);
    if (nw < 80 || nw > 260) continue; // fora da faixa oficial → não extraí (honesto)
    push("goarno_retell", "retell_lecture", {
      transcript,
      keywords: keywordsOf(transcript),
      ...(sample && words(sample) > 10 ? { sample } : {}),
    });
    ok++;
  }
  if (parts.length !== ok)
    skipped[`goarno_retell (${parts.length - ok})`] =
      "transcript ausente ou fora da faixa 80–260 palavras";
}

// ---- goarno read_fib_dropdown: lacuna ______(n) + Blank n options/answers ----
{
  const html = raw(SOURCES.goarno_dropdown.raw);
  const parts = html.split(/<h2 id="question-\d+">Question \d+<\/h2>/).slice(1);
  let ok = 0;
  for (const part of parts) {
    const p = /<p>((?:(?!<p>)[\s\S])*?______\(\d+\)[\s\S]*?)<\/p>/.exec(part);
    if (!p) continue;
    const passage = clean(stripTags(p[1])).replace(/_+\s*\((\d+)\)/g, "{{$1}}");
    const blanks = [];
    let bad = false;
    const optRe = /<strong>Blank (\d+) options:<\/strong>\s*([^<]+)/g;
    const ansRe = /Blank (\d+):\s*<em>([^<]+)<\/em>/g;
    const opts = new Map();
    let m;
    while ((m = optRe.exec(part))) opts.set(Number(m[1]), m[2]);
    const answers = new Map();
    while ((m = ansRe.exec(part))) answers.set(Number(m[1]), clean(m[2]));
    for (const [n, list] of [...opts.entries()].sort((a, b) => a[0] - b[0])) {
      const options = list.split(",").map((s) => clean(s));
      const ans = answers.get(n);
      const idx = options.findIndex((o) => o.toLowerCase() === (ans ?? "").toLowerCase());
      if (options.length < 3 || idx < 0) {
        bad = true;
        break;
      }
      blanks.push({ options, answer: idx });
    }
    if (bad || blanks.length === 0) continue;
    push("goarno_dropdown", "read_fib_dropdown", { passage, blanks });
    ok++;
  }
  if (parts.length !== ok)
    skipped[`goarno_dropdown (${parts.length - ok})`] =
      "lacuna sem 3+ opções ou gabarito fora das opções";
}

// ---- goarno read_mcq_single: passagem + pergunta + a)–d) + Answer: letra ----
{
  const html = raw(SOURCES.goarno_mcq.raw);
  const parts = html.split(/<h2 id="question-\d+">Question \d+<\/h2>/).slice(1);
  let ok = 0;
  for (const part of parts) {
    const ps = [...part.matchAll(/<p>([\s\S]*?)<\/p>/g)].map((x) => clean(stripTags(x[1])));
    if (ps.length < 6) continue;
    const passage = ps[0];
    const question = ps[1];
    const options = ps.slice(2, 6).map((s) => s.replace(/^[a-e]\)\s*/, ""));
    const a = /<strong>Answer:<\/strong>\s*<em>\s*([a-e])\s*<\/em>/.exec(part);
    if (!passage || !question || options.length !== 4 || !a) continue;
    if (options.some((o) => !o)) continue;
    push("goarno_mcq", "read_mcq_single", {
      passage,
      question,
      options,
      answer: "abcde".indexOf(a[1]),
    });
    ok++;
  }
  if (parts.length !== ok)
    skipped[`goarno_mcq (${parts.length - ok})`] =
      "estrutura incompleta (passagem/opções/resposta)";
}

// ---- edknot read_fib_dropdown: JSON-LD Quiz.hasPart + opções/gabarito no card ----
{
  const html = raw(SOURCES.edknot_dropdown.raw);
  const ld = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(html);
  const graph = JSON.parse(ld[1])["@graph"];
  const quiz = graph.find((x) => Array.isArray(x["@type"]) && x["@type"].includes("Quiz"));
  const parts = quiz.hasPart;
  let ok = 0;
  for (let i = 0; i < parts.length; i++) {
    const card = html.slice(html.indexOf(`id="item-${i + 1}"`), html.indexOf(`id="item-${i + 2}"`));
    const seg = card.replace(/<!--[\s\S]*?-->/g, "");
    const opts = new Map();
    let m;
    const optRe = /<li><strong[^>]*>(\d+)<\/strong>\s*·\s*([^<]+)<\/li>/g;
    while ((m = optRe.exec(seg))) opts.set(Number(m[1]), m[2]);
    const ansRe = /<span class="text-\[0\.72rem\][^"]*">(\d+)<\/span>([^<]+)<\/span>/g;
    const answers = new Map();
    while ((m = ansRe.exec(seg))) answers.set(Number(m[1]), clean(m[2]));
    if (opts.size === 0 || answers.size === 0) continue;
    const blanks = [];
    let bad = false;
    for (const [n, list] of [...opts.entries()].sort((a, b) => a[0] - b[0])) {
      const options = list.split("/").map((s) => clean(s));
      const ans = answers.get(n);
      const idx = options.findIndex((o) => o.toLowerCase() === (ans ?? "").toLowerCase());
      if (options.length < 3 || idx < 0) {
        bad = true;
        break;
      }
      blanks.push({ options, answer: idx });
    }
    if (bad || blanks.length === 0) continue;
    const passage = clean(parts[i].text.replace(/\[\[(\d+)\]\]/g, "{{$1}}"));
    push("edknot_dropdown", "read_fib_dropdown", { passage, blanks });
    ok++;
  }
  if (parts.length !== ok)
    skipped[`edknot_dropdown (${parts.length - ok})`] = "opções/gabarito incompletos no card";
}

// ---- ptehelper swt: Original Text … Solution … (NN words) ----
{
  const txt = stripTags(raw(SOURCES.ptehelper_swt.raw));
  const lines = txt
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const MARK = (l) => /^PTE Summarize Written Text With Answers \|/i.test(l);
  const items = [];
  let cur = null;
  let state = "idle"; // idle | text | solution
  for (const l of lines) {
    if (MARK(l)) {
      if (cur?.text && cur.solution) items.push(cur);
      cur = { text: [], solution: [] };
      state = "idle";
      continue;
    }
    if (!cur) continue;
    if (/^Original Text$/i.test(l)) {
      state = "text";
      continue;
    }
    if (/^Solution$/i.test(l)) {
      state = "solution";
      continue;
    }
    if (/^\(\d+ words\)$/i.test(l)) {
      state = "idle";
      continue;
    }
    if (state === "text" || state === "solution") {
      // descarta marcadores editoriais “(1)” “(Examples of …)”
      if (/^\(\d+\)$/.test(l) || /^\(Examples of[^)]*\)$/i.test(l)) continue;
      if (/^\(Detailed information\)$/i.test(l)) continue;
      cur[state].push(l);
    }
  }
  if (cur?.text && cur.solution) items.push(cur);
  let ok = 0;
  for (const it of items) {
    const text = clean(it.text.join(" ").replace(/\s*\(\d+\)\s*/g, " "));
    const sample = clean(it.solution.join(" ").replace(/\s*\(\d+\)\s*/g, " "));
    const nw = words(text);
    if (nw < 150 || nw > 350) continue; // faixa oficial swt
    push("ptehelper_swt", "swt", { text, keywords: keywordsOf(text), sample });
    ok++;
  }
  if (items.length !== ok)
    skipped[`ptehelper_swt (${items.length - ok})`] = "passagem fora da faixa 150–350 palavras";
}

// ---- pteexampreparation reorder_paragraphs: blocos A)–F) + sequência resposta ----
{
  // WordPress minificado: cada <p>/<div> vira uma linha antes de remover as tags
  // (o tema usa <p> sem fechamento dentro dos <div> de resposta)
  const txt = stripTags(raw(SOURCES.pteprep_reorder.raw).replace(/<\/?(?:p|div)[^>]*>/gi, "\n"));
  const lines = txt
    .split("\n")
    .map((l) => l.replace(/\t/g, " ").trim())
    .filter(Boolean);
  let cur = null;
  const items = [];
  for (const rawLine of lines) {
    if (/^\d{1,3}\.\s*[–-]\s*Re-?order/i.test(rawLine)) {
      if (cur) items.push(cur);
      cur = { blocks: new Map(), order: null };
      continue;
    }
    if (!cur) continue;
    const b = /^\[?([A-F])\]?[)\].]\s*(.{30,})$/.exec(rawLine);
    if (b && !cur.order) {
      cur.blocks.set(b[1], clean(b[2]));
      continue;
    }
    // “For Answers Click Here” pode vir sozinho ou colado à sequência de resposta
    const fa = /^For Answers Click Here\s*(.*)$/i.exec(rawLine);
    const l = fa ? fa[1].trim() : rawLine;
    if (!l) continue;
    // linha de resposta: só letras A–F com separadores curtos (ex.: “D – A- B- C”)
    if (!cur.order && cur.blocks.size >= 3 && /^(?:[A-F]\s*[\-–.]{0,2}\s*){3,6}$/.test(l)) {
      cur.order = l.replace(/[^A-F]/g, "");
    }
  }
  if (cur) items.push(cur);
  let ok = 0;
  for (const it of items) {
    if (!it.order) continue;
    const letters = it.order.split("");
    if (new Set(letters).size !== letters.length) continue; // não é permutação
    if (letters.some((c) => !it.blocks.has(c))) continue;
    if (new Set(it.blocks.keys()).size !== letters.length) continue; // blocos órfãos
    // data.paragraphs fica na ORDEM CORRETA (ReorderData: “na ordem correta”)
    push("pteprep_reorder", "reorder_paragraphs", {
      paragraphs: letters.map((c) => it.blocks.get(c)),
    });
    ok++;
  }
  if (items.length !== ok)
    skipped[`pteprep_reorder (${items.length - ok})`] = "ordem-correta ausente ou não permutação";
}

const out = { wave: 2, capturedAt: CAPTURED, candidates, skipped };
writeFileSync(path.join(OUT, "wave2-extracted.json"), JSON.stringify(out, null, 1) + "\n");
const byType = {};
for (const c of candidates) byType[c.type] = (byType[c.type] ?? 0) + 1;
const bySource = {};
for (const c of candidates) bySource[c.source.id] = (bySource[c.source.id] ?? 0) + 1;
console.log(JSON.stringify({ total: candidates.length, byType, bySource, skipped }, null, 1));
