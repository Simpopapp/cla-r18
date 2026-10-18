import { describe, expect, it } from "vitest";

import { renderReportJson, renderReportMarkdown, weeklyReport } from "@/lib/pte/report";
import type { QuestionMeta } from "@/lib/pte/manifest";
import { emptyState } from "@/lib/storage";

const NOW = new Date(2026, 9, 17, 12, 0, 0).getTime();
const DAY_MS = 86_400_000;

const META: QuestionMeta[] = [
  { id: "q1", type: "wfd", section: "listening", domain: "geral", provenance: "verificada" },
];

function attempt(score: number, ageDays: number) {
  return {
    id: `a${ageDays}-${score}`,
    qid: "q1",
    type: "wfd" as const,
    ts: NOW - ageDays * DAY_MS,
    score,
    mode: "practice" as const,
  };
}

function day(ts: number, n: number, sum: number) {
  const d = new Date(ts);
  const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return [key, { n, scored: n, sum, byType: { wfd: [n, sum] as [number, number] } }] as const;
}

describe("weeklyReport", () => {
  it("agrega semana, delta, sequência e vencidas", () => {
    const state = emptyState();
    state.settings.examDate = "2026-10-20";
    state.settings.targetScore = 65;
    state.attempts = [attempt(80, 0), attempt(60, 1)];
    state.daily = Object.fromEntries([
      day(NOW, 1, 80),
      day(NOW - DAY_MS, 1, 60),
      day(NOW - 8 * DAY_MS, 2, 100), // semana anterior
    ]);
    state.questions["q1"] = {
      attempts: 3,
      bestScore: 80,
      lastScore: 60,
      lastAttemptAt: NOW - DAY_MS,
      strongAttempts: 0,
      box: 0,
      dueAt: NOW - 1,
    };
    const report = weeklyReport(state, NOW, META);
    expect(report.period.to).toBe("2026-10-17");
    expect(report.attemptsCount).toBe(2);
    expect(report.overallAvg).toBe(70);
    expect(report.delta7d).not.toBeNull();
    expect(report.daysToExam).toBe(3);
    expect(report.target).toBe(65);
    expect(report.dueCount).toBe(1);
    expect(report.skills).toHaveLength(4);
    expect(report.skills.find((s) => s.skill === "listening")?.estimate).toBeGreaterThan(0);
  });

  it("estado vazio não inventa números", () => {
    const report = weeklyReport(emptyState(), NOW, META);
    expect(report.attemptsCount).toBe(0);
    expect(report.overallAvg).toBeNull();
    expect(report.delta7d).toBeNull();
    expect(report.daysToExam).toBeNull();
    expect(report.skills.every((s) => s.estimate === null)).toBe(true);
  });
});

describe("renderReportMarkdown", () => {
  it("markdown pt-BR com tabelas e rótulos honestos", () => {
    const report = weeklyReport(emptyState(), NOW, META);
    const md = renderReportMarkdown(report);
    expect(md).toContain("# Relatório semanal");
    expect(md).toContain("| Habilidade | Estimativa (treino) | Confiança | Tendência |");
    expect(md).toContain("nunca nota oficial");
  });
});

describe("renderReportJson", () => {
  it("JSON estável e determinístico", () => {
    const state = emptyState();
    const a = renderReportJson(weeklyReport(state, NOW, META));
    const b = renderReportJson(weeklyReport(state, NOW, META));
    expect(a).toBe(b);
    expect(() => JSON.parse(a)).not.toThrow();
  });
});
