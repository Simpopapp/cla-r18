// Relatório semanal — PRD §9.7. Gerado sob demanda, FORA do backup. Escala
// única: estimativa 10–90 vs. alvo; notas de exercício só como média 0–100
// rotulada. Módulo puro.

import { addDays, computeStreak, dailyAverages, dayKey } from "./dates";
import { confidenceOf, skillEstimates } from "./estimate";
import { topMissedWords } from "./diagnostics";
import { daysUntil } from "./goal";
import { SECTION_LABELS } from "./studyPlan";
import { SECTIONS } from "./types";
import type { QuestionMeta } from "./manifest";
import type { AppState } from "@/lib/storage";
import type { Section, Skill } from "./types";

export const REPORT_WINDOW_DAYS = 7;
/** Teto da sequência exibida (D24 — "até N dias"). */
export const STREAK_MAX_DAYS = 365;

export interface ReportSkill {
  skill: Skill;
  sectionLabel: string;
  estimate: number | null;
  confidence: ReturnType<typeof confidenceOf>;
  trend: number | null;
}

export interface WeeklyReport {
  period: { from: string; to: string };
  exportedAt: string;
  daysToExam: number | null;
  target: number;
  /** sequência de dias com tentativas ("até N dias") */
  streak: number;
  attemptsCount: number;
  scoredCount: number;
  /** média das notas de exercício (0–100) na semana — rotulada na UI */
  overallAvg: number | null;
  /** média desta semana − média da anterior (positivo = melhorando) */
  delta7d: number | null;
  skills: ReportSkill[];
  topErrors: ReturnType<typeof topMissedWords>;
  dueCount: number;
}

export function weeklyReport(
  state: AppState,
  now: number,
  meta: readonly QuestionMeta[],
): WeeklyReport {
  const today = dayKey(now);
  const from = addDays(today, -(REPORT_WINDOW_DAYS - 1));

  let attemptsCount = 0;
  let scored = 0;
  let sum = 0;
  for (let i = 0; i < REPORT_WINDOW_DAYS; i += 1) {
    const agg = state.daily[addDays(today, -i)];
    if (!agg) continue;
    attemptsCount += agg.n;
    scored += agg.scored;
    sum += agg.sum;
  }
  const overallAvg = scored === 0 ? null : sum / scored;

  const current = dailyAverages(state.daily, today, REPORT_WINDOW_DAYS, REPORT_WINDOW_DAYS);
  const previous = dailyAverages(
    state.daily,
    addDays(today, -REPORT_WINDOW_DAYS),
    REPORT_WINDOW_DAYS,
    REPORT_WINDOW_DAYS,
  );
  const delta7d =
    current.avgScore === null || previous.avgScore === null
      ? null
      : current.avgScore - previous.avgScore;

  const estimates = skillEstimates(state, now, meta);
  const skills: ReportSkill[] = SECTIONS.map((skill) => ({
    skill,
    sectionLabel: SECTION_LABELS[skill as Section] ?? skill,
    estimate: estimates[skill].estimate,
    confidence: estimates[skill].confidence,
    trend: estimates[skill].trend,
  }));

  let dueCount = 0;
  for (const snap of Object.values(state.questions)) {
    if (snap.attempts > 0 && snap.dueAt <= now) dueCount += 1;
  }

  return {
    period: { from, to: today },
    exportedAt: new Date(now).toISOString(),
    daysToExam: state.settings.examDate ? daysUntil(state.settings.examDate, now) : null,
    target: state.settings.targetScore,
    streak: computeStreak(state.daily, today, STREAK_MAX_DAYS),
    attemptsCount,
    scoredCount: scored,
    overallAvg,
    delta7d,
    skills,
    topErrors: topMissedWords(state, 5),
    dueCount,
  };
}

const fmt = (value: number | null, digits = 0): string =>
  value === null
    ? "—"
    : value.toLocaleString("pt-BR", { maximumFractionDigits: digits, minimumFractionDigits: 0 });

const trendLabel = (trend: number | null): string => {
  if (trend === null) return "—";
  if (trend > 0) return `+${fmt(trend, 1)} (subindo)`;
  if (trend < 0) return `${fmt(trend, 1)} (caindo)`;
  return "estável";
};

/** Markdown pt-BR com tabelas — pronto para colar/compartilhar. */
export function renderReportMarkdown(report: WeeklyReport): string {
  const lines: string[] = [];
  lines.push("# Relatório semanal — PTE Master Hub");
  lines.push("");
  lines.push(
    `Período: ${report.period.from} a ${report.period.to} · gerado em ${report.exportedAt}`,
  );
  lines.push("");
  lines.push(
    `Meta e prova: alvo ${report.target} (escala 10–90)${
      report.daysToExam === null ? "" : ` · faltam ${report.daysToExam} dia(s)`
    } · sequência: até ${report.streak} dias`,
  );
  lines.push("");
  lines.push(
    `Semana: ${report.attemptsCount} tentativa(s) · média de treino ${fmt(report.overallAvg, 1)}` +
      (report.delta7d === null
        ? ""
        : ` (${report.delta7d >= 0 ? "+" : ""}${fmt(report.delta7d, 1)} vs. semana anterior)`),
  );
  lines.push("");
  lines.push("| Habilidade | Estimativa (treino) | Confiança | Tendência |");
  lines.push("| --- | --- | --- | --- |");
  for (const skill of report.skills) {
    lines.push(
      `| ${skill.sectionLabel} | ${skill.estimate ?? "—"} | ${skill.confidence} | ${trendLabel(skill.trend)} |`,
    );
  }
  lines.push("");
  lines.push(`Questões vencidas hoje: ${report.dueCount}`);
  if (report.topErrors.length > 0) {
    lines.push("");
    lines.push("Palavras/trechos mais errados:");
    lines.push("");
    lines.push("| Item | Vezes |");
    lines.push("| --- | --- |");
    for (const error of report.topErrors) {
      lines.push(`| ${error.word} | ${error.count} |`);
    }
  }
  lines.push("");
  lines.push(
    "_Estimativas de treino na escala 10–90 — nunca nota oficial. Médias de exercício usam a escala 0–100._",
  );
  return lines.join("\n");
}

/** JSON estável (datas ISO; chaves em ordem fixa de construção). */
export function renderReportJson(report: WeeklyReport): string {
  return JSON.stringify(report);
}
