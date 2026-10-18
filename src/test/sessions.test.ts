import { describe, expect, it } from "vitest";

import {
  advanceSession,
  discardDraft,
  endSession,
  isSessionComplete,
  isStateShape,
  startSession,
  recordAttempt,
} from "@/lib/storage";
import { emptyState } from "@/lib/storage";

const NOW = 1_800_000_000_000;

describe("sessões retomáveis", () => {
  it("start → advance → end arquiva só com ≥ 1 resultado", () => {
    let state = startSession(emptyState(), "mixed", ["q1", "q2", "q3"], NOW);
    expect(state.draft?.cursor).toBe(0);
    state = advanceSession(state, "q1", 80);
    expect(state.draft?.cursor).toBe(1);
    expect(state.draft?.results).toBe(1);
    expect(state.draft?.sumScore).toBe(80);
    expect(isSessionComplete(state)).toBe(false);
    const ended = endSession(state, NOW + 1000, "sess-1");
    expect(ended.draft).toBeNull();
    expect(ended.sessions).toHaveLength(1);
    expect(ended.sessions[0]).toMatchObject({ id: "sess-1", n: 1, sum: 80, kind: "mixed" });
  });

  it("sessão sem nenhum resultado não arquiva registro", () => {
    let state = startSession(emptyState(), "due", ["q1"], NOW);
    state = endSession(state, NOW + 1000, "sess-2");
    expect(state.draft).toBeNull();
    expect(state.sessions).toHaveLength(0);
  });

  it("cursor só avança na questão atual (resposta fora de ordem não corrompe)", () => {
    let state = startSession(emptyState(), "errors", ["q1", "q2"], NOW);
    state = advanceSession(state, "q2", 90);
    expect(state.draft?.cursor).toBe(0);
    state = advanceSession(state, "q1", null);
    expect(state.draft?.cursor).toBe(1);
    expect(state.draft?.results).toBe(1);
    expect(state.draft?.sumScore).toBe(0); // nota null não soma
  });

  it("descartar limpa o rascunho sem arquivar", () => {
    let state = startSession(emptyState(), "plan", ["q1"], NOW);
    state = discardDraft(state);
    expect(state.draft).toBeNull();
    expect(state.sessions).toHaveLength(0);
  });

  it("retomar após reload: o draft sobrevive ao round-trip do estado", () => {
    // simula reload: persistiu → JSON → load (isStateShape valida o rascunho)
    let state = startSession(emptyState(), "mixed", ["q1", "q2", "q3"], NOW);
    state = advanceSession(state, "q1", 70);
    const persisted = JSON.parse(JSON.stringify(state)) as unknown;
    expect(isStateShape(persisted)).toBe(true);
    const restored = persisted as typeof state;
    expect(restored.draft?.cursor).toBe(1);
    expect(isSessionComplete(restored)).toBe(false);
    const resumed = advanceSession(restored, "q2", 90);
    expect(resumed.draft?.cursor).toBe(2);
    const finished = endSession(resumed, NOW + 5000, "sess-3");
    expect(finished.sessions[0]).toMatchObject({ n: 2, sum: 160 });
  });

  it("sessão completa é detectada e o histórico tem teto de 100", () => {
    let state = startSession(emptyState(), "mixed", ["q1"], NOW);
    state = advanceSession(state, "q1", 100);
    expect(isSessionComplete(state)).toBe(true);
    state = endSession(state, NOW + 1000, "sess-4");
    for (let i = 0; i < 150; i += 1) {
      state = endSession(
        {
          ...state,
          draft: {
            kind: "mixed",
            startedAt: NOW + i,
            ids: ["q1"],
            cursor: 1,
            results: 1,
            sumScore: 10,
          },
        },
        NOW + 1000 + i,
        `sess-extra-${i}`,
      );
    }
    expect(state.sessions.length).toBeLessThanOrEqual(100);
  });

  it("tentativa em modo session alimenta o SRS normalmente", () => {
    let state = startSession(emptyState(), "due", ["q1"], NOW);
    state = recordAttempt(state, {
      id: "a1",
      qid: "q1",
      type: "wfd",
      ts: NOW,
      score: 90,
      mode: "session",
    });
    expect(state.questions["q1"]?.attempts).toBe(1);
    expect(state.questions["q1"]?.box).toBe(1);
    state = advanceSession(state, "q1", 90);
    expect(isSessionComplete(state)).toBe(true);
  });
});
