import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// Chunk budget (PRD2 §7.4): nenhum arquivo de dados do banco > 250 KB bruto.
// build-manifest divide tipos que estouram em `<t>.json` + `<t>-b.json` e
// allMeta em all-meta-1/2; o loader em manifest.ts concatena as partes.
const DATA = path.resolve(__dirname, "..", "data", "pte");
const LIMIT = 250 * 1024;

const files = ["manifest.json", "all-meta-1.json", "all-meta-2.json", "aliases.json"]
  .map((f) => path.join(DATA, f))
  .filter((f) => {
    try {
      statSync(f);
      return true;
    } catch {
      return false;
    }
  });

for (const f of statSync(DATA).isDirectory() ? [...files, ...dataFiles()] : files) {
  it(`chunk ≤ 250 KB: ${path.basename(f)}`, () => {
    expect(statSync(f).size).toBeLessThanOrEqual(LIMIT);
  });
}

function dataFiles(): string[] {
  // cada tipo + partes -b (declaradas em manifest.chunkSplitTypes)
  const entries = readFileSync(path.join(DATA, "manifest.json"), "utf8");
  const manifest = JSON.parse(entries) as {
    countByType: Record<string, number>;
    chunkSplitTypes?: string[];
  };
  const out: string[] = [];
  for (const t of Object.keys(manifest.countByType)) {
    out.push(path.join(DATA, `${t}.json`));
    const b = path.join(DATA, `${t}-b.json`);
    try {
      statSync(b);
      out.push(b);
    } catch {
      // sem parte B
    }
  }
  return out;
}

describe("chunk splits consistentes (PRD2 §7.4)", () => {
  const manifest = JSON.parse(readFileSync(path.join(DATA, "manifest.json"), "utf8")) as {
    countByType: Record<string, number>;
    chunkSplitTypes?: string[];
    TOTAL_ALL_QUESTIONS: number;
  };

  it("todo tipo em chunkSplitTypes tem parte -b e parte A", () => {
    for (const t of manifest.chunkSplitTypes ?? []) {
      expect(statSync(path.join(DATA, `${t}.json`)).size).toBeLessThanOrEqual(LIMIT);
      expect(statSync(path.join(DATA, `${t}-b.json`)).size).toBeLessThanOrEqual(LIMIT);
    }
  });

  it("nenhuma parte -b órfã fora de chunkSplitTypes", () => {
    for (const f of dataFiles()) {
      if (!f.endsWith("-b.json")) continue;
      const t = path.basename(f, "-b.json");
      expect(manifest.chunkSplitTypes ?? []).toContain(t);
    }
  });

  it("all-meta 1+2 soma TOTAL_ALL_QUESTIONS", () => {
    const a = JSON.parse(readFileSync(path.join(DATA, "all-meta-1.json"), "utf8")) as unknown[];
    const b = JSON.parse(readFileSync(path.join(DATA, "all-meta-2.json"), "utf8")) as unknown[];
    expect(a.length + b.length).toBe(manifest.TOTAL_ALL_QUESTIONS);
  });
});
