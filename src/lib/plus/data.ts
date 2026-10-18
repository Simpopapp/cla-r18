// Pack studie-plus — carregamento dos dados do pack (PRD §13.1.6).
// import() dinâmico só quando um recurso está ativo; pack desligado = zero custo
// no bundle base. Dados em src/data/plus/, separados do banco nativo.

import type { TaskType } from "@/lib/pte/types";

import type { Glossary } from "./glossary";
import type { PhrasesFile } from "./phrases";

let glossaryCache: Glossary | null = null;
let glossaryPromise: Promise<Glossary> | null = null;

export async function loadGlossary(): Promise<Glossary> {
  if (glossaryCache) return glossaryCache;
  glossaryPromise ??= import("@/data/plus/glossary.json").then(
    (mod) => (mod as { default: Glossary }).default ?? (mod as unknown as Glossary),
  );
  glossaryCache = await glossaryPromise;
  return glossaryCache;
}

type PhrasesLoader = () => Promise<{ default: PhrasesFile }>;

const PHRASE_MODULES: Record<TaskType, PhrasesLoader> = {
  read_aloud: () => import("@/data/plus/phrases/read_aloud.json"),
  repeat_sentence: () => import("@/data/plus/phrases/repeat_sentence.json"),
  describe_image: () => import("@/data/plus/phrases/describe_image.json"),
  retell_lecture: () => import("@/data/plus/phrases/retell_lecture.json"),
  answer_short: () => import("@/data/plus/phrases/answer_short.json"),
  sgd: () => import("@/data/plus/phrases/sgd.json"),
  rts: () => import("@/data/plus/phrases/rts.json"),
  swt: () => import("@/data/plus/phrases/swt.json"),
  write_essay: () => import("@/data/plus/phrases/write_essay.json"),
  read_fib_dropdown: () => import("@/data/plus/phrases/read_fib_dropdown.json"),
  read_mcq_multi: () => import("@/data/plus/phrases/read_mcq_multi.json"),
  reorder_paragraphs: () => import("@/data/plus/phrases/reorder_paragraphs.json"),
  read_fib_drag: () => import("@/data/plus/phrases/read_fib_drag.json"),
  read_mcq_single: () => import("@/data/plus/phrases/read_mcq_single.json"),
  sst: () => import("@/data/plus/phrases/sst.json"),
  lst_mcq_multi: () => import("@/data/plus/phrases/lst_mcq_multi.json"),
  lst_fib: () => import("@/data/plus/phrases/lst_fib.json"),
  lst_hcs: () => import("@/data/plus/phrases/lst_hcs.json"),
  lst_mcq_single: () => import("@/data/plus/phrases/lst_mcq_single.json"),
  lst_smw: () => import("@/data/plus/phrases/lst_smw.json"),
  lst_hiw: () => import("@/data/plus/phrases/lst_hiw.json"),
  wfd: () => import("@/data/plus/phrases/wfd.json"),
};

const phrasesCache = new Map<TaskType, PhrasesFile>();
const phrasesPromises = new Map<TaskType, Promise<PhrasesFile>>();

export async function loadPhrases(type: TaskType): Promise<PhrasesFile> {
  const cached = phrasesCache.get(type);
  if (cached) return cached;
  let promise = phrasesPromises.get(type);
  if (!promise) {
    promise = PHRASE_MODULES[type]().then((mod) => mod.default ?? {});
    phrasesPromises.set(type, promise);
  }
  const file = await promise;
  phrasesCache.set(type, file);
  return file;
}
