// Testes de summary (swt/sst) — PRD §9.4, aceites F4 (1)–(2): validador de
// frase única e zonas de tamanho com fatores de forma.

import { describe, expect, it } from "vitest";

import { checkSingleSentence, gradeSst, gradeSwt, sstFormFactor } from "@/lib/pte/summary";

describe("checkSingleSentence", () => {
  it("uma frase terminando em ponto → válida", () => {
    expect(checkSingleSentence("Climate change affects everyone.")).toEqual({
      valid: true,
      reason: null,
    });
  });

  it("interrogação e exclamação contam como ponto final", () => {
    expect(checkSingleSentence("Does it matter?").valid).toBe(true);
    expect(checkSingleSentence("Indeed!").valid).toBe(true);
  });

  it("duas frases → inválida com motivo", () => {
    const result = checkSingleSentence("First sentence. Second sentence.");
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("exatamente 1 ponto final");
  });

  it("sem ponto final → inválida", () => {
    expect(checkSingleSentence("no terminator here").valid).toBe(false);
  });

  it("vazio → inválida", () => {
    expect(checkSingleSentence("   ").valid).toBe(false);
  });
});

describe("gradeSwt", () => {
  const keywords = ["climate change", "sea levels", "coastal areas"];
  const good = "Climate change raises sea levels and endangers coastal areas. ";
  // 11 palavras, 1 frase, todas as keywords

  it("forma válida + conteúdo → score = cobertura, sem tag", () => {
    const result = gradeSwt(good, keywords);
    expect(result.formValid).toBe(true);
    expect(result.tags).toEqual([]);
    expect(result.score).toBe(100);
    expect(result.content).toBe(100);
  });

  it("cobertura parcial reflete no score", () => {
    const partial = gradeSwt("Climate change is the central challenge of this century. ", keywords);
    expect(partial.formValid).toBe(true);
    expect(partial.content).toBe(33);
    expect(partial.score).toBe(33);
  });

  it("duas frases → forma inválida, nota limitada a 40 e tag forma", () => {
    const result = gradeSwt("Climate change raises sea levels. Coastal areas suffer. ", keywords);
    expect(result.formValid).toBe(false);
    expect(result.tags).toEqual(["forma"]);
    expect(result.score).toBe(40);
    expect(result.feedback).toContain("Forma inválida");
  });

  it("abaixo da zona de 5 palavras → forma inválida", () => {
    const result = gradeSwt("Climate change sea. ", keywords);
    expect(result.formValid).toBe(false);
    expect(result.tags).toEqual(["forma"]);
    expect(result.content).toBe(33);
    expect(result.score).toBe(33);
    expect(result.feedback).toContain("palavras");
  });

  it("acima de 75 palavras → forma inválida", () => {
    const text = `${"word ".repeat(78)}here.`;
    const result = gradeSwt(text, keywords);
    expect(result.formValid).toBe(false);
    expect(result.words).toBeGreaterThan(75);
  });

  it("sem keywords → score e content null (sem nota)", () => {
    const result = gradeSwt(good, []);
    expect(result.score).toBeNull();
    expect(result.content).toBeNull();
  });
});

describe("sstFormFactor", () => {
  it.each([
    [50, 1],
    [60, 1],
    [70, 1],
    [40, 0.8],
    [80, 0.8],
    [39, 0.5],
    [81, 0.5],
  ])("%i palavras → fator %s", (words, expected) => {
    expect(sstFormFactor(words)).toBe(expected);
  });
});

describe("gradeSst", () => {
  const keywords = ["biphasic", "sleep", "industrial"];
  const sentence = "biphasic sleep patterns changed before industrial lighting of modern cities";

  it("na zona → score = cobertura", () => {
    const text = `${sentence}. ${sentence}. ${sentence}. ${sentence}. ${sentence}.`;
    const result = gradeSst(text, keywords);
    expect(result.formValid).toBe(true);
    expect(result.tags).toEqual([]);
    expect(result.score).toBe(100);
  });

  it("fora da zona por pouco → fator 0,8 e tag forma", () => {
    const unit = "biphasic sleep patterns existed before industrial lighting changed every rhythm ";
    const text = unit.repeat(4); // 44 palavras — zona 40–49
    const result = gradeSst(text, keywords);
    expect(result.content).toBe(100);
    expect(result.score).toBe(80);
    expect(result.tags).toEqual(["forma"]);
  });

  it("muito fora da zona → fator 0,5", () => {
    const result = gradeSst("Short summary. ", ["short", "summary"]);
    expect(result.score).toBe(50);
    expect(result.tags).toEqual(["forma"]);
  });

  it("sem keywords → sem nota", () => {
    expect(gradeSst("A summary with many words here. ", []).score).toBeNull();
  });
});
