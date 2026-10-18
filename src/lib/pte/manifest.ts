// Manifesto do banco de questões — PRD §5.2, §15.
// Fonte única dos números exibidos (UI, SEO): nenhuma contagem hardcoded em rotas.
// Gerado por `scripts/bank/build-manifest.mjs` — nunca editar o JSON à mão.

import manifestJson from "@/data/pte/manifest.json";
import aliasesJson from "@/data/aliases.json";
import { setQidResolver } from "@/lib/storage";

import { BANK_TARGETS } from "./bankTargets";
import { TASK_TYPES } from "./types";
import type { Provenance, Question, Section, Skill, TaskType } from "./types";

export interface QuestionMeta {
  id: string;
  type: TaskType;
  section: Section;
  domain: string;
  provenance: Provenance;
  topic?: string;
  words?: number;
}

export interface TypeMeta {
  label: string;
  section: Section;
  skills: Skill[];
  ready: boolean;
  reason?: string;
}

interface ManifestFile {
  generatedAt: string;
  TOTAL_ALL_QUESTIONS: number;
  TYPE_COUNT: number;
  countByType: Record<string, number>;
  sectionCounts: Record<string, number>;
  TYPE_META: Record<string, TypeMeta>;
  allMeta: QuestionMeta[];
}

const data = manifestJson as unknown as ManifestFile;

export const MANIFEST_GENERATED_AT: string = data.generatedAt;
export const TOTAL_ALL_QUESTIONS: number = data.TOTAL_ALL_QUESTIONS;
export const TYPE_COUNT: number = data.TYPE_COUNT;
export const allMeta: readonly QuestionMeta[] = data.allMeta;
export const countByType = data.countByType as Record<TaskType, number>;
export const sectionCounts = data.sectionCounts as Record<Section, number>;
export const TYPE_META = data.TYPE_META as Record<TaskType, TypeMeta>;

export function countOf(type: TaskType): number {
  return countByType[type] ?? 0;
}

/** Contagem abaixo da meta mínima (PRD §6.6) → selo "banco pequeno". */
export function isSmallBank(type: TaskType): boolean {
  return countOf(type) < BANK_TARGETS[type].min;
}

/** Motivo do selo "em breve" — null quando o tipo tem banco pronto. */
export function notReadyReason(type: TaskType): string | null {
  const meta = TYPE_META[type];
  if (meta.ready) return null;
  return meta.reason ?? "banco insuficiente para este tipo";
}

export const readyCount: number = TASK_TYPES.filter((t) => TYPE_META[t].ready).length;

export const notReadyTypes: readonly TaskType[] = TASK_TYPES.filter((t) => !TYPE_META[t].ready);

export function typesBySection(section: Section): TaskType[] {
  return TASK_TYPES.filter((t) => TYPE_META[t].section === section);
}

// ---- Ids → metadados ----

const META_BY_ID = new Map<string, QuestionMeta>(allMeta.map((m) => [m.id, m]));

export function typeOfQuestion(id: string): TaskType | null {
  return META_BY_ID.get(id)?.type ?? null;
}

export function wordsOf(id: string): number | undefined {
  return META_BY_ID.get(id)?.words;
}

// ---- Loaders por tipo (chunk sob demanda — PRD §6.7) ----

type JsonModule = { default: unknown };

const TYPE_MODULES: Record<TaskType, () => Promise<JsonModule>> = {
  read_aloud: () => import("@/data/pte/read_aloud.json"),
  repeat_sentence: () => import("@/data/pte/repeat_sentence.json"),
  describe_image: () => import("@/data/pte/describe_image.json"),
  retell_lecture: () => import("@/data/pte/retell_lecture.json"),
  answer_short: () => import("@/data/pte/answer_short.json"),
  sgd: () => import("@/data/pte/sgd.json"),
  rts: () => import("@/data/pte/rts.json"),
  swt: () => import("@/data/pte/swt.json"),
  write_essay: () => import("@/data/pte/write_essay.json"),
  read_fib_dropdown: () => import("@/data/pte/read_fib_dropdown.json"),
  read_mcq_multi: () => import("@/data/pte/read_mcq_multi.json"),
  reorder_paragraphs: () => import("@/data/pte/reorder_paragraphs.json"),
  read_fib_drag: () => import("@/data/pte/read_fib_drag.json"),
  read_mcq_single: () => import("@/data/pte/read_mcq_single.json"),
  sst: () => import("@/data/pte/sst.json"),
  lst_mcq_multi: () => import("@/data/pte/lst_mcq_multi.json"),
  lst_fib: () => import("@/data/pte/lst_fib.json"),
  lst_hcs: () => import("@/data/pte/lst_hcs.json"),
  lst_mcq_single: () => import("@/data/pte/lst_mcq_single.json"),
  lst_smw: () => import("@/data/pte/lst_smw.json"),
  lst_hiw: () => import("@/data/pte/lst_hiw.json"),
  wfd: () => import("@/data/pte/wfd.json"),
};

async function loadModule(type: TaskType): Promise<Question[]> {
  const mod = await TYPE_MODULES[type]();
  const arr = mod.default;
  if (!Array.isArray(arr)) {
    throw new Error(`banco inválido para ${type}`);
  }
  return arr as Question[];
}

/** Importa o JSON do tipo sob demanda (um chunk por tipo, nunca no bundle base). */
export const loaders: Record<TaskType, () => Promise<Question[]>> = Object.fromEntries(
  TASK_TYPES.map((t) => [t, () => loadModule(t)]),
) as Record<TaskType, () => Promise<Question[]>>;

// ---- Aliases de dedupe (§5.3): progresso nunca aponta para questão inexistente ----

const ALIASES = aliasesJson as Record<string, string>;

setQidResolver((id: string) => ALIASES[id] ?? id);
