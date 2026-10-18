import { describe, expect, it } from "vitest";

import { normalizeWordToken, splitWords } from "@/lib/plus/words";

describe("plus words", () => {
  it("tokeniza, minúsculas e sem pontuação externa (contrações ficam fora — sem entrada no glossário)", () => {
    expect(splitWords("Hello, world! It's fine — well-known.")).toEqual([
      "hello",
      "world",
      "fine",
      "well-known",
    ]);
  });

  it("apóstrofo tipográfico vira reto", () => {
    expect(normalizeWordToken("don\u2019t")).toBe("don't");
  });

  it("descarta números, isoladas de 1 letra e tokens longos demais", () => {
    expect(splitWords("a 42 commonplace extraordinarilylongword123 ok")).toEqual([
      "commonplace",
      "ok",
    ]);
  });

  it("hífen interno é preservado, externo descartado", () => {
    expect(splitWords("state-of-the-art -up-")).toEqual(["state-of-the-art", "up"]);
  });
});
