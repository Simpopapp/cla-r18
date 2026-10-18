import { describe, expect, it } from "vitest";

import {
  buildQueue,
  countDue,
  countDueBySection,
  countDueByType,
  DEFAULT_QUEUE_SIZE,
} from "@/lib/pte/queue";
import type { QuestionMeta } from "@/lib/pte/manifest";
import { emptyState, STATE_VERSION } from "@/lib/storage";
import type { AppState } from "@/lib/storage";
import type { Section, TaskType } from "@/lib/pte/types";

const DAY_MS = 86_400_000;

let seq = 0;
function meta(type: TaskType, provenance: QuestionMeta["provenance"] = "verificada"): QuestionMeta {
  seq += 1;
  return {
    id: `q${seq}`,
    type,
    section: SECTION_OF[type] as Section,
    domain: "teste",
    provenance,
  };
}

const SECTION_OF: Record<string, Section> = {
  wfd: "listening",
  read_aloud: "speaking",
  read_mcq_single: "reading",
  sst: "listening",
};

function stateWith(
  entries: { id: string; lastScore?: number; lastAttemptAt: number; dueAt: number }[],
): AppState {
  const state = emptyState();
  for (const e of entries) {
    state.questions[e.id] = {
      attempts: 1,
      bestScore: e.lastScore ?? null,
      lastScore: e.lastScore ?? null,
      lastAttemptAt: e.lastAttemptAt,
      strongAttempts: 0,
      box: 0,
      dueAt: e.dueAt,
    };
  }
  return state;
}

const NOW = 1_800_000_000_000;

describe("buildQueue — due", () => {
  it("só devolve vencidas, pior nota primeiro", () => {
    const items = [
      meta("wfd"),
      meta("wfd"),
      meta("wfd"),
      meta("read_aloud"), // nova — não entra
    ];
    const state = stateWith([
      { id: items[0]!.id, lastScore: 90, lastAttemptAt: NOW, dueAt: NOW - DAY_MS },
      { id: items[1]!.id, lastScore: 40, lastAttemptAt: NOW, dueAt: NOW - 2 * DAY_MS },
      { id: items[2]!.id, lastScore: 60, lastAttemptAt: NOW, dueAt: NOW - DAY_MS },
    ]);
    const queue = buildQueue({ items, state, now: NOW, mode: "due" });
    expect(queue).toHaveLength(3);
    expect(queue.map((e) => e.id)).toEqual([items[1]!.id, items[2]!.id, items[0]!.id]);
    expect(queue.every((e) => e.reason === "vencida")).toBe(true);
  });
});

describe("buildQueue — smart", () => {
  it("intercala 2 revisão : 1 nova e nunca repete qid", () => {
    const items = [meta("wfd"), meta("read_aloud"), meta("read_mcq_single")];
    const state = stateWith(
      items.map((m) => ({ id: m.id, lastScore: 50, lastAttemptAt: NOW, dueAt: NOW - DAY_MS })),
    );
    const fresh = [meta("sst"), meta("wfd"), meta("read_aloud")];
    const all = [...items, ...fresh];
    const queue = buildQueue({ items: all, state, now: NOW, mode: "smart", size: 9 });
    const ids = queue.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    // padrão 2:1 — posições 2 e 5 são novas
    expect(queue[2]?.reason).toBe("nova");
    expect(queue[5]?.reason).toBe("nova");
    expect(queue.filter((e) => e.reason === "vencida")).toHaveLength(3);
  });

  it("size padrão é 20", () => {
    const items = Array.from({ length: 30 }, () => meta("wfd"));
    const queue = buildQueue({ items, state: emptyState(), now: NOW, mode: "smart" });
    expect(queue).toHaveLength(DEFAULT_QUEUE_SIZE);
  });
});

describe("buildQueue — counts", () => {
  it("respeita contagens exatas e o estoque real", () => {
    const wfd = [meta("wfd"), meta("wfd")]; // estoque 2
    const ra = [meta("read_aloud"), meta("read_aloud"), meta("read_aloud")];
    const queue = buildQueue({
      items: [...wfd, ...ra],
      state: emptyState(),
      now: NOW,
      mode: "counts",
      counts: { wfd: 3, read_aloud: 2 },
    });
    const byType = queue.reduce<Record<string, number>>((acc, e) => {
      acc[e.type] = (acc[e.type] ?? 0) + 1;
      return acc;
    }, {});
    expect(byType["wfd"]).toBe(2); // estoque limita
    expect(byType["read_aloud"]).toBe(2);
  });
});

describe("buildQueue — errors", () => {
  it("só fracas, mais recentes primeiro", () => {
    const items = [meta("wfd"), meta("wfd"), meta("wfd"), meta("sst")];
    const state = stateWith([
      { id: items[0]!.id, lastScore: 40, lastAttemptAt: NOW - 1000, dueAt: NOW + DAY_MS },
      { id: items[1]!.id, lastScore: 50, lastAttemptAt: NOW, dueAt: NOW + DAY_MS },
      { id: items[2]!.id, lastScore: 95, lastAttemptAt: NOW, dueAt: NOW + DAY_MS }, // aprovada
      { id: items[3]!.id, lastScore: 30, lastAttemptAt: NOW + 1000, dueAt: NOW + DAY_MS },
    ]);
    const queue = buildQueue({ items, state, now: NOW, mode: "errors" });
    expect(queue.map((e) => e.id)).toEqual([items[3]!.id, items[1]!.id, items[0]!.id]);
  });
});

describe("buildQueue — filtros", () => {
  it("onlyVerified esconde fontes comunitárias", () => {
    const items = [meta("wfd", "comunitaria"), meta("wfd", "verificada")];
    const state = emptyState();
    state.settings.onlyVerified = true;
    const queue = buildQueue({ items, state, now: NOW, mode: "smart" });
    expect(queue).toHaveLength(1);
    expect(queue[0]?.id).toBe(items[1]!.id);
  });
});

describe("badges de vencidas", () => {
  it("countDue / byType / bySection", () => {
    const items = [meta("wfd"), meta("sst"), meta("read_aloud")];
    const state = stateWith([
      { id: items[0]!.id, lastScore: 50, lastAttemptAt: NOW, dueAt: NOW - 1 },
      { id: items[1]!.id, lastScore: 50, lastAttemptAt: NOW, dueAt: NOW - 1 },
      { id: items[2]!.id, lastScore: 50, lastAttemptAt: NOW, dueAt: NOW + DAY_MS },
    ]);
    expect(countDue(items, state, NOW)).toBe(2);
    expect(countDueByType(items, state, NOW)).toEqual({ wfd: 1, sst: 1 });
    expect(countDueBySection(items, state, NOW).listening).toBe(2);
    expect(countDueBySection(items, state, NOW).speaking).toBe(0);
  });
});

describe("estado", () => {
  it("STATE_VERSION segue em 1 (fase não altera persistência)", () => {
    expect(STATE_VERSION).toBe(1);
  });
});
