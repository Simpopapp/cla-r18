import { describe, expect, it } from "vitest";
import {
  applyAttemptToSnapshot,
  isDominated,
  isDue,
  MAX_BOX,
  PASS_SCORE_BY_TYPE,
  SRS_INTERVAL_DAYS,
  snapshotState,
} from "@/lib/pte/srs";
import { TASK_TYPES } from "@/lib/pte/types";
import type { Attempt, QuestionSnapshot } from "@/lib/storage";
import type { TaskType } from "@/lib/pte/types";

// Fase 1 — SRS: caixa = memória, não volume (D11, D12; PRD §8).

const DAY = 86_400_000;

function attempt(ts: number, score: number | null, type: TaskType = "read_aloud"): Attempt {
  return { id: `a-${ts}`, qid: "q1", type, ts, score, mode: "practice" };
}

function snap(partial: Partial<QuestionSnapshot>): QuestionSnapshot {
  return {
    attempts: 1,
    bestScore: null,
    lastScore: null,
    lastAttemptAt: 0,
    strongAttempts: 0,
    box: 0,
    dueAt: 0,
    ...partial,
  };
}

describe("PASS_SCORE_BY_TYPE", () => {
  it("cobre exatamente os 22 tipos (C7 — constante única)", () => {
    expect(Object.keys(PASS_SCORE_BY_TYPE).length).toBe(22);
    expect(new Set(Object.keys(PASS_SCORE_BY_TYPE))).toEqual(new Set<string>(TASK_TYPES));
  });

  it("um caso por faixa (ditado 85, fala com texto 80, conteúdo 70, seleção 75)", () => {
    expect(PASS_SCORE_BY_TYPE["wfd"]).toBe(85);
    expect(PASS_SCORE_BY_TYPE["lst_fib"]).toBe(85);
    expect(PASS_SCORE_BY_TYPE["read_aloud"]).toBe(80);
    expect(PASS_SCORE_BY_TYPE["repeat_sentence"]).toBe(80);
    expect(PASS_SCORE_BY_TYPE["sst"]).toBe(70);
    expect(PASS_SCORE_BY_TYPE["write_essay"]).toBe(70);
    expect(PASS_SCORE_BY_TYPE["read_mcq_single"]).toBe(75);
    expect(PASS_SCORE_BY_TYPE["reorder_paragraphs"]).toBe(75);
  });
});

describe("applyAttemptToSnapshot", () => {
  it("maratona: 5 acertos em 5 minutos numa questão nova → caixa 1", () => {
    let result = applyAttemptToSnapshot(undefined, attempt(0, 90), 80);
    for (let i = 1; i <= 4; i += 1) {
      result = applyAttemptToSnapshot(result, attempt(i * 60_000, 90), 80);
    }
    expect(result.box).toBe(1);
    expect(result.strongAttempts).toBe(1);
    expect(result.dueAt).toBe(0 + SRS_INTERVAL_DAYS[1] * DAY);
  });

  it("1ª tentativa conta como vencida: aprovada promove para a caixa 1", () => {
    const result = applyAttemptToSnapshot(undefined, attempt(0, 90), 80);
    expect(result.box).toBe(1);
    expect(result.attempts).toBe(1);
    expect(result.lastScore).toBe(90);
    expect(result.bestScore).toBe(90);
  });

  it("aprovada antecipada registra, mas não promove nem mexe no vencimento", () => {
    const base = snap({ box: 2, dueAt: 5 * DAY, attempts: 3 });
    const result = applyAttemptToSnapshot(base, attempt(1 * DAY, 95), 80);
    expect(result.box).toBe(2);
    expect(result.dueAt).toBe(5 * DAY);
    expect(result.lastScore).toBe(95);
    expect(result.bestScore).toBe(95);
    expect(result.strongAttempts).toBe(0);
  });

  it("vencida aprovada promove 1 caixa", () => {
    const base = snap({ box: 3, dueAt: 0, attempts: 10 });
    const result = applyAttemptToSnapshot(base, attempt(1 * DAY, 90), 80);
    expect(result.box).toBe(4);
    expect(result.strongAttempts).toBe(1);
    expect(result.dueAt).toBe(1 * DAY + SRS_INTERVAL_DAYS[4] * DAY);
  });

  it("lapso rebaixa 1 caixa, vencida ou não", () => {
    const due = applyAttemptToSnapshot(snap({ box: 3, dueAt: 0 }), attempt(1 * DAY, 10), 80);
    expect(due.box).toBe(2);
    expect(due.dueAt).toBe(1 * DAY + SRS_INTERVAL_DAYS[2] * DAY);

    const early = applyAttemptToSnapshot(
      snap({ box: 3, dueAt: 9 * DAY }),
      attempt(2 * DAY, 10),
      80,
    );
    expect(early.box).toBe(2);
    expect(early.dueAt).toBe(2 * DAY + SRS_INTERVAL_DAYS[2] * DAY);
  });

  it("lapso na caixa 0 fica na caixa 0", () => {
    const result = applyAttemptToSnapshot(snap({ box: 0, dueAt: 0 }), attempt(1 * DAY, 10), 80);
    expect(result.box).toBe(0);
  });

  it("sem score: só attempts++ — caixa e vencimento intactos", () => {
    const base = snap({ box: 4, dueAt: 5 * DAY, attempts: 7, lastScore: 90, bestScore: 90 });
    const result = applyAttemptToSnapshot(base, attempt(1 * DAY, null), 80);
    expect(result.attempts).toBe(8);
    expect(result.box).toBe(4);
    expect(result.dueAt).toBe(5 * DAY);
    expect(result.lastScore).toBe(90);
  });

  it("promoção satura na caixa 5", () => {
    const base = snap({ box: MAX_BOX, dueAt: 0 });
    const result = applyAttemptToSnapshot(base, attempt(1 * DAY, 90), 80);
    expect(result.box).toBe(MAX_BOX);
  });

  it("dominada é inalcançável por maratona (exige promoções vencidas)", () => {
    let result = applyAttemptToSnapshot(undefined, attempt(0, 90), 80);
    for (let i = 1; i <= 10; i += 1)
      result = applyAttemptToSnapshot(result, attempt(i * 60_000, 90), 80);
    expect(isDominated(result, 80)).toBe(false); // caixa 1
    expect(isDominated(snap({ box: 5, lastScore: 90 }), 80)).toBe(true);
    expect(isDominated(snap({ box: 5, lastScore: 10 }), 80)).toBe(false);
  });
});

describe("isDue / snapshotState", () => {
  it("vencida = tentada e dueAt ≤ now", () => {
    expect(isDue(snap({ attempts: 1, dueAt: 100 }), 100)).toBe(true);
    expect(isDue(snap({ attempts: 1, dueAt: 101 }), 100)).toBe(false);
    expect(isDue(undefined, 100)).toBe(false);
  });

  it("estados para filtros com precedência", () => {
    expect(snapshotState(undefined, 80, 0)).toBe("nova");
    expect(snapshotState(snap({ dueAt: 0 }), 80, 10)).toBe("vencida");
    expect(snapshotState(snap({ box: 1, dueAt: 5 * DAY, lastScore: 90 }), 80, 10)).toBe(
      "aprendizado",
    );
    expect(snapshotState(snap({ box: 3, dueAt: 5 * DAY, lastScore: 90 }), 80, 10)).toBe("revisao");
    expect(snapshotState(snap({ box: 5, dueAt: 5 * DAY, lastScore: 90 }), 80, 10)).toBe("dominada");
    expect(snapshotState(snap({ box: 3, dueAt: 5 * DAY, lastScore: 10 }), 80, 10)).toBe("fraca");
  });
});
