// ===== shared helpers — Fase 2 (PRD §6.3, §6.4, §6.7, §6.8) =====
// Dev-time only: nothing here is imported by the app bundle.
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
export const WORK = path.join(ROOT, ".opencode", "work", "bank");
export const RAW = path.join(WORK, "raw");
export const OUT = path.join(ROOT, "src", "data", "pte");
export const UA = "PTEMasterHub-bank-builder/0.1 (local personal study tool; contact: none)";

export const TASK_TYPES = [
  "read_aloud",
  "repeat_sentence",
  "describe_image",
  "retell_lecture",
  "answer_short",
  "sgd",
  "rts",
  "swt",
  "write_essay",
  "read_fib_dropdown",
  "read_mcq_multi",
  "reorder_paragraphs",
  "read_fib_drag",
  "read_mcq_single",
  "sst",
  "lst_mcq_multi",
  "lst_fib",
  "lst_hcs",
  "lst_mcq_single",
  "lst_smw",
  "lst_hiw",
  "wfd",
];

export const SECTION_OF = {
  read_aloud: "speaking",
  repeat_sentence: "speaking",
  describe_image: "speaking",
  retell_lecture: "speaking",
  answer_short: "speaking",
  sgd: "speaking",
  rts: "speaking",
  swt: "writing",
  write_essay: "writing",
  read_fib_dropdown: "reading",
  read_mcq_multi: "reading",
  reorder_paragraphs: "reading",
  read_fib_drag: "reading",
  read_mcq_single: "reading",
  sst: "listening",
  lst_mcq_multi: "listening",
  lst_fib: "listening",
  lst_hcs: "listening",
  lst_mcq_single: "listening",
  lst_smw: "listening",
  lst_hiw: "listening",
  wfd: "listening",
};

// Plausibility ranges (PRD §6.8). Out-of-range → manual review queue, never silent discard.
export const RANGES = {
  read_aloud: { field: "text", unit: "words", min: 25, max: 120 },
  repeat_sentence: { field: "transcript", unit: "words", min: 4, max: 25 },
  wfd: { field: "sentence", unit: "words", min: 3, max: 20 },
  swt: { field: "text", unit: "words", min: 150, max: 350 },
  write_essay: { field: "prompt", unit: "words", min: 15, max: 120 },
  sst: { field: "transcript", unit: "words", min: 150, max: 330 },
  retell_lecture: { field: "transcript", unit: "words", min: 80, max: 260 },
  sgd: { field: "turns", unit: "speakers", min: 4, max: 15 },
  rts: { field: "scenario", unit: "words", min: 20, max: 200 },
  answer_short: { field: "question", unit: "words", min: 2, max: 40 },
};

export function ensureDirs() {
  for (const d of [WORK, RAW, OUT, path.join(WORK, "extracted"), path.join(WORK, "deduped")])
    mkdirSync(d, { recursive: true });
}

export function readJson(file, fallback) {
  if (!existsSync(file)) return fallback;
  return JSON.parse(readFileSync(file, "utf8"));
}

export function writeJson(file, data) {
  writeFileSync(file, JSON.stringify(data, null, 1) + "\n");
}

export function sha1(s) {
  return createHash("sha1").update(s).digest("hex");
}

// ---- normalization (PRD §6.4) ----
export function normalizeText(s) {
  return String(s ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[\p{P}\p{S}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokens(s) {
  const t = normalizeText(s);
  return t ? t.split(" ").filter(Boolean) : [];
}

function trigrams(tokensArr) {
  const grams = new Set();
  for (let i = 0; i + 2 < tokensArr.length; i++) grams.add(tokensArr.slice(i, i + 3).join(" "));
  if (tokensArr.length > 0 && tokensArr.length < 3) grams.add(tokensArr.join(" "));
  return grams;
}

export function jaccard(a, b) {
  const A = new Set(a),
    B = new Set(b);
  if (A.size === 0 && B.size === 0) return 1;
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  const union = A.size + B.size - inter;
  return union === 0 ? 0 : inter / union;
}

export function diceTrigram(a, b) {
  const A = trigrams(a),
    B = trigrams(b);
  if (A.size === 0 || B.size === 0) return 0;
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  return (2 * inter) / (A.size + B.size);
}

// Dedupe key per type (PRD §6.4)
export function dedupeKey(type, q) {
  const d = q.data;
  switch (type) {
    case "wfd":
    case "repeat_sentence":
    case "read_aloud":
    case "retell_lecture":
    case "sst":
    case "lst_mcq_single":
    case "lst_mcq_multi":
    case "lst_hcs":
    case "lst_smw":
      return normalizeText(d.transcript ?? d.text ?? d.sentence ?? d.spoken ?? "");
    case "answer_short":
    case "sgd":
    case "rts":
    case "swt":
    case "write_essay":
      return normalizeText(
        d.question ??
          d.scenario ??
          d.prompt ??
          d.text ??
          d.turns?.map((t) => t.text).join(" ") ??
          "",
      );
    case "read_mcq_single":
    case "read_mcq_multi":
      return normalizeText((d.passage ?? "") + " " + (d.question ?? ""));
    case "read_fib_dropdown":
    case "read_fib_drag":
      return normalizeText(d.passage ?? "");
    case "reorder_paragraphs":
      return normalizeText((d.paragraphs ?? []).join(" "));
    case "lst_fib":
      return normalizeText(d.template ?? "");
    case "lst_hiw":
      return normalizeText(d.spoken ?? "");
    case "describe_image":
      return normalizeText((q.data.alt ?? "") + " " + (q.data.image ?? ""));
    default:
      return "";
  }
}

export function dedupeTokens(type, q) {
  const d = q.data;
  switch (type) {
    case "read_mcq_single":
    case "read_mcq_multi":
      return tokens((d.passage ?? "") + " " + (d.question ?? ""));
    case "read_fib_dropdown":
    case "read_fib_drag":
      return tokens(d.passage ?? "");
    case "reorder_paragraphs":
      return tokens((d.paragraphs ?? []).join(" "));
    default:
      return tokens(dedupeKey(type, q));
  }
}

// Stable id (PRD §5.3): <fonte>-<tipo>-NNN
export function makeId(sourceSlug, type, seq) {
  return `${sourceSlug}-${type}-${String(seq).padStart(3, "0")}`;
}

export const NEAR_THRESHOLD = 0.85; // max(Jaccard, Dice) ≥ 0.85 → quase-duplicata
