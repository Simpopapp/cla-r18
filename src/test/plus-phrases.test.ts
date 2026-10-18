import { describe, expect, it } from "vitest";

import { hashSentence, lookupPhrase, normalizeSentenceForHash } from "@/lib/plus/phrases";

const FILE = {
  q1: {
    text: [{ h: hashSentence("First sentence here."), l: "Primeira frase aqui.", c: "abertura" }],
  },
};

describe("plus phrases", () => {
  it("hash estável e normalizado (caixa, pontuação, números, apóstrofo)", () => {
    expect(hashSentence("First sentence here.")).toBe(hashSentence("first  Sentence, here!"));
    expect(hashSentence("It's number 42.")).toBe(hashSentence("it's number 99."));
    expect(normalizeSentenceForHash("Don't {{1}} stop!")).toBe("don't stop");
  });

  it("lookup acerta pelo índice e valida o hash", () => {
    expect(lookupPhrase(FILE, "q1", "text", 0, "First sentence here.")).toEqual({
      literal: "Primeira frase aqui.",
      contextual: "abertura",
    });
  });

  it("origem mudada (h diferente) → null, nunca tradução errada", () => {
    expect(lookupPhrase(FILE, "q1", "text", 0, "First sentence changed.")).toBeNull();
  });

  it("qid/campo/índice ausentes → null", () => {
    expect(lookupPhrase(FILE, "q2", "text", 0, "First sentence here.")).toBeNull();
    expect(lookupPhrase(FILE, "q1", "other", 0, "First sentence here.")).toBeNull();
    expect(lookupPhrase(FILE, "q1", "text", 5, "First sentence here.")).toBeNull();
    expect(lookupPhrase(null, "q1", "text", 0, "First sentence here.")).toBeNull();
  });
});
