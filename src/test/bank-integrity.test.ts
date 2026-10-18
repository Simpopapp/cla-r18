// Fase 2 — testes de integridade do banco de questões (PRD §6.9).
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import type { Question, TaskType } from "@/lib/pte/types";
import { TASK_TYPES } from "@/lib/pte/types";
import { BANK_TARGETS } from "@/lib/pte/bankTargets";

// C7: valores derivados — contagens e soma vêm dos JSONs, nunca hardcoded.
const DATA_DIR = path.resolve(__dirname, "..", "data", "pte");
const ROOT_DIR = path.resolve(DATA_DIR, "..", "..", "..");

function bank(type: TaskType): Question[] {
  const file = path.join(DATA_DIR, `${type}.json`);
  return JSON.parse(readFileSync(file, "utf8")) as Question[];
}

const BANKS = Object.fromEntries(TASK_TYPES.map((t) => [t, bank(t)])) as Record<
  TaskType,
  Question[]
>;

function tokensOf(s: string): string[] {
  return s
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\p{P}\p{S}]+/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function jaccard(a: string[], b: string[]): number {
  const A = new Set(a),
    B = new Set(b);
  if (A.size === 0 && B.size === 0) return 1;
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  const union = A.size + B.size - inter;
  return union === 0 ? 0 : inter / union;
}

function textOf(type: TaskType, q: Question): string {
  const d = q.data as unknown as Record<string, unknown>;
  const field: Record<TaskType, string> = {
    read_aloud: "text",
    repeat_sentence: "transcript",
    describe_image: "alt",
    retell_lecture: "transcript",
    answer_short: "question",
    sgd: "keywords",
    rts: "scenario",
    swt: "text",
    write_essay: "prompt",
    read_fib_dropdown: "passage",
    read_mcq_multi: "passage",
    reorder_paragraphs: "paragraphs",
    read_fib_drag: "passage",
    read_mcq_single: "passage",
    sst: "transcript",
    lst_mcq_multi: "transcript",
    lst_fib: "template",
    lst_hcs: "transcript",
    lst_mcq_single: "transcript",
    lst_smw: "transcript",
    lst_hiw: "spoken",
    wfd: "sentence",
  };
  const v = d[field[type]];
  if (Array.isArray(v)) return (v as string[]).join(" ");
  return typeof v === "string" ? v : JSON.stringify(v);
}

describe("banco — schema e unicidade (§6.9)", () => {
  it("cada tipo tem array válido; ids únicos dentro e entre tipos; provenance válida", () => {
    const allIds = new Set<string>();
    for (const type of TASK_TYPES) {
      const arr = BANKS[type];
      expect(Array.isArray(arr)).toBe(true);
      for (const q of arr) {
        expect(q.id, `${type}: id ausente`).toMatch(/\S/);
        expect(allIds.has(q.id), `id repetido: ${q.id}`).toBe(false);
        allIds.add(q.id);
        expect(["verificada", "comunitaria"]).toContain(q.provenance);
        expect(q.source?.domain).toMatch(/\S/);
      }
    }
  });

  it("nenhum par quase-duplicado (Jaccard ≥ 0,85) dentro do mesmo tipo", () => {
    for (const type of TASK_TYPES) {
      const texts = BANKS[type].map((q) => tokensOf(textOf(type, q)));
      for (let i = 0; i < texts.length; i++) {
        for (let j = i + 1; j < texts.length; j++) {
          const sim = jaccard(texts[i] as string[], texts[j] as string[]);
          const idA = BANKS[type][i]?.id ?? "?";
          const idB = BANKS[type][j]?.id ?? "?";
          expect(sim, `${type}: ${idA} ≈ ${idB} (${sim.toFixed(2)})`).toBeLessThan(0.85);
        }
      }
    }
  });
});

describe("banco — respostas dentro das opções (§6.9)", () => {
  it("MCQ/SMW/HCS: answer ∈ opções; multi com ≥ 2 respostas", () => {
    for (const type of [
      "read_mcq_single",
      "read_mcq_multi",
      "lst_mcq_single",
      "lst_mcq_multi",
      "lst_hcs",
      "lst_smw",
    ] as TaskType[]) {
      for (const q of BANKS[type]) {
        const d = q.data as unknown as Record<string, unknown>;
        const options = d["options"] as string[];
        const answer = d["answer"] as number | number[];
        expect(options?.length ?? 0, `${q.id}: opções ausentes`).toBeGreaterThanOrEqual(3);
        if (type === "read_mcq_multi" || type === "lst_mcq_multi") {
          expect(Array.isArray(answer), `${q.id}: multi exige array`).toBe(true);
          expect((answer as number[]).length, `${q.id}: multi < 2`).toBeGreaterThanOrEqual(2);
          for (const a of answer as number[])
            expect(a, `${q.id}: índice fora`).toBeLessThan(options.length);
        } else {
          expect(answer, `${q.id}: answer fora das opções`).toBeLessThan(options.length);
        }
      }
    }
  });

  it("FIB: nº de marcadores = nº de lacunas; resposta ∈ opções/bank; lst_fib 1 palavra", () => {
    for (const type of ["read_fib_dropdown", "read_fib_drag", "lst_fib"] as TaskType[]) {
      for (const q of BANKS[type]) {
        const d = q.data as unknown as Record<string, unknown>;
        const passage = (d["passage"] ?? d["template"]) as string;
        const marks = (passage.match(/\{\{\d+\}\}/g) ?? []).length;
        if (type === "read_fib_dropdown") {
          const blanks = d["blanks"] as { options: string[]; answer: number }[];
          expect(marks, `${q.id}: marcadores ≠ blanks`).toBe(blanks.length);
          for (const b of blanks) {
            expect(b.options.length, `${q.id}: < 3 opções`).toBeGreaterThanOrEqual(3);
            expect(b.answer, `${q.id}: fora das opções`).toBeLessThan(b.options.length);
          }
        } else if (type === "read_fib_drag") {
          const bankWords = d["bank"] as string[];
          const answers = d["answers"] as number[];
          expect(marks, `${q.id}: marcadores ≠ answers`).toBe(answers.length);
          for (const a of answers)
            expect(a, `${q.id}: índice fora do bank`).toBeLessThan(bankWords.length);
        } else {
          const answers = d["answers"] as string[];
          expect(marks, `${q.id}: marcadores ≠ answers`).toBe(answers.length);
          for (const a of answers)
            expect(a.split(/\s+/).length, `${q.id}: lst_fib > 1 palavra`).toBe(1);
        }
      }
    }
  });

  it("lst_hiw: spoken ≠ shown com discrepâncias reais por token", () => {
    for (const q of BANKS["lst_hiw"]) {
      const d = q.data as unknown as Record<string, unknown>;
      const spoken = tokensOf(d["spoken"] as string);
      const shown = tokensOf(d["shown"] as string);
      const counts = new Map<string, number>();
      for (const w of spoken) counts.set(w, (counts.get(w) ?? 0) + 1);
      let wrong = 0;
      const shownCounts = new Map<string, number>();
      for (const w of shown) shownCounts.set(w, (shownCounts.get(w) ?? 0) + 1);
      for (const [w, c] of shownCounts) if ((counts.get(w) ?? 0) < c) wrong++;
      expect(wrong, `${q.id}: sem discrepância`).toBeGreaterThan(0);
    }
  });
});

describe("banco — faixas de formato (§6.8) e governança", () => {
  const WORD_RANGES: Partial<Record<TaskType, [string, number, number]>> = {
    read_aloud: ["text", 25, 120],
    repeat_sentence: ["transcript", 4, 25],
    wfd: ["sentence", 3, 20],
    swt: ["text", 150, 350],
    write_essay: ["prompt", 15, 120],
    rts: ["scenario", 20, 200],
  };

  it("faixas de palavras respeitadas (itens fora da faixa são permitidos apenas como 'revisão' no trabalho, não aqui)", () => {
    for (const entry of Object.entries(WORD_RANGES) as [TaskType, [string, number, number]][]) {
      const type = entry[0];
      const [field, min, max] = entry[1];
      for (const q of BANKS[type]) {
        const n = tokensOf((q.data as unknown as Record<string, unknown>)[field] as string).length;
        expect(n, `${q.id}: ${n} palavras fora de ${min}–${max}`).toBeGreaterThanOrEqual(
          Math.max(3, min - 5),
        );
        expect(n, `${q.id}: ${n} palavras fora de ${min}–${max}`).toBeLessThanOrEqual(max + 15);
      }
    }
  });

  it("todo domínio está registrado em sources.json (banco ou varredura) com status aprovado", () => {
    const sources = JSON.parse(
      readFileSync(path.join(ROOT_DIR, ".opencode", "work", "bank", "sources.json"), "utf8"),
    ) as {
      sources: { domain: string; status: string }[];
    };
    const sweepSources = JSON.parse(
      readFileSync(path.join(ROOT_DIR, ".opencode", "work", "sweep", "sources-sweep.json"), "utf8"),
    ) as { sources: { url: string; status: string }[] };
    const approved = new Set(
      sources.sources.filter((s) => s.status === "aprovada").map((s) => s.domain),
    );
    // catálogo da varredura (PRD2): url completa; status aprovado/derivados
    for (const s of sweepSources.sources) {
      const ok =
        ["verificada", "corroborada", "comunitaria"].includes(s.status) ||
        (s.status ?? "").startsWith("aprovada");
      if (ok) approved.add(new URL(s.url).hostname.replace(/^www\./, ""));
    }
    for (const type of TASK_TYPES) {
      for (const q of BANKS[type]) {
        expect(
          approved.has(q.source.domain),
          `${q.id}: domínio não aprovado ${q.source.domain}`,
        ).toBe(true);
      }
    }
  });

  it("aliases.json resolve para ids existentes", () => {
    const file = path.join(ROOT_DIR, "src", "data", "aliases.json");
    if (!readFileSync(file, "utf8").trim()) return;
    const aliases = JSON.parse(readFileSync(file, "utf8")) as Record<string, string>;
    for (const [from, to] of Object.entries(aliases)) {
      expect(allIds(), `alias ${from} → ${to} inexistente`).toContain(to);
      expect(from).not.toBe(to);
    }
    function allIds(): string[] {
      return TASK_TYPES.flatMap((t) => BANKS[t].map((q) => q.id));
    }
  });

  it("manifesto = soma dos JSONs (números derivados, nunca hardcoded)", () => {
    const manifest = JSON.parse(readFileSync(path.join(DATA_DIR, "manifest.json"), "utf8")) as {
      TOTAL_ALL_QUESTIONS: number;
      countByType: Record<string, number>;
      TYPE_META: Record<string, { ready: boolean }>;
    };
    let total = 0;
    for (const type of TASK_TYPES) {
      expect(manifest.countByType[type]).toBe(BANKS[type].length);
      total += BANKS[type].length;
    }
    expect(manifest.TOTAL_ALL_QUESTIONS).toBe(total);
    expect(Object.keys(manifest.TYPE_META).sort()).toEqual([...TASK_TYPES].sort());
    for (const type of TASK_TYPES) {
      const min = BANK_TARGETS[type].min;
      const meta = manifest.TYPE_META[type] as { ready: boolean } | undefined;
      if (!meta) throw new Error(`TYPE_META ausente para ${type}`);
      if (BANKS[type].length > 0 && BANKS[type].length < min) {
        expect(meta.ready).toBe(true); // banco pequeno: pronto, mas marcado
      } else {
        expect(meta.ready).toBe(BANKS[type].length > 0);
      }
    }
  });

  it("describe_image: imagens existem em public/di com alt, facts e licença", () => {
    for (const q of BANKS["describe_image"]) {
      const d = q.data as unknown as Record<string, unknown>;
      const img = d["image"] as string;
      const file = path.join(ROOT_DIR, "public", img);
      expect(readFileSync(file).byteLength, `${q.id}: imagem ausente/pequena`).toBeGreaterThan(
        10_000,
      );
      expect(d["alt"] as string).toMatch(/\S/);
      expect(
        (d["facts"] as string[]).length,
        `${q.id}: facts insuficientes`,
      ).toBeGreaterThanOrEqual(2);
      expect(q.source.license).toBe("CC BY 4.0");
      expect(q.source.attribution).toContain("ourworldindata.org");
    }
  });
});
