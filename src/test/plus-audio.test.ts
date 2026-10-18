import { describe, expect, it } from "vitest";

import { POLICY as mjsPolicy } from "../../scripts/plus/policy.mjs";
import { eligibleFields, plusFieldPolicy, plusWordPolicy } from "@/lib/plus/plusAudio";
import { TASK_TYPES } from "@/lib/pte/types";

describe("plus field policy", () => {
  it("chave da resposta nunca aparece antes do resultado", () => {
    // sentence do wfd e transcript de repeat/retell/sst/lst_* só no resultado
    for (const [type, field] of [
      ["wfd", "sentence"],
      ["repeat_sentence", "transcript"],
      ["retell_lecture", "transcript"],
      ["sst", "transcript"],
      ["lst_smw", "transcript"],
      ["lst_hiw", "spoken"],
    ] as const) {
      const pre = plusFieldPolicy(type, field, "pre");
      expect(pre.phraseTranslation, `${type}.${field} pre`).toBe(false);
      expect(pre.phraseAudio, `${type}.${field} pre`).toBe(false);
      expect(plusWordPolicy(type, field, "pre"), `${type}.${field} bolha pre`).toBe(false);
      expect(plusFieldPolicy(type, field, "post").phraseTranslation).toBe(true);
    }
    // answers do answer_short: nunca antes; question é falada → sem áudio de frase
    expect(plusWordPolicy("answer_short", "answers", "pre")).toBe(false);
    expect(plusWordPolicy("answer_short", "answers", "post")).toBe(true);
    expect(plusFieldPolicy("answer_short", "question", "pre").phraseAudio).toBe(false);
  });

  it("campo com áudio nativo nunca tem áudio de frase (não duplica)", () => {
    for (const type of TASK_TYPES) {
      for (const rule of eligibleFields(type)) {
        if (!rule.nativeAudio) continue;
        for (const phase of ["pre", "post"] as const) {
          expect(
            plusFieldPolicy(type, rule.field, phase).phraseAudio,
            `${type}.${rule.field}`,
          ).toBe(false);
        }
      }
    }
  });

  it("fase errada → desligado; textos de leitura/escrita têm tradução e áudio", () => {
    expect(plusFieldPolicy("swt", "text", "post")).toEqual({
      phraseTranslation: false,
      phraseAudio: false,
    });
    expect(plusFieldPolicy("swt", "text", "pre")).toEqual({
      phraseTranslation: true,
      phraseAudio: true,
    });
    expect(plusFieldPolicy("swt", "sample", "post").phraseAudio).toBe(true);
  });

  it("índice de array usa a política do campo-base", () => {
    expect(plusWordPolicy("sgd", "turns[0]", "pre")).toBe(true);
    expect(plusFieldPolicy("sgd", "turns[2]", "pre").phraseAudio).toBe(false);
  });

  it("matriz do extrator (mjs) está em sincronia com a matriz do app (ts)", () => {
    for (const type of TASK_TYPES) {
      const tsFields = eligibleFields(type).sort((a, b) => a.field.localeCompare(b.field));
      const mjsFields = Object.entries(mjsPolicy[type] ?? {})
        .map(([field, rule]) => ({ field, phase: rule.phase, nativeAudio: rule.nativeAudio }))
        .sort((a, b) => a.field.localeCompare(b.field));
      expect(tsFields, type).toEqual(mjsFields);
    }
  });
});
