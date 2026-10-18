// SRS — PRD §8. Caixas 0–5; promove só questão vencida; lapso rebaixa 1 (D11).
// Módulo puro: seguro para SSR e testes. Importa tipos do storage via `import type`
// (ciclo tipo-a-tipo é apagado no build).

import type { Attempt, QuestionSnapshot } from "@/lib/storage";
import type { TaskType } from "@/lib/pte/types";

/** Intervalos por caixa (dias). Caixa 0 = revisar de novo já (vencida). */
export const SRS_INTERVAL_DAYS = [0, 1, 3, 7, 14, 30] as const;

export const MAX_BOX = 5;

const DAY_MS = 86_400_000;

/**
 * Nota de aprovação por tipo (D12 — constante única, calibrada por natureza
 * da tarefa: ditado exige mais; retenção de conteúdo menos; seleção no meio).
 */
export const PASS_SCORE_BY_TYPE: Record<TaskType, number> = {
  // Ditado / lacunas de áudio — precisão máxima (85)
  wfd: 85,
  lst_fib: 85,
  // Fala com texto à vista (80)
  read_aloud: 80,
  repeat_sentence: 80,
  // Retenção e produção de conteúdo (70)
  sst: 70,
  retell_lecture: 70,
  sgd: 70,
  rts: 70,
  describe_image: 70,
  swt: 70,
  write_essay: 70,
  // Seleção / ordenação (75)
  read_mcq_multi: 75,
  read_mcq_single: 75,
  read_fib_dropdown: 75,
  read_fib_drag: 75,
  reorder_paragraphs: 75,
  lst_mcq_multi: 75,
  lst_mcq_single: 75,
  lst_hcs: 75,
  lst_smw: 75,
  lst_hiw: 75,
  answer_short: 75,
};

/** Vencida = já tentada e `dueAt ≤ now`. */
export function isDue(snap: QuestionSnapshot | undefined, now: number): boolean {
  return !!snap && snap.attempts > 0 && snap.dueAt <= now;
}

/** Dominada = caixa 5 com última nota ≥ aprovação (exige ≥ 5 promoções vencidas). */
export function isDominated(snap: QuestionSnapshot, passScore: number): boolean {
  return snap.box === MAX_BOX && snap.lastScore !== null && snap.lastScore >= passScore;
}

/**
 * Aplica uma tentativa ao snapshot (§8). Tentativas sem score só contam
 * (`attempts++`) — nunca alteram caixa nem vencimento.
 */
export function applyAttemptToSnapshot(
  snap: QuestionSnapshot | undefined,
  attempt: Attempt,
  passScore: number,
): QuestionSnapshot {
  const ts = attempt.ts;
  const base: QuestionSnapshot = snap ?? {
    attempts: 0,
    bestScore: null,
    lastScore: null,
    lastAttemptAt: ts,
    strongAttempts: 0,
    box: 0,
    dueAt: ts,
  };

  if (attempt.score === null || attempt.score === undefined) {
    return { ...base, attempts: base.attempts + 1, lastAttemptAt: ts };
  }

  const score = attempt.score;
  // A 1ª tentativa de uma questão conta como vencida para fins de promoção.
  const due = snap === undefined || base.attempts === 0 || base.dueAt <= ts;

  let box = base.box;
  let dueAt = base.dueAt;
  let strongAttempts = base.strongAttempts;

  if (score >= passScore) {
    if (due) {
      // Vencida e aprovada: promove 1 caixa e agenda o próximo intervalo.
      box = Math.min(box + 1, MAX_BOX);
      strongAttempts += 1;
      const interval = SRS_INTERVAL_DAYS[box] ?? 0;
      dueAt = ts + interval * DAY_MS;
    }
    // Antecipada (aprovada antes de vencer): registra, não promove, `dueAt` inalterado.
  } else {
    // Lapso (vencida ou não): rebaixa 1 caixa e agenda pelo novo intervalo.
    box = Math.max(box - 1, 0);
    const interval = SRS_INTERVAL_DAYS[box] ?? 0;
    dueAt = ts + interval * DAY_MS;
  }

  return {
    attempts: base.attempts + 1,
    bestScore: base.bestScore === null ? score : Math.max(base.bestScore, score),
    lastScore: score,
    lastAttemptAt: ts,
    strongAttempts,
    box,
    dueAt,
  };
}

export type SrsState = "nova" | "vencida" | "aprendizado" | "revisao" | "dominada" | "fraca";

/**
 * Estado para filtros (§8). Precedência: vencida primeiro (precisa de revisão
 * hoje em qualquer caixa); depois dominada; depois fraca; em seguida aprendizado
 * (box ≤ 2) e revisão (box 3–4).
 */
export function snapshotState(
  snap: QuestionSnapshot | undefined,
  passScore: number,
  now: number,
): SrsState {
  if (!snap || snap.attempts === 0) return "nova";
  if (snap.dueAt <= now) return "vencida";
  if (isDominated(snap, passScore)) return "dominada";
  if (snap.lastScore !== null && snap.lastScore < passScore) return "fraca";
  if (snap.box <= 2) return "aprendizado";
  return "revisao";
}
