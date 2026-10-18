// Fila do dia — PRD §8 (buildQueue). Modos: smart (2:1 revisão/novas,
// intercalando tipos), due (só vencidas), counts (contagens exatas por tipo,
// usado pelo plano), errors (últimas notas < aprovação). Módulo puro: opera
// sobre os metadados do manifesto + snapshots — nunca carrega o banco.

import { PASS_SCORE_BY_TYPE, isDue } from "./srs";
import { TASK_TYPES } from "./types";
import type { QuestionMeta } from "./manifest";
import type { Section, TaskType } from "./types";
import type { AppState, QuestionSnapshot } from "@/lib/storage";

export type QueueMode = "smart" | "due" | "counts" | "errors";

export const DEFAULT_QUEUE_SIZE = 20;

export type QueueReason = "vencida" | "fraca" | "nova" | "revisao";

export interface QueueEntry {
  id: string;
  type: TaskType;
  reason: QueueReason;
}

export interface QueueBuildOptions {
  items: readonly QuestionMeta[];
  state: AppState;
  now: number;
  mode: QueueMode;
  types?: readonly TaskType[] | undefined;
  sections?: readonly Section[] | undefined;
  /** Contagens exatas por tipo — só no modo `counts`. */
  counts?: Partial<Record<TaskType, number>> | undefined;
  size?: number | undefined;
}

interface Classified {
  meta: QuestionMeta;
  snap: QuestionSnapshot | undefined;
  reason: QueueReason;
}

function passesFilters(
  meta: QuestionMeta,
  opts: Pick<QueueBuildOptions, "types" | "sections" | "state">,
): boolean {
  if (opts.types && !opts.types.includes(meta.type)) return false;
  if (opts.sections && !opts.sections.includes(meta.section)) return false;
  if (opts.state.settings.onlyVerified && meta.provenance !== "verificada") return false;
  return true;
}

function classify(
  meta: QuestionMeta,
  state: AppState,
  now: number,
): { meta: QuestionMeta; snap: QuestionSnapshot | undefined; reason: QueueReason } {
  const snap = state.questions[meta.id];
  if (!snap || snap.attempts === 0) return { meta, snap, reason: "nova" };
  if (isDue(snap, now)) return { meta, snap, reason: "vencida" };
  const passScore = PASS_SCORE_BY_TYPE[meta.type] ?? 75;
  if (snap.lastScore !== null && snap.lastScore < passScore) return { meta, snap, reason: "fraca" };
  return { meta, snap, reason: "revisao" };
}

/** Ordenação de vencidas: pior nota primeiro (null conta como 0), depois a mais vencida. */
function worseFirst(a: Classified, b: Classified): number {
  const sa = a.snap?.lastScore ?? 0;
  const sb = b.snap?.lastScore ?? 0;
  if (sa !== sb) return sa - sb;
  return (a.snap?.dueAt ?? 0) - (b.snap?.dueAt ?? 0);
}

/** Intercala tipos: uma questão de cada tipo por rodada, na ordem do catálogo. */
function interleaveByType(entries: readonly Classified[]): Classified[] {
  const groups = new Map<TaskType, Classified[]>();
  for (const entry of entries) {
    const group = groups.get(entry.meta.type);
    if (group) group.push(entry);
    else groups.set(entry.meta.type, [entry]);
  }
  const order = TASK_TYPES.filter((t) => groups.has(t));
  const cursors = new Map<TaskType, number>(order.map((t) => [t, 0]));
  const out: Classified[] = [];
  let remaining = entries.length;
  while (remaining > 0) {
    let progressed = false;
    for (const type of order) {
      const group = groups.get(type);
      const cursor = cursors.get(type) ?? 0;
      const item = group?.[cursor];
      if (group && item) {
        out.push(item);
        cursors.set(type, cursor + 1);
        remaining -= 1;
        progressed = true;
      }
    }
    if (!progressed) break;
  }
  return out;
}

/** Menos recente primeiro (dentro de um tipo). */
function leastRecentFirst(a: Classified, b: Classified): number {
  return (a.snap?.lastAttemptAt ?? 0) - (b.snap?.lastAttemptAt ?? 0);
}

function orderWithinType(entries: readonly Classified[]): Classified[] {
  const due = entries.filter((e) => e.reason === "vencida").sort(worseFirst);
  const weak = entries.filter((e) => e.reason === "fraca").sort(worseFirst);
  const fresh = entries.filter((e) => e.reason === "nova");
  const seen = entries.filter((e) => e.reason === "revisao").sort(leastRecentFirst);
  return [...due, ...weak, ...fresh, ...seen];
}

/**
 * Constrói a fila (§8). Nunca repete qid; respeita filtros, `onlyVerified` e o
 * estoque real. `size` limita o total (padrão 20 em smart/due/errors; no modo
 * `counts` o teto é a soma das contagens pedidas).
 */
export function buildQueue(opts: QueueBuildOptions): QueueEntry[] {
  const visible = opts.items.filter((meta) => passesFilters(meta, opts));
  const classified = visible.map((meta) => classify(meta, opts.state, opts.now));
  const size =
    opts.size ?? (opts.mode === "counts" ? Number.POSITIVE_INFINITY : DEFAULT_QUEUE_SIZE);

  const toEntries = (list: readonly Classified[]): QueueEntry[] =>
    list
      .slice(0, Math.max(0, size))
      .map((c) => ({ id: c.meta.id, type: c.meta.type, reason: c.reason }));

  if (opts.mode === "due") {
    return toEntries(
      interleaveByType(classified.filter((c) => c.reason === "vencida").sort(worseFirst)),
    );
  }

  if (opts.mode === "errors") {
    return toEntries(
      classified
        .filter((c) => c.reason === "fraca")
        .sort((a, b) => (b.snap?.lastAttemptAt ?? 0) - (a.snap?.lastAttemptAt ?? 0)),
    );
  }

  if (opts.mode === "counts") {
    const out: Classified[] = [];
    const seen = new Set<string>();
    for (const type of TASK_TYPES) {
      const want = opts.counts?.[type] ?? 0;
      if (want <= 0) continue;
      const pool = orderWithinType(classified.filter((c) => c.meta.type === type));
      for (const item of pool) {
        if (out.length >= size) break;
        if (seen.has(item.meta.id)) continue;
        seen.add(item.meta.id);
        out.push(item);
        if (out.filter((c) => c.meta.type === type).length >= want) break;
      }
    }
    return out.map((c) => ({ id: c.meta.id, type: c.meta.type, reason: c.reason }));
  }

  // smart — revisão (vencidas pior-nota-primeiro → fracas) intercalada com novas, 2:1.
  const review = [
    ...classified.filter((c) => c.reason === "vencida").sort(worseFirst),
    ...classified.filter((c) => c.reason === "fraca").sort(worseFirst),
  ];
  const fresh = classified.filter((c) => c.reason === "nova");
  const reviewInter = interleaveByType(review);
  const freshInter = interleaveByType(fresh);

  const merged: Classified[] = [];
  let ri = 0;
  let fi = 0;
  while ((ri < reviewInter.length || fi < freshInter.length) && merged.length < size) {
    for (let k = 0; k < 2 && ri < reviewInter.length && merged.length < size; k += 1) {
      merged.push(reviewInter[ri] as Classified);
      ri += 1;
    }
    if (fi < freshInter.length && merged.length < size) {
      merged.push(freshInter[fi] as Classified);
      fi += 1;
    }
  }
  return merged.map((c) => ({ id: c.meta.id, type: c.meta.type, reason: c.reason }));
}

// ---- Badges (§8): contagens de vencidas ----

interface CountOpts {
  types?: readonly TaskType[] | undefined;
  sections?: readonly Section[] | undefined;
}

export function countDue(
  items: readonly QuestionMeta[],
  state: AppState,
  now: number,
  opts: CountOpts = {},
): number {
  let total = 0;
  for (const meta of items) {
    if (opts.types && !opts.types.includes(meta.type)) continue;
    if (opts.sections && !opts.sections.includes(meta.section)) continue;
    if (isDue(state.questions[meta.id], now)) total += 1;
  }
  return total;
}

export function countDueByType(
  items: readonly QuestionMeta[],
  state: AppState,
  now: number,
): Partial<Record<TaskType, number>> {
  const out: Partial<Record<TaskType, number>> = {};
  for (const meta of items) {
    if (!isDue(state.questions[meta.id], now)) continue;
    out[meta.type] = (out[meta.type] ?? 0) + 1;
  }
  return out;
}

export function countDueBySection(
  items: readonly QuestionMeta[],
  state: AppState,
  now: number,
): Record<Section, number> {
  const out: Record<Section, number> = { speaking: 0, writing: 0, reading: 0, listening: 0 };
  for (const meta of items) {
    if (!isDue(state.questions[meta.id], now)) continue;
    out[meta.section] += 1;
  }
  return out;
}
