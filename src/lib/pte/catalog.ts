// Catálogo e seleção de questões — PRD §5.2, §8, §10.
// Carregamento em cache por tipo/seção, resolução por id e a fila "próxima
// questão" (vencidas primeiro → nunca tentadas → menos recente). Módulo quase
// puro: o único efeito é o carregamento sob demanda do banco.

import { queryOptions } from "@tanstack/react-query";

import { isDue } from "./srs";
import { loaders, typesBySection, typeOfQuestion } from "./manifest";
import type { Question } from "./types";
import type { Section, TaskType } from "./types";
import type { AppState, QuestionSnapshot } from "@/lib/storage";

const typeCache = new Map<TaskType, Promise<Question[]>>();

/** Carrega (e memoiza) todas as questões de um tipo. */
export function loadType(type: TaskType): Promise<Question[]> {
  let pending = typeCache.get(type);
  if (!pending) {
    pending = loaders[type]();
    typeCache.set(type, pending);
  }
  return pending;
}

/** Carrega todas as questões de uma seção (tipos em paralelo). */
export function loadSection(section: Section): Promise<Question[]> {
  const types = typesBySection(section);
  return Promise.all(types.map((t) => loadType(t))).then((groups) => groups.flat());
}

export async function loadQuestion(id: string): Promise<Question | null> {
  const type = typeOfQuestion(id);
  if (!type) return null;
  const questions = await loadType(type);
  return questions.find((q) => q.id === id) ?? null;
}

// ---- Query options (TanStack Query — loaders de rota + useSuspenseQuery) ----

export function sectionQuery(section: Section) {
  return queryOptions({
    queryKey: ["bank", "section", section],
    queryFn: () => loadSection(section),
    staleTime: Number.POSITIVE_INFINITY,
  });
}

export function typeQuery(type: TaskType) {
  return queryOptions({
    queryKey: ["bank", "type", type],
    queryFn: () => loadType(type),
    staleTime: Number.POSITIVE_INFINITY,
  });
}

export function questionQuery(id: string) {
  return queryOptions({
    queryKey: ["bank", "question", id],
    queryFn: () => loadQuestion(id),
    staleTime: Number.POSITIVE_INFINITY,
  });
}

// ---- Fila do tipo (§8: vencida → nova → menos recente) ----

export function pickNext(
  questions: readonly Question[],
  snapshots: Record<string, QuestionSnapshot>,
  now: number,
): Question | null {
  const due: Question[] = [];
  const fresh: Question[] = [];
  const seen: { question: Question; at: number }[] = [];
  for (const question of questions) {
    const snap = snapshots[question.id];
    if (!snap || snap.attempts === 0) {
      fresh.push(question);
    } else if (isDue(snap, now)) {
      due.push(question);
    } else {
      seen.push({ question, at: snap.lastAttemptAt });
    }
  }
  if (due.length > 0) return due[0] ?? null;
  if (fresh.length > 0) return fresh[0] ?? null;
  seen.sort((a, b) => a.at - b.at);
  return seen[0]?.question ?? null;
}

/** Posição de uma questão na fila do tipo (para anterior/próxima). */
export function neighborsOf(
  questions: readonly Question[],
  id: string,
): { prev: Question | null; next: Question | null; index: number; total: number } {
  const index = questions.findIndex((q) => q.id === id);
  if (index < 0) return { prev: null, next: null, index: -1, total: questions.length };
  const prev = index > 0 ? (questions[index - 1] ?? null) : null;
  const next = index < questions.length - 1 ? (questions[index + 1] ?? null) : null;
  return { prev, next, index, total: questions.length };
}

// ---- Embaralhamento determinístico por semente (reorder — PRD §5.1) ----

/** mulberry32 — PRNG determinístico; a semente é o id da questão. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Fisher–Yates com PRNG semeado — mesma semente ⇒ mesma ordem (SSR estável). */
export function seededShuffle<T>(items: readonly T[], seed: string): T[] {
  const rand = mulberry32(hashString(seed));
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    const a = out[i];
    const b = out[j];
    if (a !== undefined && b !== undefined) {
      out[i] = b;
      out[j] = a;
    }
  }
  return out;
}

// ---- Texto de busca (só o que o aluno vê na prática — nunca gabarito oculto) ----

export function questionSearchText(question: Question): string {
  const parts: string[] = [];
  if (question.topic) parts.push(question.topic);
  const d = question.data as unknown as { [key: string]: unknown };
  const visible: readonly string[] = ["text", "prompt", "passage", "question", "alt"];
  for (const field of visible) {
    const value = d[field];
    if (typeof value === "string") parts.push(value);
  }
  const facts = d["facts"];
  if (Array.isArray(facts)) {
    for (const fact of facts) if (typeof fact === "string") parts.push(fact);
  }
  return parts.join(" ").toLowerCase();
}
