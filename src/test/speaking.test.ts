// Testes de fala — Motor A — PRD §9.3 (aceite F5.1: extras e repetições
// reduzem a nota de forma explicável, piso 0, constantes nomeadas).

import { describe, expect, it } from "vitest";

import {
  alignSpeech,
  answerShortMatch,
  contentFromKeywords,
  countAdjacentRepetitions,
  EXTRA_PENALTY,
  fluencyProxy,
  levenshteinRatio,
  REPEAT_PENALTY,
  speakingScore,
} from "@/lib/pte/speaking";

describe("alignSpeech (read_aloud, repeat_sentence)", () => {
  it("fala perfeita → conteúdo 100 e todas as palavras hit", () => {
    const result = alignSpeech("The quick brown fox", "the quick brown fox");
    expect(result.content).toBe(100);
    expect(result.words.every((w) => w.status === "hit")).toBe(true);
    expect(result.extras).toBe(0);
    expect(result.repetitions).toBe(0);
  });

  it("substituição próxima (razão de Levenshtein ≥ 0,75) vale meio crédito", () => {
    expect(levenshteinRatio("world", "worlt")).toBeGreaterThanOrEqual(0.75);
    const result = alignSpeech("hello world", "hello worlt");
    expect(result.words.find((w) => w.word === "world")?.status).toBe("substituted");
    // 1 hit + 0,5 substituição = 1,5/2 → 75
    expect(result.content).toBe(75);
  });

  it("moved: palavra presente mas fora de posição vale meio crédito", () => {
    const result = alignSpeech("alpha beta gamma", "gamma alpha");
    const byWord = new Map(result.words.map((w) => [w.word, w.status]));
    expect(byWord.get("alpha")).toBe("hit");
    expect(byWord.get("beta")).toBe("missed");
    expect(byWord.get("gamma")).toBe("moved");
    // 1 hit + 0,5 moved = 1,5/3 → 50
    expect(result.content).toBe(50);
  });

  it("extras reduzem a nota de forma explicável (EXTRA_PENALTY por palavra)", () => {
    // 3 hits, 3 extras → (3 − 3·0,25)/3 = 2,25/3 → 75
    const result = alignSpeech("the cat sat", "the cat sat on the mat");
    expect(result.extras).toBe(3);
    expect(result.content).toBe(75);
  });

  it("repetições adjacentes no falado penalizam (REPEAT_PENALTY)", () => {
    // hits a,b = 2; extra a = 1; repetição "a a" = 1
    // (2 − 1·0,25 − 1·0,1)/2 = 1,65/2 → 83
    const result = alignSpeech("a b", "a a b");
    expect(result.repetitions).toBe(1);
    expect(result.extras).toBe(1);
    expect(result.content).toBe(83);
  });

  it("piso 0: fala totalmente diferente não gera nota negativa", () => {
    const result = alignSpeech("alpha beta gamma delta", "x y z w");
    expect(result.content).toBe(0);
    expect(result.words.every((w) => w.status === "missed")).toBe(true);
  });

  it("constantes nomeadas expostas para a UI explicarem as penalidades", () => {
    expect(EXTRA_PENALTY).toBe(0.25);
    expect(REPEAT_PENALTY).toBe(0.1);
  });
});

describe("fluencyProxy (proxy rotulado, PRD §9.3)", () => {
  it("ritmo na faixa e sem pausas → 100", () => {
    expect(fluencyProxy({ wpm: 140, longPauses: 0, repetitions: 0 })).toBe(100);
  });

  it("cada pausa longa custa 15", () => {
    expect(fluencyProxy({ wpm: 140, longPauses: 2, repetitions: 0 })).toBe(70);
  });

  it("cada repetição custa 10", () => {
    expect(fluencyProxy({ wpm: 140, longPauses: 0, repetitions: 3 })).toBe(70);
  });

  it("ritmo fora de 120–160 wpm penaliza proporcionalmente", () => {
    expect(fluencyProxy({ wpm: 100, longPauses: 0, repetitions: 0 })).toBe(90);
    expect(fluencyProxy({ wpm: 200, longPauses: 0, repetitions: 0 })).toBe(80);
  });

  it("penalidade de ritmo tem teto", () => {
    expect(fluencyProxy({ wpm: 300, longPauses: 0, repetitions: 0 })).toBe(70);
  });

  it("sem transcrição suficiente → fluência não avaliada (null)", () => {
    expect(fluencyProxy({ wpm: null, longPauses: 0, repetitions: 0 })).toBeNull();
  });
});

describe("contentFromKeywords (cobertura, PRD §9.3)", () => {
  it("referência com menos de 4 keywords → null (sem nota, nunca inventar)", () => {
    expect(contentFromKeywords(["a", "b", "c"], "a b c")).toBeNull();
  });

  it("cobertura parcial reflete os termos cobertos", () => {
    const result = contentFromKeywords(
      ["climate change", "emissions", "carbon sinks", "warming"],
      "Climate change increases emissions worldwide.",
    );
    expect(result).not.toBeNull();
    expect(result?.content).toBe(50); // climate change + emissions
    expect(result?.missing).toEqual(["carbon sinks", "warming"]);
  });

  it("flexão simples não derruba a cobertura (stemLite)", () => {
    const result = contentFromKeywords(
      ["emissions", "warming", "sinks", "reforestation"],
      "Emissions rose, warming accelerated, carbon SINKS grew.",
    );
    expect(result?.missing).toEqual(["reforestation"]);
  });
});

describe("answerShortMatch", () => {
  it("resposta reconhecida contendo a resposta (normalizada) → true", () => {
    expect(answerShortMatch("I think it's the platform", ["Platform"])).toBe(true);
  });

  it("sinônimos da lista são aceitos", () => {
    expect(answerShortMatch("maybe a laptop or a computer", ["notebook", "laptop"])).toBe(true);
  });

  it("resposta errada ou vazia → false", () => {
    expect(answerShortMatch("the train station", ["Platform"])).toBe(false);
    expect(answerShortMatch("", ["Platform"])).toBe(false);
  });
});

describe("speakingScore e métricas", () => {
  it("nota do exercício = média de conteúdo e fluência, piso 0", () => {
    expect(speakingScore(80, 60)).toBe(70);
    expect(speakingScore(0, 0)).toBe(0);
  });

  it("countAdjacentRepetitions conta só duplicatas adjacentes", () => {
    expect(countAdjacentRepetitions("the the cat sat on the mat")).toBe(1);
    expect(countAdjacentRepetitions("no repeats here")).toBe(0);
  });
});
