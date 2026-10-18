// Testes de templateDetector — PRD §9.4, aceites F4 (3): positiva real,
// negativa real, falsos-positivos comuns e "nunca altera nota" (detector só
// devolve veredito; o score nunca depende dele).

import { describe, expect, it } from "vitest";

import {
  detectTemplate,
  ngramRepeatRate,
  sameStartSentences,
  templatePhraseHits,
} from "@/lib/pte/templateDetector";
import { tokenizeWords } from "@/lib/pte/coverage";

const GENUINE = `Remote work changed how teams collaborate across borders and time zones.
Companies that adopted flexible schedules reported higher retention, although onboarding new
hires remotely demands deliberate effort. Trust grows from clear expectations, documented
decisions and regular one-to-one conversations rather than from surveillance software.
Offices still matter for apprenticeship: junior colleagues learn faster when they can watch
seniors negotiate a difficult client call. The most durable arrangement mixes both worlds.`;

const TEMPLATE = `In today's world, technology plays a vital role in education.
In today's world, technology plays a vital role in medicine.
First and foremost, students must be disciplined. First and foremost, teachers must adapt.
In conclusion, technology plays a vital role in society.`;

describe("ngramRepeatRate", () => {
  it("texto genuíno tem taxa baixa", () => {
    const rate = ngramRepeatRate(tokenizeWords(GENUINE));
    expect(rate).toBeLessThanOrEqual(0.15);
  });

  it("frase copiada eleva a taxa", () => {
    const sentence = "technology plays a vital role in education today";
    const rate = ngramRepeatRate(tokenizeWords(`${sentence} ${sentence}`));
    expect(rate).toBeGreaterThan(0.15);
  });

  it("menos de 4 tokens → 0", () => {
    expect(ngramRepeatRate(["one", "two", "three"])).toBe(0);
  });
});

describe("sameStartSentences", () => {
  it("conta frases com o mesmo início de 2 palavras", () => {
    const text = "In today world. In today society. In today economy. Other beginning here.";
    expect(sameStartSentences(text)).toBe(3);
  });

  it("inícios distintos → 1", () => {
    expect(sameStartSentences("Dogs bark loudly. Cats sleep deeply.")).toBe(1);
  });
});

describe("templatePhraseHits", () => {
  it("detecta frases-modelo públicas", () => {
    const hits = templatePhraseHits("It is important to note that, in conclusion, we agree.");
    expect(hits).toContain("it is important to note that");
    expect(hits).toContain("in conclusion");
  });

  it("não detecta em texto genuíno", () => {
    expect(templatePhraseHits(GENUINE)).toEqual([]);
  });
});

describe("detectTemplate", () => {
  it("positiva real: ≥ 2 sinais com ≥ 40 palavras", () => {
    const verdict = detectTemplate(TEMPLATE);
    expect(verdict.likelyTemplate).toBe(true);
    expect(verdict.signals).toBeGreaterThanOrEqual(2);
    expect(verdict.reasons.length).toBeGreaterThanOrEqual(2);
  });

  it("negativa real: texto genuíno não é template", () => {
    const verdict = detectTemplate(GENUINE);
    expect(verdict.likelyTemplate).toBe(false);
  });

  it("falso positivo comum não dispara: menos de 40 palavras", () => {
    const verdict = detectTemplate(
      "In today's world, technology plays a vital role. In conclusion.",
    );
    expect(verdict.likelyTemplate).toBe(false);
    expect(verdict.words).toBeLessThan(40);
  });

  it("um sinal só não é template", () => {
    const text = `${"students learn better when lessons connect to real problems. ".repeat(3)}first and foremost.`;
    const verdict = detectTemplate(text);
    expect(verdict.signals).toBeLessThan(2);
    expect(verdict.likelyTemplate).toBe(false);
  });
});
