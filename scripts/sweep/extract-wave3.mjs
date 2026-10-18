// ===== extract-wave3.mjs — extrator da onda 3 (Fase 4: tipos P2/P3, PRD2 §11 Fase 4) =====
// Dev-time only. Fontes aprovadas onda 3 → candidatos normalizados.
//   node scripts/sweep/extract-wave3.mjs
// Entradas: caches em .opencode/work/sweep/raw/ (hash sha1(url)[:16]; PDFs já
// convertidos para .txt com pdftotext).
// Saída: .opencode/work/sweep/extracted/wave3-extracted.json
// Regras honestas: fora da faixa oficial → skip com motivo (PRD1 §6.8);
// itens truncados/incoerentes → skip; nada é inventado (PRD2 §1.4, §8.6).
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { ROOT } from "./sweep-lib.mjs";

const RAW = path.join(ROOT, ".opencode", "work", "sweep", "raw");
const OUT = path.join(ROOT, ".opencode", "work", "sweep", "extracted");
mkdirSync(OUT, { recursive: true });

const CAPTURED = "2026-10-18";

const SOURCES = {
  stormedugo_wfd: {
    raw: "b9ae735da8513977",
    url: "https://www.stormedugo.com/blog/top-100-most-repeated-write-from-dictation-sentences-2025-edition",
    catalog: "cand-85",
    evidence: {
      kind: "exam-mention",
      detail:
        "StormEduGo — “100+ most repeated Write From Dictation sentences” baseado em exam recalls, publicado 2025-04-16 (re-verificado no cache); capturado 2026-10-18.",
    },
  },
  stormedugo_rs: {
    raw: "c81e09f896c2ffce",
    url: "https://www.stormedugo.com/blog/top-100-most-repeated-pte-repeated-sentences-2025-edition",
    catalog: "cand-86",
    evidence: {
      kind: "exam-mention",
      detail:
        "StormEduGo — “top 100 most repeated PTE Repeat Sentences” baseado em memory recalls e sessões de prática, publicado 2025-04-16 (re-verificado no cache); capturado 2026-10-18.",
    },
  },
  ptehelper_rs: {
    raw: "b8d83ec22c6ce08e",
    url: "https://ptehelper.com.au/du-doan-de-pte-repeat-sentence/",
    catalog: "cand-87",
    evidence: {
      kind: "exam-mention",
      detail:
        "PTE Helper — “bộ tủ PTE Repeat Sentence có tỷ lệ ra thi cao tháng 5/2025” (números das questões alinhados ao PTE Tools); ~788 itens numerados; capturado 2026-10-18.",
    },
  },
  oneppte_rs: {
    raw: "rs3.txt",
    url: "https://onepte.com/wp-content/uploads/2025/02/OnePTE-Prediction-Repeat-Sentence-2025.pdf",
    catalog: "cand-88",
    evidence: {
      kind: "exam-mention",
      detail:
        "OnePTE — Prediction Repeat Sentence (2025), PDF público; ~119 itens em faixa; itens truncados/incoerentes pulados no extrator; capturado 2026-10-18.",
    },
  },
  gurully_rs: {
    raw: "f4bfa63f1bdc2d61",
    url: "https://www.gurully.com/blog/pte-academic-repeat-sentence-examples/",
    catalog: "cand-90",
    evidence: {
      kind: "editorial",
      detail:
        "Gurully — “25+ Predictive PTE Academic Repeat Sentence Examples” com áudio + transcript por item (30 itens); publicado 2025-02; capturado 2026-10-18.",
    },
  },
  gurully_pred_rs: {
    raw: "gurullypred.txt",
    url: "https://www.gurully.com/Prediction_File_August_2025%20.pdf",
    catalog: "cand-76",
    evidence: {
      kind: "exam-mention",
      detail:
        "Gurully — Prediction File August 2025 (739 pp.), seção Repeat Sentence (pp. 55–74); capturado 2026-10-18.",
    },
  },
  gurully_pred_wfd: {
    raw: "gurullypred.txt",
    url: "https://www.gurully.com/Prediction_File_August_2025%20.pdf",
    catalog: "cand-76",
    evidence: {
      kind: "exam-mention",
      detail:
        "Gurully — Prediction File August 2025 (739 pp.), seção Write From Dictation (p. 714+); capturado 2026-10-18.",
    },
  },
  ptebank_ra_jan: {
    raw: "902ef50de0f60371",
    url: "https://www.ptebank.com/pte-question-bank-updates-january-2025/",
    catalog: "cand-81",
    evidence: {
      kind: "exam-mention",
      detail:
        "PTE Bank — “PTE question bank updates | January 2025”, PTE New Questions Read Aloud com passagens íntegras; capturado 2026-10-18.",
    },
  },
  ptebank_ra_feb: {
    raw: "ece115785e0f2bac",
    url: "https://www.ptebank.com/pte-question-bank-updates-february-2025/",
    catalog: "cand-70",
    evidence: {
      kind: "exam-mention",
      detail:
        "PTE Bank — “PTE question bank updates | February 2025”, PTE New Questions Read Aloud com passagens íntegras; capturado 2026-10-18.",
    },
  },
  ptebank_ra_jul: {
    raw: "a4b7bb525b771c20",
    url: "https://www.ptebank.com/pte-test-recent-exam-memories-amp-repeated-questions-for-july-2024/",
    catalog: "cand-69",
    evidence: {
      kind: "exam-mention",
      detail:
        "PTE Bank — “recent exam memories & repeated questions for July 2024”, passagens Read Aloud datadas por relato; capturado 2026-10-18.",
    },
  },
  ptebank_ra_sep: {
    raw: "1ce5255a67c72e39",
    url: "https://www.ptebank.com/pte-exam-question-bank-for-september-2025/",
    catalog: "cand-82",
    evidence: {
      kind: "exam-mention",
      detail:
        "PTE Bank — “PTE exam question bank for September 2025”; passagens Read Aloud; capturado 2026-10-18.",
    },
  },
  ptehelper_ra20: {
    raw: "9d5ec855666c23e8",
    url: "https://ptehelper.com.au/pte-read-aloud-repeated-questions-20-cau-thang-nao-cung-gap/",
    catalog: "cand-68",
    evidence: {
      kind: "exam-mention",
      detail:
        "PTE Helper — “20 câu PTE Read Aloud Repeated Questions” confirmadas pela equipe de coleta e alunos; atualizado 2025-02-23; capturado 2026-10-18.",
    },
  },
  ptehelper_ra_update: {
    raw: "edd79b83f72e8ac9",
    url: "https://ptehelper.com.au/cap-nhat-de-thi-pte-speaking/",
    catalog: "cand-71",
    evidence: {
      kind: "exam-mention",
      detail:
        "PTE Helper — “PTE Read Aloud | Đề Thi PTE Speaking 2025”, update 2025-04-24 com passagens RA; capturado 2026-10-18.",
    },
  },
  oneppte_ra_jan: {
    raw: "rajan.txt",
    url: "https://onepte.com/wp-content/uploads/2024/12/OnePTE-Prediction-FIle-PDF-Read-Aloud-2025.pdf",
    catalog: "cand-74",
    evidence: {
      kind: "exam-mention",
      detail:
        "OnePTE — Prediction Read Aloud (jan 2025), PDF público; 50 passagens numeradas com título; capturado 2026-10-18.",
    },
  },
  oneppte_ra_nov: {
    raw: "ranov.txt",
    url: "https://onepte.com/wp-content/uploads/2024/11/OnePTE-Read-Aloud-PTE-Predcition-November-24.pdf",
    catalog: "cand-75",
    evidence: {
      kind: "exam-mention",
      detail:
        "OnePTE — Prediction Read Aloud (nov 2024), PDF público; 52 passagens numeradas com título; capturado 2026-10-18.",
    },
  },
  gurully_pred_ra: {
    raw: "gurullypred.txt",
    url: "https://www.gurully.com/Prediction_File_August_2025%20.pdf",
    catalog: "cand-76",
    evidence: {
      kind: "exam-mention",
      detail:
        "Gurully — Prediction File August 2025, seção Read Aloud (pp. 5–43); capturado 2026-10-18.",
    },
  },
  prep_ra_test: {
    raw: "26fa05446ee69d28",
    url: "https://www.pteexampreparation.com/pte-speaking/read-aloud/pte-read-aloud-practice-test/",
    catalog: "cand-78",
    evidence: {
      kind: "editorial",
      detail:
        "PTE Exam Preparation — “20+ PTE Read Aloud questions including repeated, newly asked & practice”; passagens íntegras no HTML; capturado 2026-10-18.",
    },
  },
  prep_ra_samples: {
    raw: "28916a745a50545d",
    url: "https://www.pteexampreparation.com/pte-speaking/read-aloud/pte-read-aloud-samples/",
    catalog: "cand-79",
    evidence: {
      kind: "editorial",
      detail:
        "PTE Exam Preparation — Read Aloud samples numeradas com passagem + áudio-modelo no HTML; capturado 2026-10-18.",
    },
  },
  ptestudent_ra: {
    raw: "1d4d7394c14a475c.html",
    url: "https://www.ptestudent.com/2021/10/pte-read-alouds-repeated.html",
    catalog: "cand-80",
    evidence: {
      kind: "exam-mention",
      detail:
        "PTESudent — “PTE Read Alouds Repeated” (out-2021) com 10 passagens tituladas; capturado 2026-10-18.",
    },
  },
  ptebank_sst_feb: {
    raw: "fcbfe4e5b5106111",
    url: "https://www.ptebank.com/pte-summarize-spoken-text-pte-sst-february-2023/",
    catalog: "cand-66",
    evidence: {
      kind: "exam-mention",
      detail:
        "PTE Bank — “PTE predicted SST February 2023” com áudio + transcript + sample answer por item; capturado 2026-10-18.",
    },
  },
  ptebank_sst_mar: {
    raw: "039d4320f2b04b52",
    url: "https://www.ptebank.com/pte-summarize-spoken-text-pte-sst-march-2023/",
    catalog: "cand-67",
    evidence: {
      kind: "exam-mention",
      detail:
        "PTE Bank — “PTE predicted SST March 2023” com áudio + transcript + sample answer por item; capturado 2026-10-18.",
    },
  },
  britfort_sst: {
    raw: "britfort.txt",
    url: "https://online.britfort.com/wp-content/uploads/Part_3_Listening_PTEA_Practice_Test.pdf",
    catalog: "cand-21",
    evidence: {
      kind: "official",
      detail:
        "PTE Academic Offline Practice Test Part 3: Listening — Pearson Education Ltd, jun-2011; material oficial com transcript + sample summary (C4); capturado 2026-10-18.",
    },
  },
  prep_lst_fib: {
    raw: "4029507b283a9dea",
    url: "https://www.pteexampreparation.com/pte-listening/fill-in-the-blanks/pte-listening-fill-in-the-blanks/",
    catalog: "cand-58",
    evidence: {
      kind: "editorial",
      detail:
        "PTE Exam Preparation — Listening Fill in the Blanks com transcript, lacunas e gabarito inline; capturado 2026-10-18.",
    },
  },
};

const candidates = [];
const skipped = {};

function stripTags(html) {
  return String(html ?? "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&#8211;|&ndash;/g, "–")
    .replace(/&#8212;|&mdash;/g, "—")
    .replace(/&#8217;|&rsquo;/g, "’")
    .replace(/&#8216;|&lsquo;/g, "‘")
    .replace(/&#8220;|&ldquo;/g, "“")
    .replace(/&#8221;|&rdquo;/g, "”")
    .replace(/&/g, "&")
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

function rawText(name) {
  const p = path.join(RAW, name);
  return readFileSync(p, "utf8");
}

function htmlLines(name) {
  const txt = stripTags(
    rawText(name)
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(?:p|div|li|h[1-6]|tr|td|section|article)>/gi, "\n")
      .replace(/<(?:p|div|li|h[1-6]|tr|td|section|article)[^>]*>/gi, "\n")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " "),
  );
  return txt
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

function txtLines(name) {
  return rawText(name)
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

function words(s) {
  return String(s ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

// keywords determinísticas (top-6 palavras de conteúdo por frequência) —
// mesmo critério das ondas 1–2
const STOP = new Set(
  (
    "the this that these those and but for with from into over under about their there " +
    "which where when while what whom whose have has had will would could should " +
    "they them then than thus also more most some such only very much many been being " +
    "were was are our your you its it's one two other others another because " +
    "after before between during through without within upon among across against " +
    "make made take taken give given get used using even ever still just like well " +
    "said says say more less same each both few own so no nor not only"
  )
    .split(" ")
    .filter(Boolean),
);
function keywordsOf(text, n = 6) {
  const w = String(text ?? "")
    .toLowerCase()
    .replace(/[^a-z\s'-]/g, " ")
    .split(/\s+/)
    .filter((x) => x.length > 3 && !STOP.has(x));
  const freq = new Map();
  for (const x of w) freq.set(x, (freq.get(x) ?? 0) + 1);
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, n)
    .map(([x]) => x);
}

function push(sourceId, type, data, provenance = "comunitaria", extra = {}) {
  const src = SOURCES[sourceId];
  const domain = new URL(src.url).hostname.replace(/^www\./, "");
  candidates.push({
    type,
    data,
    ...extra,
    source: { id: src.catalog, domain, url: src.url },
    provenance,
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

function skip(key, reason, n = 1) {
  skipped[key] = (skipped[key] ? `${skipped[key]}; ` : "") + reason;
}

const inRange = (n, min, max) => n >= min && n <= max;

// ---- 1) stormedugo WFD: seção entre o marcador ✅ e 💡 How to Practice ----
{
  const lines = htmlLines(SOURCES.stormedugo_wfd.raw);
  const i0 = lines.findIndex((l) => l.includes("✅ Most Repeated WFD Sentences"));
  const i1 = lines.findIndex((l) => l.includes("💡 How to Practice"));
  if (i0 < 0 || i1 < 0) {
    skip("stormedugo_wfd", "marcadores de seção não encontrados");
  } else {
    let ok = 0;
    let seen = new Set();
    for (const l of lines.slice(i0 + 1, i1)) {
      const w = words(l);
      if (!inRange(w, 3, 20)) continue;
      if (seen.has(l.toLowerCase())) continue;
      seen.add(l.toLowerCase());
      push("stormedugo_wfd", "wfd", { sentence: l });
      ok++;
    }
    if (ok < (i1 - i0 - 1) * 0.8)
      skip(
        "stormedugo_wfd",
        `itens extraídos (${ok}) muito abaixo das linhas da seção (${i1 - i0 - 1})`,
      );
    console.error(`stormedugo_wfd: ${ok} itens`);
  }
}

// ---- 2) stormedugo RS: entre ✅/header e 📌 How to Practice ----
{
  const lines = htmlLines(SOURCES.stormedugo_rs.raw);
  const i0 = lines.findIndex((l) => l.includes("The wheelchair lift has been upgraded"));
  const i1 = lines.findIndex((l) => l.includes("📌 How to Practice"));
  if (i0 < 0 || i1 < 0) {
    skip("stormedugo_rs", "marcadores de seção não encontrados");
  } else {
    let ok = 0;
    let seen = new Set();
    for (const l of lines.slice(i0, i1)) {
      const w = words(l);
      if (!inRange(w, 4, 25)) continue;
      if (seen.has(l.toLowerCase())) continue;
      seen.add(l.toLowerCase());
      push("stormedugo_rs", "repeat_sentence", { transcript: l });
      ok++;
    }
    console.error(`stormedugo_rs: ${ok} itens`);
  }
}

// ---- 3) ptehelper RS: linhas numeradas “N frase.” excluindo endereços ----
{
  const lines = htmlLines(SOURCES.ptehelper_rs.raw);
  let ok = 0;
  let seen = new Set();
  for (const l of lines) {
    const m = /^(\d{1,3})\s+(.+)$/.exec(l);
    if (!m) continue;
    const s = clean(m[2]);
    const w = words(s);
    if (!inRange(w, 4, 25)) continue;
    if (!/[.?!]$/.test(s)) continue;
    if (/\d+\s+[A-Z][a-z]+\s+(Street|Road|Tce|Avenue|Parade)/.test(s)) continue;
    const k = s.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    push("ptehelper_rs", "repeat_sentence", { transcript: s });
    ok++;
  }
  console.error(`ptehelper_rs: ${ok} itens`);
}

// ---- 4) oneppte RS PDF: linhas soltas do pdftotext ----
{
  const lines = txtLines(SOURCES.oneppte_rs.raw);
  let ok = 0;
  let trunc = 0;
  let seen = new Set();
  for (const l of lines) {
    const s = l.replace(/^[\s\x19\u2028]+/, "").trim();
    const w = words(s);
    if (!inRange(w, 4, 25)) continue;
    if (/Full Tips/.test(s)) continue;
    // itens truncados no PDF (palavra final cortada): termina em fragmento curto minúsculo
    const last = s.split(/\s+/).pop();
    if (
      /[a-z]{2,4}$/.test(s) &&
      !/[.?!"]$/.test(s) &&
      last.length <= 4 &&
      !/^(the|of|in|on|at|to|a|and|for|with)$/.test(last)
    ) {
      // heurística fraca — só conta como truncado se a linha NÃO tem pontuação final
      if (!/[.?!]$/.test(s)) {
        trunc++;
        continue;
      }
    }
    const k = s.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    push("oneppte_rs", "repeat_sentence", { transcript: s });
    ok++;
  }
  skip(`oneppte_rs (${trunc})`, "linhas com palavra final truncada no PDF — puladas honestamente");
  console.error(`oneppte_rs: ${ok} itens (${trunc} truncados pulados)`);
}

// ---- 5) gurully RS: transcript na linha 2 após cada link de áudio ----
{
  const lines = htmlLines(SOURCES.gurully_rs.raw);
  let ok = 0;
  let seen = new Set();
  for (let i = 0; i < lines.length - 2; i++) {
    if (
      !/^https:\/\/www\.gurully\.com\/blog\/wp-content\/uploads\/2025\/02\/RS_.*\.mp3$/.test(
        lines[i],
      )
    )
      continue;
    // transcript: primeira linha maiúscula em 4–25 palavras depois de “Transcript:”
    for (let j = i + 1; j <= i + 3 && j < lines.length; j++) {
      const l = lines[j];
      if (l === "Audio:" || l === "Transcript:") continue;
      if (l.startsWith("http")) continue;
      const w = words(l);
      if (/^[A-Z0-9“"']/.test(l) && inRange(w, 4, 25)) {
        const k = l.toLowerCase();
        if (!seen.has(k)) {
          seen.add(k);
          push("gurully_rs", "repeat_sentence", { transcript: l });
          ok++;
        }
        break;
      }
    }
  }
  console.error(`gurully_rs: ${ok} itens`);
}

// ---- 6) gurully prediction PDF — seção RS (páginas 55–74 do PDF) ----
{
  const pages = rawText(SOURCES.gurully_pred_rs.raw).split("\f");
  const section = pages.slice(54, 74); // pp. 55–74 (RS); DI começa na p. 75
  let ok = 0;
  let seen = new Set();
  let buf = [];
  const flush = () => {
    const s = clean(buf.join(" "));
    buf = [];
    const w = words(s);
    if (!inRange(w, 4, 25)) return;
    const k = s.toLowerCase();
    if (seen.has(k)) return;
    seen.add(k);
    push("gurully_pred_rs", "repeat_sentence", { transcript: s });
    ok++;
  };
  for (const page of section) {
    const lines = page
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    for (const l of lines) {
      if (/^Repeat Sentence$/i.test(l)) continue;
      if (/^\d{1,3}\.$/.test(l) || /^\d{1,3}\.\s/.test(l)) {
        if (buf.length) flush();
        const rest = l.replace(/^\d{1,3}\.\s*/, "");
        if (rest) buf.push(rest);
        continue;
      }
      buf.push(l);
    }
    if (buf.length) flush();
  }
  console.error(`gurully_pred_rs: ${ok} itens`);
}

// ---- 6b) gurully prediction PDF — seção WFD (p. 714+) ----
{
  const pages = rawText(SOURCES.gurully_pred_wfd.raw).split("\f");
  const section = pages.slice(713); // p. 714+
  let ok = 0;
  let seen = new Set();
  let buf = [];
  const flush = () => {
    const s = clean(buf.join(" "));
    buf = [];
    const w = words(s);
    if (!inRange(w, 3, 20)) return;
    const k = s.toLowerCase();
    if (seen.has(k)) return;
    seen.add(k);
    push("gurully_pred_wfd", "wfd", { sentence: s });
    ok++;
  };
  for (const page of section) {
    const lines = page
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    for (const l of lines) {
      if (/^WRITE FROM DICTATION$/i.test(l)) continue;
      if (/^Page \d+$/.test(l)) continue;
      if (/^\d{1,3}\.$/.test(l) || /^\d{1,3}\.\s/.test(l)) {
        if (buf.length) flush();
        const rest = l.replace(/^\d{1,3}\.\s*/, "");
        if (rest) buf.push(rest);
        continue;
      }
      buf.push(l);
    }
    if (buf.length) flush();
  }
  console.error(`gurully_pred_wfd: ${ok} itens`);
}

// ---- 7–8) ptebank RA jan/feb: pares (título, passagem) após “Read Aloud:” ----
function ptebankMonthly(sourceId, marker) {
  const lines = htmlLines(SOURCES[sourceId].raw);
  const i0 = lines.findIndex((l) => l.includes(marker));
  if (i0 < 0) {
    skip(sourceId, `marcador "${marker}" não encontrado`);
    return;
  }
  const i1 = lines.findIndex((l, i) => i > i0 && l.includes("Describe Image:"));
  const end = i1 > i0 ? i1 : lines.length;
  let ok = 0;
  for (const l of lines.slice(i0, end)) {
    const w = words(l);
    if (!inRange(w, 25, 120)) continue;
    if (l.endsWith(":") || l.length < 60) continue;
    push(sourceId, "read_aloud", { text: l });
    ok++;
  }
  console.error(`${sourceId}: ${ok} itens`);
}
ptebankMonthly("ptebank_ra_jan", "PTE New Questions January");
ptebankMonthly("ptebank_ra_feb", "PTE New Questions February");

// ---- 9–10) ptebank RA jul/sep: parágrafos longos isolados ----
function ptebankMemories(sourceId, startMarker) {
  const lines = htmlLines(SOURCES[sourceId].raw);
  const i0 = lines.findIndex((l) => l.includes(startMarker));
  if (i0 < 0) {
    skip(sourceId, `marcador "${startMarker}" não encontrado`);
    return;
  }
  let ok = 0;
  for (const l of lines.slice(i0, i0 + 200)) {
    const w = words(l);
    if (!inRange(w, 25, 120)) continue;
    if (/^[A-Z][a-z]+(?: [A-Za-z'’-]+){0,3}$/.test(l)) continue; // títulos curtos
    if (l.includes("Get start") || l.includes("Register")) continue;
    push(sourceId, "read_aloud", { text: l });
    ok++;
  }
  console.error(`${sourceId}: ${ok} itens`);
}
ptebankMemories("ptebank_ra_jul", "PTE test recent exam memories");
ptebankMemories("ptebank_ra_sep", "PTE exam question bank for September");

// ---- 11) ptehelper RA-20: “Câu N | PTE.Tools NNN” + passagem ----
{
  const lines = htmlLines(SOURCES.ptehelper_ra20.raw);
  let ok = 0;
  for (let i = 0; i < lines.length - 1; i++) {
    if (!/^Câu \d+ \| PTE\.Tools \d+$/.test(lines[i])) continue;
    const p = lines[i + 1];
    const w = words(p);
    if (!inRange(w, 25, 120)) {
      skip(`ptehelper_ra20 (Câu ${i})`, `passagem fora da faixa (${w} palavras)`);
      continue;
    }
    push("ptehelper_ra20", "read_aloud", { text: p });
    ok++;
  }
  console.error(`ptehelper_ra20: ${ok} itens`);
}

// ---- 12) ptehelper RA update: “RA N” + passagem ----
{
  const lines = htmlLines(SOURCES.ptehelper_ra_update.raw);
  let ok = 0;
  for (let i = 0; i < lines.length - 1; i++) {
    if (!/^RA \d+$/.test(lines[i])) continue;
    const p = lines[i + 1];
    const w = words(p);
    if (!inRange(w, 25, 120)) {
      skip(`ptehelper_ra_update (RA ${i})`, `passagem fora da faixa (${w} palavras)`);
      continue;
    }
    push("ptehelper_ra_update", "read_aloud", { text: p });
    ok++;
  }
  console.error(`ptehelper_ra_update: ${ok} itens`);
}

// ---- 13–14) oneppte RA PDFs (jan/nov): “N.Título”/“N)Título” + passagem multi-linha ----
function oneppteRa(sourceId, entryRe) {
  const lines = txtLines(SOURCES[sourceId].raw);
  const entries = [];
  let cur = null;
  for (const l of lines) {
    const m = entryRe.exec(l);
    if (m) {
      if (cur) entries.push(cur);
      cur = { title: m[2] ?? "", lines: [] };
      const rest = l.slice(m[0].length).trim();
      if (rest && !/^[\d.\s]*$/.test(rest)) cur.lines.push(rest);
      continue;
    }
    if (cur) cur.lines.push(l);
  }
  if (cur) entries.push(cur);
  let ok = 0;
  for (const e of entries) {
    const p = clean(e.lines.join(" "));
    const w = words(p);
    if (!inRange(w, 25, 120)) {
      skip(`${sourceId} (${e.title || "?"})`, `passagem fora da faixa (${w} palavras)`);
      continue;
    }
    push(sourceId, "read_aloud", { text: p });
    ok++;
  }
  console.error(`${sourceId}: ${ok} itens de ${entries.length} entradas`);
}
oneppteRa("oneppte_ra_jan", /^(\d{1,2})\.([A-Za-z' .-]+)/);
oneppteRa("oneppte_ra_nov", /^(\d{1,2})\)([A-Za-z' .-]+)/);

// ---- 15) gurully prediction RA (pp. 5–54): “N.” + passagem multi-linha ----
{
  const pages = rawText(SOURCES.gurully_pred_ra.raw).split("\f");
  const section = pages.slice(4, 54); // pp. 5–54 (RA); RS começa na p. 55
  let buf = [];
  let ok = 0;
  let seen = new Set();
  const flush = () => {
    const p = clean(buf.join(" "));
    buf = [];
    const w = words(p);
    if (!inRange(w, 25, 120)) return;
    const k = p.toLowerCase();
    if (seen.has(k)) return;
    seen.add(k);
    push("gurully_pred_ra", "read_aloud", { text: p });
    ok++;
  };
  for (const page of section) {
    const lines = page
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    for (const l of lines) {
      if (/^(READ ALOUD|WRITING|READING|LISTENING|SPEAKING)$/.test(l)) continue;
      if (/^Page \d+$/.test(l)) continue;
      if (/^\d{1,3}\.$/.test(l) || /^\d{1,3}\.\s/.test(l)) {
        if (buf.length) flush();
        const rest = l.replace(/^\d{1,3}\.\s*/, "");
        if (rest) buf.push(rest);
        continue;
      }
      buf.push(l);
    }
    if (buf.length) flush();
  }
  console.error(`gurully_pred_ra: ${ok} itens`);
}

// ---- 16–17) pteexampreparation RA: “NN. PTE Read Aloud ...” + passagem + mp3 ----
function prepRa(sourceId) {
  const lines = htmlLines(SOURCES[sourceId].raw);
  let ok = 0;
  for (let i = 0; i < lines.length - 1; i++) {
    if (!/^\d{1,3}\.\s*PTE Read Aloud/.test(lines[i])) continue;
    const p = lines[i + 1];
    if (!p || p.startsWith("http")) continue;
    const w = words(p);
    if (!inRange(w, 25, 120)) {
      skip(`${sourceId} (item ${i})`, `passagem fora da faixa (${w} palavras)`);
      continue;
    }
    push(sourceId, "read_aloud", { text: p });
    ok++;
  }
  console.error(`${sourceId}: ${ok} itens`);
}
prepRa("prep_ra_test");
prepRa("prep_ra_samples");

// ---- 18) ptestudent RA: “N. Título” + passagem ----
{
  const lines = htmlLines(SOURCES.ptestudent_ra.raw);
  let ok = 0;
  for (let i = 0; i < lines.length - 1; i++) {
    if (!/^\d{1,2}\.\s+[A-Z][A-Za-z' -]{2,30}$/.test(lines[i])) continue;
    const p = lines[i + 1];
    const w = words(p);
    if (!inRange(w, 25, 120)) {
      skip(`ptestudent_ra (${lines[i]})`, `passagem fora da faixa (${w} palavras)`);
      continue;
    }
    push("ptestudent_ra", "read_aloud", { text: p });
    ok++;
  }
  console.error(`ptestudent_ra: ${ok} itens`);
}

// ---- 19–20) ptebank SST feb/mar: “N.” título | ... + mp3 + transcript ... + Sample Answer ----
function ptebankSst(sourceId) {
  const lines = htmlLines(SOURCES[sourceId].raw);
  const items = [];
  let cur = null;
  let state = "idle"; // idle | transcript | sample
  for (const l of lines) {
    if (l.includes("| PTE Summarize Spoken Text (SST)") && !l.includes("Sample Answer")) {
      if (cur && cur.transcript.length && cur.sample.length) items.push(cur);
      cur = { transcript: [], sample: [] };
      state = "pre-transcript";
      continue;
    }
    if (l.includes("Sample Answer")) {
      state = "sample";
      continue;
    }
    if (!cur) continue;
    if (state === "sample") {
      if (/\(\d+ words\)$/i.test(l)) {
        const body = l.replace(/\s*\(\d+ words\)\s*$/i, "").trim();
        if (body) cur.sample.push(body);
        state = "idle";
        continue;
      }
      cur.sample.push(l);
      continue;
    }
    if (state === "pre-transcript") {
      if (l.endsWith(".mp3")) continue;
      state = "transcript";
      cur.transcript.push(l);
      continue;
    }
    if (state === "transcript") cur.transcript.push(l);
  }
  if (cur && cur.transcript.length && cur.sample.length) items.push(cur);
  let ok = 0;
  for (const it of items) {
    const transcript = clean(it.transcript.join(" "));
    const sample = clean(it.sample.join(" ").replace(/\s*\(\d+ words\)\s*$/i, ""));
    const nw = words(transcript);
    if (!inRange(nw, 150, 330)) {
      skip(`${sourceId} (transcript ${nw}w)`, `transcript fora da faixa 150–330 (${nw})`);
      continue;
    }
    push(sourceId, "sst", { transcript, keywords: keywordsOf(transcript), sample });
    ok++;
  }
  console.error(`${sourceId}: ${ok} itens de ${items.length} blocos`);
}
ptebankSst("ptebank_sst_feb");
ptebankSst("ptebank_sst_mar");

// ---- 21) britfort SST: 2 itens oficiais (transcript + sample summary) ----
{
  const lines = txtLines(SOURCES.britfort_sst.raw);
  const i0 = lines.findIndex((l) =>
    l.startsWith("Summarize spoken text – Item 1") && l.length > 40
      ? false
      : l.startsWith("Summarize spoken text – Item 1"),
  );
  // duas ocorrências: índice (questions) e answer key; pegamos a partir da answer key
  const first = lines.findIndex((l) => l.startsWith("Summarize spoken text – Item 1"));
  const key = lines.findIndex(
    (l, i) => i > first && l.startsWith("Summarize spoken text – Item 1"),
  );
  if (key < 0) {
    skip("britfort_sst", "answer key não encontrada");
  } else {
    let ok = 0;
    for (let item = 1; item <= 2; item++) {
      const marker = `Summarize spoken text – Item ${item}`;
      const start = lines.findIndex((l, i) => i >= key && l.startsWith(marker));
      if (start < 0) break;
      const nextMarker =
        item < 2 ? "Summarize spoken text – Item 2" : "Multiple-choice, choose multiple answers";
      let end = lines.findIndex((l, i) => i > start && l.startsWith(nextMarker));
      if (end < 0) end = lines.length;
      const seg = lines.slice(start, end);
      const sIdx = seg.findIndex((l) => l.startsWith("Transcript"));
      const mIdx = seg.findIndex((l) => l.startsWith("Sample summary"));
      if (sIdx < 0 || mIdx < 0) {
        skip(`britfort_sst (item ${item})`, "transcript ou sample summary ausentes");
        continue;
      }
      const transcript = clean(seg.slice(sIdx + 1, mIdx).join(" "));
      const sample = clean(seg.slice(mIdx + 1).join(" "));
      const nw = words(transcript);
      if (!inRange(nw, 150, 330)) {
        skip(`britfort_sst (item ${item})`, `transcript fora da faixa 150–330 (${nw})`);
        continue;
      }
      push(
        "britfort_sst",
        "sst",
        { transcript, keywords: keywordsOf(transcript), sample },
        "verificada",
      );
      ok++;
    }
    console.error(`britfort_sst: ${ok} itens`);
  }
}

// ---- 22) pteexampreparation lst_fib: transcript com (N) _ _ _ + gabarito ----
{
  const lines = htmlLines(SOURCES.prep_lst_fib.raw);
  let ok = 0;
  let cur = null;
  for (const l of lines) {
    if (/\(\d+\) _ _ _/.test(l)) {
      cur = { passage: l, answersLine: null };
      continue;
    }
    if (cur && /^\(\d+\)\s+\S/.test(l)) {
      cur.answersLine = l;
      const passage = cur.passage
        .replace(/\(\d+\)\s*_+(?:\s*_+)*/g, "{{$&}}")
        .replace(/_+/g, "")
        .replace(/\{\{(\d+)\s*\}\}/g, "{{$1}}");
      const nums = [...cur.passage.matchAll(/\((\d+)\)/g)].map((m) => Number(m[1]));
      const answers = [...cur.answersLine.matchAll(/\((\d+)\)\s+([^\s(]+)/g)].map((m) => m[2]);
      if (nums.length === answers.length && nums.length > 0) {
        push("prep_lst_fib", "lst_fib", { template: clean(passage), answers });
        ok++;
      } else {
        skip(`prep_lst_fib (${nums.length}/${answers.length})`, "lacunas e respostas não batem");
      }
      cur = null;
    }
  }
  console.error(`prep_lst_fib: ${ok} itens`);
}

const out = { wave: 3, capturedAt: CAPTURED, candidates, skipped };
writeFileSync(path.join(OUT, "wave3-extracted.json"), JSON.stringify(out, null, 1) + "\n");
const byType = {};
for (const c of candidates) byType[c.type] = (byType[c.type] ?? 0) + 1;
const bySource = {};
for (const c of candidates) bySource[c.source.id] = (bySource[c.source.id] ?? 0) + 1;
console.log(JSON.stringify({ total: candidates.length, byType, bySource, skipped }, null, 1));
