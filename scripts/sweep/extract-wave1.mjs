// ===== extract-wave1.mjs — extrator da onda 1 (Fase 2, PRD2 §6.1) =====
// Dev-time only. Fontes aprovadas onda 1 → candidatos normalizados.
//   node scripts/sweep/extract-wave1.mjs
// Entradas: raws em cache (.opencode/work/sweep/raw/, hash sha1(url)[:16]).
// Saída: .opencode/work/sweep/extracted/wave1-extracted.json
// Sgd (gurully) NÃO integra: página traz só resumo-modelo, sem turns da
// discussão — viraria item inventado (PRD2 §1.4). Registrado como pendência.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { ROOT } from "./sweep-lib.mjs";

const RAW = path.join(ROOT, ".opencode", "work", "sweep", "raw");
const OUT = path.join(ROOT, ".opencode", "work", "sweep", "extracted");
mkdirSync(OUT, { recursive: true });

const CAPTURED = "2026-10-18";

function htmlText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "\n")
    .replace(/<style[\s\S]*?<\/style>/gi, "\n")
    .replace(/<[^>]+>/g, "\n")
    .replace(/&nbsp;/g, " ")
    .replace(/&#8211;|&ndash;/g, "–")
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
    .replace(/^[\s:–\-]+/, "")
    .trim();
}

function raw(name) {
  return readFileSync(path.join(RAW, name), "utf8");
}

// Fontes aprovadas (sources-sweep.json): id → { raw, url, evidence }
const SOURCES = {
  ptehelper: {
    raw: "fd364bf55ce0d86f",
    url: "https://ptehelper.com.au/tu-de-thi-pte-200-cau-answer-short-question-asq/",
    evidence: {
      kind: "exam-mention",
      detail:
        "Página declara que as questões 365–415 são as mais frequentes no exame real (“hay gặp nhất trong đề thi thật”, lista 200 ASQ); capturado 2026-10-18.",
    },
  },
  gurully_asq: {
    raw: "042fd6cc6730712d",
    url: "https://www.gurully.com/blog/pte-short-answer-questions-list/",
    evidence: {
      kind: "exam-mention",
      detail:
        "Título “60+ PTE Answer Short Questions With Tips to Score High” + lista de repetidas; publicada 21 Feb 2026, revisada por Brijesh Dhanani; capturado 2026-10-18.",
    },
  },
  sumlingo: {
    raw: "e151a1ccfbc78830",
    url: "https://sumlingo.com/blog/most-100-repeated-pte-answer-short-questions/",
    evidence: {
      kind: "exam-mention",
      detail:
        "Título “Most 100 Repeated PTE Answer Short Questions in 2025 … based on recent feedback and exam updates”; capturado 2026-10-18.",
    },
  },
  ptesprinters: {
    raw: "c9ef41623b722eac",
    url: "http://www.ptesprinters.com/exam-recall/50-answer-short-questions-prediction-list-1-dec-2019/",
    evidence: {
      kind: "exam-mention",
      detail:
        "“50-Answer Short Questions Prediction List-1: Dec-2019”, tags do post: “exam recall, pte exam memories, real pte question”; capturado 2026-10-18.",
    },
  },
  gurully_rts: {
    raw: "33b128ca9ad292d9",
    url: "https://www.gurully.com/pte-speaking-practice/respond-to-situation",
    evidence: {
      kind: "editorial",
      detail:
        "Plataforma de preparo estabelecida (prática editorial com gabarito); página de prática sem alegação de recall específico; capturado 2026-10-18.",
    },
  },
};

const candidates = [];
const skipped = {
  gurully_sgd:
    "sem turns da discussão (só resumo-modelo) — não inventar (PRD2 §1.4); 11 itens não integrados",
};

// ids do catálogo sources-sweep.json (normalizador/validador resolvem por lá)
const CATALOG = {
  ptehelper: "cand-22",
  gurully_asq: "cand-23",
  sumlingo: "cand-24",
  ptesprinters: "cand-25",
  gurully_rts: "cand-28",
};

function push(sourceId, type, data) {
  const src = SOURCES[sourceId];
  const domain = new URL(src.url).hostname.replace(/^www\./, "");
  candidates.push({
    type,
    data,
    source: { id: CATALOG[sourceId] ?? sourceId, domain, url: src.url },
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

// ---- ptehelper (answer_short): linhas “N pergunta? Resposta” ----
{
  const txt = htmlText(raw(SOURCES.ptehelper.raw));
  const re = /^(\d{1,3})\s+([^\n]{10,220}\?)\s+(\S[^\n]{0,70})$/gm;
  let m;
  while ((m = re.exec(txt))) {
    const q = clean(m[2]);
    const a = clean(m[3]);
    if (q && a && /[a-zA-Z]/.test(a))
      push("ptehelper", "answer_short", { question: q, answers: [a] });
  }
}

// ---- gurully_asq (answer_short): “Question N: / pergunta / Answer / : resposta” ----
{
  const txt = htmlText(raw(SOURCES.gurully_asq.raw));
  const re = /Question\s+(\d{1,3})\s*:?\s*\n([^\n]{10,220}\?)\s*\nAnswer\s*\n:?\s*([^\n]{1,80})/g;
  let m;
  while ((m = re.exec(txt))) {
    const q = clean(m[2]);
    const a = clean(m[3]);
    if (q && a && /[a-zA-Z]/.test(a))
      push("gurully_asq", "answer_short", { question: q, answers: [a] });
  }
}

// ---- sumlingo (answer_short): “N. / Question / : pergunta / Answer / : resposta” ----
{
  const txt = htmlText(raw(SOURCES.sumlingo.raw));
  const lines = txt
    .split("\n")
    .map((l) => l.replace(/\t/g, " ").trim())
    .filter((l) => l.length > 0);
  for (let i = 0; i < lines.length - 4; i++) {
    if (
      /^\d{1,3}\.?$/.test(lines[i]) &&
      lines[i + 1] === "Question" &&
      /^:/.test(lines[i + 2]) &&
      lines[i + 3] === "Answer" &&
      /^:/.test(lines[i + 4])
    ) {
      const q = clean(lines[i + 2]);
      const a = clean(lines[i + 4]);
      if (q && a && /[a-zA-Z]/.test(a))
        push("sumlingo", "answer_short", { question: q, answers: [a] });
    }
  }
}

// ---- ptesprinters (answer_short): “N. pergunta – – Resposta.” ----
{
  const txt = htmlText(raw(SOURCES.ptesprinters.raw));
  const re = /^(\d{1,2})\.\s*([^\n]{15,220}?)\s*[–\-]\s*[–\-]?\s*([^\n]{1,80})$/gm;
  let m;
  while ((m = re.exec(txt))) {
    const q = clean(m[2]);
    const a = clean(m[3]).replace(/\.$/, "");
    if (q && a && /\?$/.test(q) && /[a-zA-Z]/.test(a))
      push("ptesprinters", "answer_short", { question: q, answers: [a] });
  }
}

// ---- gurully_rts (rts): cenários da seção “Practice” da página ----
{
  const txt = htmlText(raw(SOURCES.gurully_rts.raw));
  // cenário: parágrafo “You(r)…”/“In a …” que TERMINA com pergunta de fala
  // (“How would you …?”); linhas de dicas terminam em “.” e são descartadas.
  const lines = txt.split("\n").map((l) => l.trim());
  const seen = new Set();
  for (const l of lines) {
    if (!/^(You[r]? |In a )/.test(l) || l.length < 60) continue;
    if (!/\?$/.test(l) || !/would you/i.test(l)) continue;
    const sc = clean(l);
    if (!sc || seen.has(sc)) continue;
    seen.add(sc);
    const words = sc.split(/\s+/).length;
    if (words >= 20 && words <= 200) push("gurully_rts", "rts", { scenario: sc });
  }
}

const out = { wave: 1, capturedAt: CAPTURED, candidates, skipped };
writeFileSync(path.join(OUT, "wave1-extracted.json"), JSON.stringify(out, null, 1) + "\n");
const byType = {};
for (const c of candidates) byType[c.type] = (byType[c.type] ?? 0) + 1;
const bySource = {};
for (const c of candidates) bySource[c.source.id] = (bySource[c.source.id] ?? 0) + 1;
console.log(JSON.stringify({ total: candidates.length, byType, bySource, skipped }, null, 1));
