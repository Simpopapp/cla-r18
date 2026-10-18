// Diagnóstico de erros — PRD §9.7. Base: log de tentativas (últimas
// MAX_ATTEMPT_LOG — a UI diz isso). Tags: missed:<palavra> · trap:<i> ·
// conteudo · fluencia · forma · template. Módulo puro.

import { addDays, dayKey } from "./dates";
import { PASS_SCORE_BY_TYPE } from "./srs";
import type { QuestionMeta } from "./manifest";
import type { Attempt, AppState } from "@/lib/storage";
import type { TaskType } from "./types";

export const DEFAULT_ERROR_WINDOW_DAYS = 14;

export interface ErrorBreakdown {
  /** tentativas com nota abaixo do passScore na janela */
  total: number;
  /** famílias de tag: missed · trap · conteudo · fluencia · forma · template */
  byTag: Record<string, number>;
  byType: Partial<Record<TaskType, number>>;
}

function inWindow(attempt: Attempt, now: number, days: number): boolean {
  const cutoff = addDays(dayKey(now), -(days - 1));
  return dayKey(attempt.ts) >= cutoff;
}

export function failedAttempts(state: AppState, now: number, days: number): Attempt[] {
  return state.attempts.filter((attempt) => {
    if (attempt.score === null) return false;
    if (attempt.score >= (PASS_SCORE_BY_TYPE[attempt.type] ?? 75)) return false;
    return inWindow(attempt, now, days);
  });
}

/** Família da tag: missed:* e trap:* viram buckets próprios; o resto é literal. */
export function tagFamily(tag: string): string {
  if (tag.startsWith("missed:")) return "missed";
  if (tag.startsWith("trap:")) return "trap";
  return tag;
}

/** Quebra de erros por tag e por tipo na janela de `days` dias. */
export function errorBreakdown(state: AppState, now: number, days: number): ErrorBreakdown {
  const failed = failedAttempts(state, now, days);
  const byTag: Record<string, number> = {};
  const byType: Partial<Record<TaskType, number>> = {};
  for (const attempt of failed) {
    byType[attempt.type] = (byType[attempt.type] ?? 0) + 1;
    for (const tag of attempt.tags ?? []) {
      const family = tagFamily(tag);
      byTag[family] = (byTag[family] ?? 0) + 1;
    }
  }
  return { total: failed.length, byTag, byType };
}

export interface MissedWord {
  word: string;
  count: number;
}

/** Palavras mais erradas (tags `missed:<palavra>`) — log inteiro, top N. */
export function topMissedWords(state: AppState, n: number): MissedWord[] {
  const counts = new Map<string, number>();
  for (const attempt of state.attempts) {
    for (const tag of attempt.tags ?? []) {
      if (!tag.startsWith("missed:")) continue;
      const word = tag.slice("missed:".length);
      if (word === "") continue;
      counts.set(word, (counts.get(word) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count || a.word.localeCompare(b.word))
    .slice(0, Math.max(0, n));
}

/** Média diária de tentativas abaixo do passScore na janela (§9.7). */
export function errorTrend(state: AppState, now: number, days = DEFAULT_ERROR_WINDOW_DAYS): number {
  if (days <= 0) return 0;
  return failedAttempts(state, now, days).length / days;
}

export interface TopicPerformance {
  topic: string;
  /** média das tentativas pontuadas do tópico */
  avg: number;
  n: number;
}

/** Tópicos com pior média (topic ?? domain do manifesto), top N. */
export function worstTopics(
  state: AppState,
  n: number,
  meta: readonly QuestionMeta[],
): TopicPerformance[] {
  const topicOf = new Map(meta.map((m) => [m.id, m.topic ?? m.domain]));
  const agg = new Map<string, { sum: number; n: number }>();
  for (const attempt of state.attempts) {
    if (attempt.score === null) continue;
    const topic = topicOf.get(attempt.qid);
    if (!topic) continue;
    const current = agg.get(topic) ?? { sum: 0, n: 0 };
    current.sum += attempt.score;
    current.n += 1;
    agg.set(topic, current);
  }
  return [...agg.entries()]
    .map(([topic, { sum, n }]) => ({ topic, avg: sum / n, n }))
    .sort((a, b) => a.avg - b.avg || b.n - a.n)
    .slice(0, Math.max(0, n));
}
