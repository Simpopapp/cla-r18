// ===== extract-goarno — extrai itens dos caches .opencode/work/bank/raw/goarno*.html =====
// Saída: .opencode/work/bank/extracted/<tipo>.json (itens brutos, proveniência inicial "comunitaria").
// Uso: node scripts/bank/extract-goarno.mjs [tipo...]   (sem args = todos os tipos mapeados)
import { TASK_TYPES, WORK, RAW, readJson, writeJson, makeId, ensureDirs, sha1 } from "./lib.mjs";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

const FILES = {
  read_mcq_single: "multiple-choice-single-answer-reading-pr.html",
  read_mcq_multi: "multiple-choice-multiple-answers-reading.html",
  lst_mcq_single: "multiple-choice-single-answer-listening-.html",
  lst_mcq_multi: "multiple-choice-multiple-answers-listeni.html",
  lst_hcs: "highlight-correct-summary-practice-quest.html",
  lst_hiw: "highlight-incorrect-words-practice-quest.html",
  lst_smw: "select-missing-word-practice-questions-w.html",
  lst_fib: "fill-in-the-blanks-listening-practice-qu.html",
  read_fib_dropdown: "fill-in-the-blanks-dropdown-practice-que.html",
  read_fib_drag: "fill-in-the-blanks-drag-and-drop-practic.html",
  sst: "summarize-spoken-text-practice-questions.html",
  swt: "summarize-written-text-examples-and-answ.html",
  repeat_sentence: "repeat-sentence-practice-questions-with-.html",
  wfd: "write-from-dictation-practice-questions-.html",
};

const SOURCE = {
  domain: "goarno.io",
  url: "https://goarno.io/blog",
  license: undefined,
  attribution: "Arno (goarno.io) — Essential Questions, acesso 2026-10-17",
};
const PROVENANCE = "comunitaria";

function cleanLines(html) {
  let h = html.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "");
  h = h
    .replace(/<[^>]+>/g, "\n")
    .replace(/&nbsp;/g, " ")
    .replace(/&/g, "&")
    .replace(/"/g, '"')
    .replace(/&#39;|'/g, "'")
    .replace(/&rsquo;/g, "’")
    .replace(/&ldquo;|&rdquo;/g, "”")
    .replace(/&mdash;/g, "—")
    .replace(/&hellip;/g, "…");
  return h
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

function blocks(lines) {
  // divide em "Question N" ou "Example N"
  const out = [];
  let cur = null;
  for (const l of lines) {
    const m = l.match(/^(Question|Example)\s+(\d+)\s*$/);
    if (m) {
      if (cur) out.push(cur);
      cur = { n: Number(m[2]), lines: [] };
    } else if (cur) cur.lines.push(l);
  }
  if (cur) out.push(cur);
  return out;
}

const isOpt = (l) => /^[a-e]\)/.test(l);
const isAnswerMarker = (l) => l.toLowerCase() === "answer:";

function parseOptions(lines, startIdx) {
  const opts = [];
  let i = startIdx;
  while (i < lines.length && isOpt(lines[i])) {
    opts.push(lines[i].replace(/^[a-e]\)\s*/, "").trim());
    i++;
  }
  return { opts, next: i };
}

function parseAnswer(lines, i) {
  if (lines[i]?.toLowerCase() === "answer:") i++;
  return { raw: (lines[i] ?? "").trim(), next: i + 1 };
}

function letterToIndex(letter) {
  const idx = "abcde".indexOf(letter.toLowerCase().trim());
  return idx;
}

// ---- parsers por família ----
function parseMcq(bl, type) {
  const items = [];
  for (const b of bl) {
    let lines = b.lines.filter((l) => l !== "Listen to the recording:");
    // localizar "Transcript:" (listening) ou início da passagem
    let start = 0;
    const tIdx = lines.findIndex((l) => l.toLowerCase() === "transcript:");
    if (tIdx >= 0) start = tIdx + 1;
    // opções começam na primeira linha "a)"
    let optStart = lines.findIndex(isOpt, start);
    if (optStart < 0) continue;
    // resposta
    let ansIdx = lines.findIndex(isAnswerMarker, optStart);
    if (ansIdx < 0) continue;
    const { opts } = parseOptions(lines, optStart);
    const { raw } = parseAnswer(lines, ansIdx);
    const answers = raw
      .split(/,\s*|\s+/)
      .map(letterToIndex)
      .filter((x) => x >= 0);
    if (opts.length < 3 || answers.length === 0) continue;
    // question = última linha antes das opções que termina com "?"
    let qIdx = optStart - 1;
    let question = "";
    while (qIdx >= start) {
      if (lines[qIdx].endsWith("?")) {
        question = lines[qIdx];
        break;
      }
      qIdx--;
    }
    const passageEnd = question ? optStart - 1 : optStart;
    const passageLines = lines.slice(start, passageEnd).filter((l) => l !== question);
    if (passageLines.join(" ").split(/\s+/).filter(Boolean).length < 20) continue;
    const passage = passageLines.join(" ");
    const isListening = type.startsWith("lst_");
    items.push({
      data: isListening
        ? {
            transcript: passage,
            question,
            options: opts,
            answer: answers.length === 1 && !raw.includes(",") ? answers[0] : answers,
          }
        : {
            passage,
            question,
            options: opts,
            answer: answers.length === 1 && !raw.includes(",") ? answers[0] : answers,
          },
    });
  }
  return items;
}

function parseHcs(bl) {
  const items = [];
  for (const b of bl) {
    const lines = b.lines;
    const tIdx = lines.findIndex((l) => l.toLowerCase() === "transcript:");
    if (tIdx < 0) continue;
    const optStart = lines.findIndex(isOpt, tIdx);
    if (optStart < 0) continue;
    const ansIdx = lines.findIndex(isAnswerMarker, optStart);
    if (ansIdx < 0) continue;
    const { opts } = parseOptions(lines, optStart);
    const { raw } = parseAnswer(lines, ansIdx);
    const answer = letterToIndex(raw);
    if (opts.length < 3 || answer < 0) continue;
    const transcript = lines.slice(tIdx + 1, optStart).join(" ");
    items.push({ data: { transcript, options: opts, answer } });
  }
  return items;
}

function parseHiw(bl) {
  const items = [];
  for (const b of bl) {
    const lines = b.lines;
    const tIdx = lines.findIndex((l) => l.toLowerCase() === "transcript:");
    if (tIdx < 0) continue;
    const wIdx = lines.findIndex((l) => l.toLowerCase() === "incorrect words:");
    if (wIdx < 0) continue;
    const transcript = lines.slice(tIdx + 1, wIdx).join(" ");
    // pares: left, "→", right, (",")?
    const seq = lines.slice(wIdx + 1).filter((l) => l !== ",");
    const pairs = [];
    for (let i = 0; i + 2 < seq.length; i += 3) {
      if (seq[i + 1] === "→") pairs.push([seq[i], seq[i + 2]]);
    }
    if (pairs.length === 0) continue;
    let spoken = transcript;
    for (const [wrong, right] of pairs) spoken = spoken.replace(wrong, right);
    items.push({ data: { spoken, shown: transcript } });
  }
  return items;
}

function parseSmw(bl) {
  const items = [];
  for (const b of bl) {
    const lines = b.lines;
    const tIdx = lines.findIndex((l) => l.toLowerCase() === "transcript:");
    if (tIdx < 0) continue;
    const optStart = lines.findIndex(isOpt, tIdx);
    if (optStart < 0) continue;
    const ansIdx = lines.findIndex(isAnswerMarker, optStart);
    if (ansIdx < 0) continue;
    const { opts } = parseOptions(lines, optStart);
    const { raw } = parseAnswer(lines, ansIdx);
    const answer = letterToIndex(raw);
    if (opts.length < 3 || answer < 0) continue;
    const transcript = lines.slice(tIdx + 1, optStart).join(" ");
    items.push({ data: { transcript, options: opts, answer } });
  }
  return items;
}

function parseLstFib(bl) {
  const items = [];
  for (const b of bl) {
    const lines = b.lines;
    const tIdx = lines.findIndex((l) => l.toLowerCase() === "transcript with blanks:");
    if (tIdx < 0) continue;
    const ansIdx = lines.findIndex((l) => l.toLowerCase() === "answers:");
    if (ansIdx < 0) continue;
    let template = lines.slice(tIdx + 1, ansIdx).join(" ");
    // respostas: "Blank 1:" <word> (, "Blank 2:" ...)
    const answers = [];
    const tail = lines.slice(ansIdx + 1);
    for (let i = 0; i < tail.length; i++) {
      const m =
        tail[i].match(/^,?\s*Blank\s+(\d+):\s*(.+)$/i) ??
        (tail[i].match(/^,?\s*Blank\s+(\d+):$/i)
          ? [null, tail[i].match(/^,?\s*Blank\s+(\d+):$/i)[1], tail[i + 1]]
          : null);
      if (m) answers[Number(m[1]) - 1] = (m[2] ?? "").replace(/,$/, "").trim();
    }
    template = template.replace(/_{2,}\s*\(\s*(\d+)\s*\)/g, "{{$1}}");
    if (answers.some((a) => !a) || !template.includes("{{1}}")) continue;
    items.push({ data: { template, answers } });
  }
  return items;
}

function parseFibDropdown(bl) {
  const items = [];
  for (const b of bl) {
    const lines = b.lines;
    const optIdx = lines.findIndex((l) => /^Blank\s+1 options:/i.test(l));
    if (optIdx < 0) continue;
    const ansIdx = lines.findIndex((l) => l.toLowerCase() === "answers:");
    if (ansIdx < 0) continue;
    const passage = lines.slice(0, optIdx).join(" ");
    // coletar "Blank N options:" + linhas de opções
    const blanks = {};
    for (let i = optIdx; i < ansIdx; i++) {
      const m = lines[i].match(/^Blank\s+(\d+)\s+options:$/i);
      if (m) {
        const opts = [];
        let j = i + 1;
        while (
          j < lines.length &&
          !/^Blank\s+\d+\s+options:/i.test(lines[j]) &&
          lines[j].toLowerCase() !== "answers:"
        ) {
          opts.push(
            ...lines[j]
              .split(",")
              .map((w) => w.trim())
              .filter(Boolean),
          );
          j++;
        }
        blanks[m[1]] = opts;
      }
    }
    const answers = {};
    const tail = lines.slice(ansIdx + 1);
    for (let i = 0; i < tail.length; i++) {
      const m =
        tail[i].match(/^,?\s*Blank\s+(\d+):\s*(.+)$/i) ??
        (tail[i].match(/^,?\s*Blank\s+(\d+):$/i)
          ? [null, tail[i].match(/^,?\s*Blank\s+(\d+):$/i)[1], tail[i + 1]]
          : null);
      if (m) answers[m[1]] = (m[2] ?? "").replace(/,$/, "").trim();
    }
    const n = Object.keys(blanks).length;
    if (n < 3 || Object.keys(answers).length < n) continue;
    const blanksArr = [];
    for (let k = 1; k <= n; k++) {
      const opts = blanks[k];
      const ans = answers[k];
      const ai = opts.indexOf(ans);
      if (ai < 0) {
        blanksArr.length = 0;
        break;
      }
      blanksArr.push({ options: opts, answer: ai });
    }
    if (blanksArr.length !== n) continue;
    if (blanksArr.some((b) => b.options.length < 3)) continue; // fidelidade: dropdown oficial tem 4 opções
    const passageM = passage.replace(/_{2,}\s*\(\s*(\d+)\s*\)/g, "{{$1}}");
    if (!passageM.includes("{{1}}")) continue;
    items.push({ data: { passage: passageM, blanks: blanksArr } });
  }
  return items;
}

function parseFibDrag(bl) {
  const items = [];
  for (const b of bl) {
    const lines = b.lines;
    const bankIdx = lines.findIndex((l) => /^Word bank:/i.test(l));
    if (bankIdx < 0) continue;
    const ansIdx = lines.findIndex((l) => l.toLowerCase() === "answers:");
    if (ansIdx < 0) continue;
    const passage = lines.slice(0, bankIdx).join(" ");
    const bank = (lines[bankIdx + 1] ?? "")
      .split(",")
      .map((w) => w.trim())
      .filter(Boolean);
    const answers = {};
    const tail = lines.slice(ansIdx + 1);
    for (let i = 0; i < tail.length; i++) {
      const m =
        tail[i].match(/^,?\s*Blank\s+(\d+):\s*(.+)$/i) ??
        (tail[i].match(/^,?\s*Blank\s+(\d+):$/i)
          ? [null, tail[i].match(/^,?\s*Blank\s+(\d+):$/i)[1], tail[i + 1]]
          : null);
      if (m) answers[m[1]] = (m[2] ?? "").replace(/,$/, "").trim();
    }
    const n = Object.keys(answers).length;
    if (bank.length < 5 || n < 3) continue;
    const ansArr = [];
    let ok = true;
    for (let k = 1; k <= n; k++) {
      const bi = bank.indexOf(answers[k]);
      if (bi < 0) {
        ok = false;
        break;
      }
      ansArr.push(bi);
    }
    if (!ok) continue;
    const passageM = passage.replace(/_{2,}\s*\(\s*(\d+)\s*\)/g, "{{$1}}");
    if (!passageM.includes("{{1}}")) continue;
    items.push({ data: { passage: passageM, bank, answers: ansArr } });
  }
  return items;
}

function parseSst(bl) {
  const items = [];
  for (const b of bl) {
    const lines = b.lines;
    const tIdx = lines.findIndex((l) => l.toLowerCase() === "transcript:");
    if (tIdx < 0) continue;
    const mIdx = lines.findIndex((l) => l.toLowerCase() === "model summary:");
    if (mIdx < 0) continue;
    const transcript = lines.slice(tIdx + 1, mIdx).join(" ");
    const sample = lines.slice(mIdx + 1).join(" ");
    if (transcript.length < 200 || sample.length < 40) continue;
    items.push({ data: { transcript, keywords: keywordsFrom(sample), sample } });
  }
  return items;
}

function parseSwt(bl) {
  const items = [];
  for (const b of bl) {
    const lines = b.lines;
    const aIdx = lines.findIndex((l) => l.toLowerCase() === "answer");
    if (aIdx < 0) continue;
    const text = lines.slice(0, aIdx).join("\n\n");
    const sample = lines.slice(aIdx + 1).join(" ");
    if (text.length < 300 || sample.length < 40) continue;
    items.push({ data: { text, keywords: keywordsFrom(sample), sample } });
  }
  return items;
}

function parseSentences(bl, type) {
  const items = [];
  for (const b of bl) {
    const lines = b.lines;
    const aIdx = lines.findIndex(isAnswerMarker);
    if (aIdx < 0) continue;
    const sentence = lines
      .slice(aIdx + 1)
      .join(" ")
      .trim();
    const wc = sentence.split(/\s+/).filter(Boolean).length;
    const maxW = type === "wfd" ? 20 : 25; // faixa oficial (§6.8); blobs longos são defeitos de extração
    if (wc < 3 || wc > maxW) continue;
    items.push({ data: type === "wfd" ? { sentence } : { transcript: sentence } });
  }
  return items;
}

const STOP = new Set(
  "the a an of to and in that is are was were for with on as by this it their its from be has have had not or at which can may".split(
    " ",
  ),
);
function keywordsFrom(sample) {
  const words = sample
    .toLowerCase()
    .replace(/[’'"]+/g, "'")
    .replace(/[^a-z'\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3 && !STOP.has(w));
  const freq = new Map();
  for (const w of words) freq.set(w, (freq.get(w) ?? 0) + 1);
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([w]) => w);
}

const PARSERS = {
  read_mcq_single: parseMcq,
  read_mcq_multi: parseMcq,
  lst_mcq_single: parseMcq,
  lst_mcq_multi: parseMcq,
  lst_hcs: parseHcs,
  lst_hiw: parseHiw,
  lst_smw: parseSmw,
  lst_fib: parseLstFib,
  read_fib_dropdown: parseFibDropdown,
  read_fib_drag: parseFibDrag,
  sst: parseSst,
  swt: parseSwt,
  repeat_sentence: parseSentences,
  wfd: parseSentences,
};

ensureDirs();
const typesArg = process.argv.slice(2).filter((t) => TASK_TYPES.includes(t));
const types = typesArg.length ? typesArg : Object.keys(FILES);
let slugSeq = {};
const existing = readJson(path.join(WORK, "extracted", "_seq.json"), {});
const report = { source: "goarno.io", extractedAt: new Date().toISOString(), types: {} };

for (const t of types) {
  const f = FILES[t];
  const p = path.join(RAW, f);
  if (!existsSync(p)) {
    console.error(`faltando: ${f}`);
    continue;
  }
  const lines = cleanLines(readFileSync(p, "utf8"));
  const blocksAll = blocks(lines);
  const parsed = PARSERS[t]?.(blocksAll, t) ?? [];
  const seqBase = existing[t] ?? 0;
  const items = parsed.map((it, i) => ({
    id: makeId("goarno", t, seqBase + i + 1),
    type: t,
    source: { ...SOURCE },
    provenance: PROVENANCE,
    data: it.data,
  }));
  existing[t] = seqBase + parsed.length;
  writeJson(path.join(WORK, "extracted", `${t}.json`), items);
  report.types[t] = parsed.length;
  console.log(`${t}: ${parsed.length} itens extraídos`);
}
writeJson(path.join(WORK, "extracted", "_seq.json"), existing);
writeJson(path.join(WORK, "extract-goarno-report.json"), report);
