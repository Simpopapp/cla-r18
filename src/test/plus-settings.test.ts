import { describe, expect, it } from "vitest";

import {
  DEFAULT_PLUS_SETTINGS,
  normalizePlusSettings,
  PLUS_TOGGLES,
  plusEnabled,
} from "@/lib/plus/settings";

describe("plus settings", () => {
  it("defaults: tudo desligado", () => {
    const s = normalizePlusSettings(undefined);
    expect(s).toEqual({
      wordTranslation: false,
      phraseTranslation: false,
      plusAudio: false,
    });
    expect(plusEnabled(s)).toBe(false);
  });

  it("as 8 combinações são válidas", () => {
    for (let mask = 0; mask < 8; mask++) {
      const raw = {
        wordTranslation: (mask & 1) !== 0,
        phraseTranslation: (mask & 2) !== 0,
        plusAudio: (mask & 4) !== 0,
      };
      const s = normalizePlusSettings(raw);
      expect(s).toEqual(raw);
      expect(plusEnabled(s)).toBe(mask !== 0);
    }
  });

  it("normaliza lixo para false (nunca liga por acidente)", () => {
    expect(normalizePlusSettings("sim")).toEqual(DEFAULT_PLUS_SETTINGS);
    expect(
      normalizePlusSettings({ wordTranslation: 1, phraseTranslation: "true", plusAudio: null }),
    ).toEqual(DEFAULT_PLUS_SETTINGS);
    expect(normalizePlusSettings({ wordTranslation: true }).wordTranslation).toBe(true);
  });

  it("áudio fala o inglês original — nunca a tradução", () => {
    const audio = PLUS_TOGGLES.find((t) => t.key === "plusAudio");
    expect(audio?.description).toMatch(/inglês original/i);
    expect(audio?.description).toMatch(/nunca a tradução/i);
  });
});
