import { describe, expect, it } from "vitest";
import type { TaskType } from "@/lib/pte/types";
import { TASK_TYPES } from "@/lib/pte/types";
import {
  EXAM_BLUEPRINT,
  EXAM_PARTS,
  HUMAN_REVIEW_TYPES,
  SKILL_WEIGHTS,
  SKILL_WEIGHTS_PCT,
  TASK_MATRIX,
  ESTIMATE_SCALE,
} from "@/lib/pte/skillMatrix";
import { BANK_TARGETS, SEARCH_PRIORITY } from "@/lib/pte/bankTargets";

// Fase 0 — gates da verdade oficial (PRD §16, Fase 0, aceites 2 e 3).

describe("TASK_MATRIX", () => {
  it("tem exatamente 22 linhas, uma por TaskType, sem repetição", () => {
    expect(TASK_MATRIX).toHaveLength(22);
    const slugs = TASK_MATRIX.map((r) => r.slug);
    expect(new Set(slugs).size).toBe(22);
    // TaskType ≡ 22 linhas da matriz (exaustividade nos dois sentidos).
    expect(new Set(slugs)).toEqual(new Set<TaskType>(TASK_TYPES));
  });

  it("cada linha tem label, seção válida e pelo menos uma habilidade", () => {
    const sections = new Set(["speaking", "writing", "reading", "listening"]);
    for (const row of TASK_MATRIX) {
      expect(row.label.length).toBeGreaterThan(0);
      expect(sections.has(row.section)).toBe(true);
      expect(row.skills.length).toBeGreaterThan(0);
      for (const skill of row.skills) expect(sections.has(skill)).toBe(true);
      expect(row.timing.responseSeconds).toBeGreaterThan(0);
      expect(row.timing.label).toMatch(/\S/);
    }
  });
});

describe("SKILL_WEIGHTS", () => {
  it("é exatamente a soma da matriz (contagens de pares tipo×habilidade)", () => {
    const counts = { speaking: 0, writing: 0, reading: 0, listening: 0 } as Record<string, number>;
    let total = 0;
    for (const row of TASK_MATRIX) {
      for (const skill of row.skills) {
        counts[skill] = (counts[skill] ?? 0) + 1;
        total += 1;
      }
    }
    expect(total).toBe(30);
    for (const skill of ["speaking", "writing", "reading", "listening"] as const) {
      expect(SKILL_WEIGHTS[skill]).toBe((counts[skill] ?? 0) / total);
    }
    // speaking 6 · listening 12 · reading 8 · writing 4 → 20 / 40 / 27 / 13 %
    expect(SKILL_WEIGHTS_PCT).toEqual({ speaking: 20, writing: 13, reading: 27, listening: 40 });
    const pctSum = Object.values(SKILL_WEIGHTS_PCT).reduce((a, b) => a + b, 0);
    expect(pctSum).toBe(100);
  });
});

describe("EXAM_BLUEPRINT", () => {
  it("cobre exatamente os 22 tipos", () => {
    expect(Object.keys(EXAM_BLUEPRINT).sort()).toEqual([...TASK_TYPES].sort());
  });

  it("count é o ponto médio arredondado de [min, max] e fica dentro do intervalo", () => {
    for (const slug of TASK_TYPES) {
      const b = EXAM_BLUEPRINT[slug];
      if (!b) throw new Error(`blueprint ausente: ${slug}`);
      expect(b.min).toBeGreaterThanOrEqual(1);
      expect(b.max).toBeGreaterThanOrEqual(b.min);
      expect(b.count).toBe(Math.round((b.min + b.max) / 2));
      expect(b.count).toBeGreaterThanOrEqual(b.min);
      expect(b.count).toBeLessThanOrEqual(b.max);
      expect(b.seconds).toBeGreaterThan(0);
    }
  });

  it("soma das contagens = 65 (TOTAL oficial da tabela da Pearson, coluna PTE 2025 revisions)", () => {
    const total = TASK_TYPES.reduce((sum, slug) => {
      const b = EXAM_BLUEPRINT[slug];
      if (!b) throw new Error(`blueprint ausente: ${slug}`);
      return sum + b.count;
    }, 0);
    expect(total).toBe(65);
  });

  it("as 3 partes, em ordem fixa, cobrem os 22 tipos sem repetição", () => {
    expect(EXAM_PARTS.map((p) => p.id)).toEqual(["speaking-writing", "reading", "listening"]);
    const all = EXAM_PARTS.flatMap((p) => p.types);
    expect(all).toHaveLength(22);
    expect(new Set(all).size).toBe(22);
    for (const part of EXAM_PARTS) {
      expect(part.minSeconds).toBeLessThan(part.maxSeconds);
      for (const t of part.types) expect(EXAM_BLUEPRINT[t]).toBeDefined();
    }
  });
});

describe("HUMAN_REVIEW_TYPES", () => {
  it("só contém tipos conhecidos, incluindo os 5 confirmados na fonte oficial", () => {
    const slugs = new Set<TaskType>(TASK_TYPES);
    expect(HUMAN_REVIEW_TYPES.length).toBeGreaterThan(0);
    for (const t of HUMAN_REVIEW_TYPES) expect(slugs.has(t)).toBe(true);
    for (const t of ["retell_lecture", "swt", "sst", "sgd", "rts"] as TaskType[]) {
      expect(HUMAN_REVIEW_TYPES).toContain(t);
    }
  });
});

describe("ESTIMATE_SCALE", () => {
  it("é a escala 10–90 (única comparada ao alvo)", () => {
    expect(ESTIMATE_SCALE).toEqual({ min: 10, max: 90 });
  });
});

describe("BANK_TARGETS / SEARCH_PRIORITY", () => {
  it("cobre os 22 tipos com min ≤ ideal e prioridade cobre os 22 sem repetição", () => {
    expect(Object.keys(BANK_TARGETS).sort()).toEqual([...TASK_TYPES].sort());
    for (const slug of TASK_TYPES) {
      const target = BANK_TARGETS[slug];
      if (!target) throw new Error(`meta ausente: ${slug}`);
      expect(target.min).toBeLessThanOrEqual(target.ideal);
    }
    const all = Object.values(SEARCH_PRIORITY).flat();
    expect(all).toHaveLength(22);
    expect(new Set(all).size).toBe(22);
  });
});
