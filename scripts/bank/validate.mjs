// ===== validate — schema + ranges (PRD §6.8, G3) =====
// Usage: node scripts/bank/validate.mjs            (validates all src/data/pte/*.json)
//       node scripts/bank/validate.mjs --file X    (validates one file; review = true → não descarta, marca revisão)
import { TASK_TYPES, SECTION_OF, RANGES, readJson, writeJson, tokens, OUT } from "./lib.mjs";

const WORD_FIELDS = {
  read_aloud: ["text"],
  repeat_sentence: ["transcript"],
  wfd: ["sentence"],
  swt: ["text"],
  write_essay: ["prompt"],
  sst: ["transcript"],
  retell_lecture: ["transcript"],
  rts: ["scenario"],
  answer_short: ["question"],
};
const ALL_FIELDS = {
  read_aloud: ["text"],
  repeat_sentence: ["transcript"],
  describe_image: ["image", "alt", "facts", "keywords"],
  retell_lecture: ["transcript", "keywords"],
  answer_short: ["question", "answers"],
  sgd: ["turns", "keywords"],
  rts: ["scenario"],
  swt: ["text", "keywords"],
  write_essay: ["prompt"],
  read_fib_dropdown: ["passage", "blanks"],
  read_fib_drag: ["passage", "bank", "answers"],
  read_mcq_single: ["passage", "question", "options", "answer"],
  read_mcq_multi: ["passage", "question", "options", "answer"],
  reorder_paragraphs: ["paragraphs"],
  sst: ["transcript", "keywords"],
  lst_mcq_single: ["transcript", "question", "options", "answer"],
  lst_mcq_multi: ["transcript", "question", "options", "answer"],
  lst_fib: ["template", "answers"],
  lst_hcs: ["transcript", "options", "answer"],
  lst_smw: ["transcript", "options", "answer"],
  lst_hiw: ["spoken", "shown"],
  wfd: ["sentence"],
};

function wc(s) {
  return tokens(s).length;
}

function validateQuestion(q, type, report) {
  const d = q?.data ?? {};
  const id = q?.id ?? "<sem id>";
  const fail = (msg) => report.issues.push(`${id}: ${msg}`);
  const review = (msg) => report.review.push(`${id}: ${msg}`);

  if (typeof id !== "string" || !id) fail("id ausente");
  if (q?.type !== type) fail(`type != ${type}`);
  if (!q?.source?.domain) fail("source.domain ausente");
  if (!["verificada", "comunitaria"].includes(q?.provenance)) fail("provenance inválida");

  for (const f of ALL_FIELDS[type] ?? []) {
    if (
      f === "question" &&
      ["read_mcq_single", "read_mcq_multi", "lst_mcq_single", "lst_mcq_multi"].includes(type)
    )
      continue; // ausente na página → revisão
    if (d[f] == null || (Array.isArray(d[f]) && d[f].length === 0) || d[f] === "")
      fail(`campo vazio: ${f}`);
  }
  if (
    ["read_mcq_single", "read_mcq_multi", "lst_mcq_single", "lst_mcq_multi"].includes(type) &&
    !d.question
  )
    review("pergunta ausente (página só traz passagem + opções)");

  // G3: resposta ∈ opções
  if (
    type === "read_mcq_single" ||
    type === "lst_mcq_single" ||
    type === "lst_hcs" ||
    type === "lst_smw"
  ) {
    if (!Number.isInteger(d.answer) || d.answer < 0 || d.answer >= (d.options?.length ?? 0))
      fail("answer fora das opções");
  }
  if (type === "read_mcq_multi" || type === "lst_mcq_multi") {
    const arr = d.answer;
    if (!Array.isArray(arr) || arr.length < 2) fail("multi exige ≥ 2 respostas");
    else if (arr.some((a) => !Number.isInteger(a) || a < 0 || a >= (d.options?.length ?? 0)))
      fail("answer fora das opções");
  }
  if (type === "read_fib_dropdown") {
    const marks = (d.passage?.match(/\{\{\d+\}\}/g) ?? []).length;
    if (marks !== (d.blanks?.length ?? -1))
      fail(`marcadores {{n}} (${marks}) != nº blanks (${d.blanks?.length})`);
    d.blanks?.forEach((b, i) => {
      if (!Array.isArray(b.options) || b.options.length < 3)
        review(`blank ${i}: ${b.options?.length} opções (oficial tem 4)`);
      if (!Number.isInteger(b.answer) || b.answer < 0 || b.answer >= (b.options?.length ?? 0))
        fail(`blank ${i}: resposta fora das opções`);
    });
  }
  if (type === "read_fib_drag") {
    const marks = (d.passage?.match(/\{\{\d+\}\}/g) ?? []).length;
    if (marks !== (d.answers?.length ?? -1))
      fail(`marcadores (${marks}) != nº answers (${d.answers?.length})`);
    d.answers?.forEach((a, i) => {
      if (!Number.isInteger(a) || a < 0 || a >= (d.bank?.length ?? 0))
        fail(`lacuna ${i}: índice fora do bank`);
    });
  }
  if (type === "lst_fib") {
    const marks = (d.template?.match(/\{\{\d+\}\}/g) ?? []).length;
    if (marks !== (d.answers?.length ?? -1))
      fail(`marcadores (${marks}) != nº answers (${d.answers?.length})`);
  }
  if (type === "reorder_paragraphs") {
    if (!Array.isArray(d.paragraphs) || d.paragraphs.length < 4 || d.paragraphs.length > 6)
      review(`reorder: ${d.paragraphs?.length} parágrafos (faixa 4–6)`);
  }
  if (type === "lst_hiw") {
    const wrong = diffWrong(d.spoken, d.shown);
    if (wrong.length === 0) fail("hiw: nenhuma discrepância spoken×shown");
    else if (wrong.length > 8) review(`hiw: ${wrong.length} discrepâncias (pode ser texto errado)`);
  }
  if (type === "sgd") {
    if (
      !Array.isArray(d.turns) ||
      d.turns.length < 4 ||
      new Set(d.turns?.map((t) => t.speaker)).size < 2
    )
      fail("sgd: ≥ 2 falantes exigidos");
  }
  if (type === "describe_image") {
    if (!d.image?.startsWith("/di/")) fail("image deve estar em public/di/");
    if (!d.alt) fail("alt vazio");
    if (!Array.isArray(d.facts) || d.facts.length === 0) fail("facts vazio");
  }

  // faixas de plausibilidade → revisão (nunca descarte silencioso)
  const r = RANGES[type];
  if (r && r.unit === "words") {
    const n = wc(d[r.field] ?? "");
    if (n < r.min || n > r.max) review(`${r.field}: ${n} palavras fora da faixa ${r.min}–${r.max}`);
  }
  if (r?.unit === "speakers") {
    const n = d.turns?.length ?? 0;
    if (n < r.min || n > r.max) review(`turns: ${n} fora da faixa ${r.min}–${r.max}`);
  }
  return !report.issues.some((x) => x.startsWith(`${id}:`));
}

function diffWrong(spoken, shown) {
  const S = tokens(spoken),
    H = tokens(shown);
  const setS = new Map();
  S.forEach((w) => setS.set(w, (setS.get(w) ?? 0) + 1));
  const setH = new Map();
  H.forEach((w) => setH.set(w, (setH.get(w) ?? 0) + 1));
  const wrong = [];
  for (const [w, c] of setH) if ((setS.get(w) ?? 0) < c) wrong.push(w);
  return wrong;
}

export function validateBank(file, type) {
  const report = { file, type, total: 0, valid: 0, issues: [], review: [] };
  const arr = readJson(file, null);
  if (!Array.isArray(arr)) {
    report.issues.push("JSON não é um array");
    return report;
  }
  report.total = arr.length;
  for (const q of arr) if (validateQuestion(q, type, report)) report.valid++;
  return report;
}

// CLI
const isMain = process.argv[1] && process.argv[1].includes("validate");
if (isMain) {
  const fileArg = process.argv.indexOf("--file");
  if (fileArg > 0) {
    const f = process.argv[fileArg + 1];
    const type = f.split("/").pop().replace(".json", "");
    const rep = validateBank(f, type);
    console.log(JSON.stringify(rep, null, 2));
    process.exit(rep.issues.length > 0 ? 1 : 0);
  } else {
    let ok = true;
    const all = {};
    for (const t of TASK_TYPES) {
      const f = `${OUT}/${t}.json`;
      const rep = validateBank(f, t);
      all[t] = rep;
      if (rep.issues.length) ok = false;
    }
    for (const [t, rep] of Object.entries(all)) {
      if (rep.total > 0 || rep.issues.length) {
        console.log(
          `${t}: ${rep.valid}/${rep.total} válidos · issues: ${rep.issues.length} · revisão: ${rep.review.length}`,
        );
        rep.issues.slice(0, 5).forEach((i) => console.log("  ! " + i));
      }
    }
    process.exit(ok ? 0 : 1);
  }
}
