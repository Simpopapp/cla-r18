import { describe, expect, it } from "vitest";

import { sentenceCount, splitSentences } from "@/lib/plus/sentences";

describe("plus sentences", () => {
  it("divide por . ! ? seguidos de espaço/fim", () => {
    expect(splitSentences("One. Two! Three? Four")).toEqual(["One.", "Two!", "Three?", "Four"]);
  });

  it("abreviação comum não fecha frase", () => {
    expect(splitSentences("Dr. Smith arrived. Then etc. ended.")).toEqual([
      "Dr. Smith arrived.",
      "Then etc. ended.",
    ]);
  });

  it("marcador de lacuna {{n}} permanece na frase", () => {
    const parts = splitSentences("The city {{1}} grew fast. It boomed.");
    expect(parts).toEqual(["The city {{1}} grew fast.", "It boomed."]);
  });

  it("texto vazio → nenhuma frase", () => {
    expect(splitSentences("   ")).toEqual([]);
    expect(sentenceCount("")).toBe(0);
  });
});
