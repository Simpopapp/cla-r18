import { describe, expect, it } from "vitest";

import glossaryJson from "@/data/plus/glossary.json";
import { lookupWord, type Glossary } from "@/lib/plus/glossary";

const glossary = glossaryJson as Glossary;

const INVALID_ENDS = /[.,;:!?)]$/;

describe("plus glossary (invariantes sobre o arquivo real)", () => {
  it("não está vazio", () => {
    expect(Object.keys(glossary).length).toBeGreaterThan(0);
  });

  it("chaves minúsculas; literal 1–3 palavras pt-BR, ≤60, sem pontuação final", () => {
    for (const [word, entry] of Object.entries(glossary)) {
      expect(word, word).toBe(word.toLowerCase());
      expect(word).toMatch(/^[a-z]+(-[a-z]+)*$/);
      const { literal } = entry;
      expect(typeof literal, word).toBe("string");
      expect(literal.length, word).toBeGreaterThan(0);
      expect(literal.length, word).toBeLessThanOrEqual(60);
      expect(literal, word).toBe(literal.toLowerCase());
      expect(literal.split(/\s+/).length, word).toBeLessThanOrEqual(3);
      expect(INVALID_ENDS.test(literal), `${word} → ${literal}`).toBe(false);
      expect(literal.toLowerCase(), word).not.toBe(word);
    }
  });

  it("contextual ≤80 e ≠ literal, quando presente", () => {
    for (const [word, entry] of Object.entries(glossary)) {
      if (entry.contextual === undefined) continue;
      expect(entry.contextual.length, word).toBeLessThanOrEqual(80);
      expect(entry.contextual.toLowerCase(), word).not.toBe(entry.literal.toLowerCase());
    }
  });

  it("amostras reais: palavras frequentes têm tradução não vazia", () => {
    const sample = ["however", "because", "government", "increase", "important"].filter(
      (w) => glossary[w] !== undefined,
    );
    expect(sample.length).toBeGreaterThanOrEqual(3);
    for (const w of sample) expect(glossary[w]?.literal.length).toBeGreaterThan(0);
  });

  it("lookup: miss honesto (null), com pontuação e apóstrofo tipográfico", () => {
    const word = Object.keys(glossary)[0] ?? "however";
    expect(lookupWord(glossary, word)?.literal).toBeTruthy();
    expect(lookupWord(glossary, `${word},`)).toEqual(lookupWord(glossary, word));
    expect(lookupWord(glossary, "palavrquisenaoexiste")).toBeNull();
  });
});
