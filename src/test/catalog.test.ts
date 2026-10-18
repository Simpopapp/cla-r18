// Fase 3 — catálogo e manifest (PRD §5.2, §8, §6.6). Complementa bank-integrity:
// aqui testam-se seleção (pickNext), selo de banco, shuffle determinístico e
// busca que nunca expõe gabarito oculto.

import { describe, expect, it } from "vitest";

import { pickNext, questionSearchText, seededShuffle } from "@/lib/pte/catalog";
import { BANK_TARGETS } from "@/lib/pte/bankTargets";
import {
  allMeta,
  countOf,
  isSmallBank,
  sectionCounts,
  TOTAL_ALL_QUESTIONS,
  TYPE_COUNT,
} from "@/lib/pte/manifest";
import { SECTIONS, TASK_TYPES, type Question } from "@/lib/pte/types";
import type { QuestionSnapshot } from "@/lib/storage";

function fakeQuestion(id: string, type: Question["type"], data: unknown): Question {
  return {
    id,
    type,
    source: { domain: "teste.local" },
    provenance: "comunitaria",
    data,
  } as unknown as Question;
}

function snap(over: Partial<QuestionSnapshot>): QuestionSnapshot {
  return {
    attempts: 1,
    bestScore: 80,
    lastScore: 80,
    lastAttemptAt: 0,
    strongAttempts: 1,
    box: 2,
    dueAt: Number.MAX_SAFE_INTEGER,
    ...over,
  };
}

describe("manifest (fonte única dos números)", () => {
  it("contagens derivadas fecham entre si", () => {
    expect(TYPE_COUNT).toBe(TASK_TYPES.length);
    expect(TOTAL_ALL_QUESTIONS).toBe(allMeta.length);
    const byType = TASK_TYPES.reduce((acc, t) => acc + countOf(t), 0);
    expect(byType).toBe(TOTAL_ALL_QUESTIONS);
    const bySection = SECTIONS.reduce((acc, s) => acc + sectionCounts[s], 0);
    expect(bySection).toBe(TOTAL_ALL_QUESTIONS);
  });

  it("selo 'banco pequeno' segue a meta mínima de cada tipo", () => {
    expect(countOf("wfd")).toBeLessThan(BANK_TARGETS["wfd"].min);
    expect(isSmallBank("wfd")).toBe(true);
    expect(countOf("describe_image")).toBeGreaterThanOrEqual(BANK_TARGETS["describe_image"].min);
    expect(isSmallBank("describe_image")).toBe(false);
  });
});

describe("pickNext (fila do tipo)", () => {
  const questions = [
    fakeQuestion("a", "wfd", { transcript: "a" }),
    fakeQuestion("b", "wfd", { transcript: "b" }),
    fakeQuestion("c", "wfd", { transcript: "c" }),
    fakeQuestion("d", "wfd", { transcript: "d" }),
  ];

  it("vencida primeiro", () => {
    const snapshots: Record<string, QuestionSnapshot> = {
      b: snap({ dueAt: 100 }),
      c: snap({}),
    };
    expect(pickNext(questions, snapshots, 200)?.id).toBe("b");
  });

  it("depois, nunca tentada", () => {
    const snapshots: Record<string, QuestionSnapshot> = {
      b: snap({}),
      c: snap({}),
    };
    expect(pickNext(questions, snapshots, 200)?.id).toBe("a");
  });

  it("por fim, a menos recente", () => {
    const snapshots: Record<string, QuestionSnapshot> = {
      a: snap({ lastAttemptAt: 120 }),
      b: snap({ lastAttemptAt: 100 }),
      c: snap({ lastAttemptAt: 50 }),
      d: snap({ lastAttemptAt: 90 }),
    };
    expect(pickNext(questions, snapshots, 200)?.id).toBe("c");
  });

  it("lista vazia → null", () => {
    expect(pickNext([], {}, 0)).toBeNull();
  });
});

describe("seededShuffle (reorder determinístico)", () => {
  const items = ["um", "dois", "três", "quatro", "cinco"];

  it("mesma semente ⇒ mesma ordem (SSR estável)", () => {
    expect(seededShuffle(items, "seed-x")).toEqual(seededShuffle(items, "seed-x"));
  });

  it("sementes diferentes podem divergir", () => {
    const orders = new Set(
      Array.from({ length: 8 }, (_, i) => JSON.stringify(seededShuffle(items, `seed-${i}`))),
    );
    expect(orders.size).toBeGreaterThan(1);
  });

  it("é uma permutação", () => {
    const shuffled = seededShuffle(items, "seed-perm");
    expect([...shuffled].sort()).toEqual([...items].sort());
  });
});

describe("questionSearchText (nunca expõe gabarito oculto)", () => {
  it("inclui campos visíveis (texto, passage, prompt, alt)", () => {
    const q = fakeQuestion("ra-1", "read_aloud", { text: "Legumes grow quickly" });
    expect(questionSearchText(q)).toContain("legumes");
    const mcq = fakeQuestion("mcq-1", "read_mcq_single", {
      passage: "Ancient trade routes",
      question: "What is the main idea?",
      options: ["A", "B"],
      answer: 0,
    });
    const text = questionSearchText(mcq);
    expect(text).toContain("trade routes");
    expect(text).toContain("main idea");
    expect(text).not.toContain("answer");
  });

  it("não inclui transcrição de tipos de áudio (gabarito)", () => {
    const repeat = fakeQuestion("rs-1", "repeat_sentence", { transcript: "the secret sentence" });
    const text = questionSearchText(repeat);
    expect(text).not.toContain("secret sentence");
    const wfd = fakeQuestion("wfd-1", "wfd", { transcript: "dictation answer words" });
    expect(questionSearchText(wfd)).not.toContain("dictation answer");
  });
});
