// ===== build-manifest — gera src/data/manifest.json (PRD §5.2) =====
// Números derivados: TOTAL_ALL_QUESTIONS, TYPE_COUNT, countByType, sectionCounts.
import { TASK_TYPES, SECTION_OF, OUT, ROOT, readJson, writeJson } from "./lib.mjs";
import path from "node:path";

const BANK_TARGETS = readJson(
  path.join(ROOT, "src", "lib", "pte", "bank-targets-snapshot.json"),
  null,
) ?? {
  // espelho de src/lib/pte/bankTargets.ts — mantido por teste de sincronia
  wfd: { min: 300, ideal: 900 },
  read_aloud: { min: 100, ideal: 200 },
  read_fib_dropdown: { min: 40, ideal: 80 },
  repeat_sentence: { min: 200, ideal: 550 },
  describe_image: { min: 20, ideal: 60 },
  read_fib_drag: { min: 20, ideal: 50 },
  sst: { min: 60, ideal: 120 },
  retell_lecture: { min: 40, ideal: 80 },
  read_mcq_single: { min: 60, ideal: 110 },
  lst_fib: { min: 60, ideal: 100 },
  answer_short: { min: 80, ideal: 140 },
  read_mcq_multi: { min: 20, ideal: 50 },
  lst_hcs: { min: 20, ideal: 50 },
  sgd: { min: 12, ideal: 40 },
  reorder_paragraphs: { min: 40, ideal: 80 },
  lst_smw: { min: 20, ideal: 50 },
  rts: { min: 30, ideal: 60 },
  swt: { min: 40, ideal: 80 },
  lst_hiw: { min: 20, ideal: 50 },
  write_essay: { min: 30, ideal: 60 },
  lst_mcq_single: { min: 20, ideal: 50 },
  lst_mcq_multi: { min: 20, ideal: 50 },
};

const TYPE_LABELS = readJson(path.join(ROOT, "scripts", "bank", "type-meta.json"), {});

const allMeta = [];
const countByType = {};
for (const t of TASK_TYPES) {
  const items = readJson(path.join(OUT, `${t}.json`), []);
  countByType[t] = items.length;
  for (const q of items) {
    allMeta.push({
      id: q.id,
      type: t,
      section: SECTION_OF[t],
      domain: q.source?.domain ?? "",
      provenance: q.provenance,
      topic: q.topic,
      words:
        (q.data?.text ?? q.data?.passage ?? q.data?.transcript ?? q.data?.sentence)
          ? (q.data.text ?? q.data.passage ?? q.data.transcript ?? q.data.sentence ?? "")
              .split(/\s+/)
              .filter(Boolean).length
          : undefined,
    });
  }
}

const sectionCounts = {};
for (const t of TASK_TYPES) {
  const s = SECTION_OF[t];
  sectionCounts[s] = (sectionCounts[s] ?? 0) + countByType[t];
}

const TYPE_META = {};
for (const t of TASK_TYPES) {
  const meta = TYPE_LABELS[t] ?? {};
  const count = countByType[t];
  const min = BANK_TARGETS[t]?.min ?? 0;
  const ready = count > 0;
  TYPE_META[t] = {
    label: meta.label ?? t,
    section: SECTION_OF[t],
    skills: meta.skills ?? [],
    ready,
    reason: ready ? undefined : (meta.reason ?? "sem fonte verificável encontrada"),
    small: ready && count < min ? true : undefined,
  };
}

const manifest = {
  generatedAt: new Date().toISOString(),
  TOTAL_ALL_QUESTIONS: allMeta.length,
  TYPE_COUNT: TASK_TYPES.filter((t) => countByType[t] > 0).length,
  countByType,
  sectionCounts,
  TYPE_META,
  allMeta,
};

writeJson(path.join(OUT, "manifest.json"), manifest);
console.log(
  `manifest: ${manifest.TOTAL_ALL_QUESTIONS} questões · ${manifest.TYPE_COUNT}/22 tipos com banco`,
);
