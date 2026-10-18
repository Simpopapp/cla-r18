import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";

import { TopNav } from "@/components/common/TopNav";
import { Button } from "@/components/ui/button";
import { errorBreakdown, topMissedWords } from "@/lib/pte/diagnostics";
import { CONFIDENCE_LABELS, skillEstimates } from "@/lib/pte/estimate";
import { computeStreak, dailyAverages, dayKey } from "@/lib/pte/dates";
import { allMeta, TYPE_META } from "@/lib/pte/manifest";
import { countDue } from "@/lib/pte/queue";
import { READINESS_LABELS, readinessOf, varietyOf } from "@/lib/pte/readiness";
import { renderReportJson, renderReportMarkdown, weeklyReport } from "@/lib/pte/report";
import { SECTIONS, type Section, type TaskType } from "@/lib/pte/types";
import { quotaStatus, type AppState } from "@/lib/storage";
import { useAppHydrated, useAppState } from "@/lib/useAppState";

export const Route = createFileRoute("/progress")({
  head: () => ({
    meta: [
      { title: "Progresso — PTE Master Hub" },
      {
        name: "description",
        content:
          "Estimativas de treino por habilidade, padrões de erro, evolução diária e relatório da semana do seu preparo para o PTE Academic — 100% local.",
      },
      { property: "og:title", content: "Progresso — PTE Master Hub" },
      {
        property: "og:description",
        content:
          "Estimativas honestas, padrões de erro e relatório semanal do seu treino para o PTE Academic — dados só neste navegador.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProgressPage,
});

const SECTION_NAMES: Record<Section, string> = {
  speaking: "Falar",
  writing: "Escrever",
  reading: "Ler",
  listening: "Ouvir",
};

const TAG_LABELS: Record<string, string> = {
  missed: "palavras erradas",
  trap: "armadilhas",
  conteudo: "conteúdo",
  fluencia: "fluência",
  forma: "forma",
  template: "template",
};

function tagLabel(tag: string): string {
  if (tag.startsWith("missed:")) return `palavra: “${tag.slice(7)}”`;
  return TAG_LABELS[tag] ?? tag;
}

/** Última questão respondida com a tag dada (deep-link para revisar o erro). */
function latestQidWithTag(state: AppState, tag: string): string | null {
  for (let i = state.attempts.length - 1; i >= 0; i -= 1) {
    const attempt = state.attempts[i];
    if (attempt?.tags?.includes(tag)) return attempt.qid;
  }
  return null;
}

function confidenceLabelOf(confidence: keyof typeof CONFIDENCE_LABELS): string {
  return CONFIDENCE_LABELS[confidence];
}

function trendLabel(trend: number | null): string {
  if (trend === null) return "sem tendência ainda (menos de 20 tentativas)";
  if (trend > 2) return `subindo (+${trend.toLocaleString("pt-BR")})`;
  if (trend < -2) return `caindo (${trend.toLocaleString("pt-BR")})`;
  return "estável";
}

function downloadText(filename: string, text: string, mime: string): void {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function copyToClipboard(text: string): void {
  if (typeof navigator !== "undefined" && navigator.clipboard) {
    void navigator.clipboard.writeText(text);
    return;
  }
  const area = document.createElement("textarea");
  area.value = text;
  document.body.appendChild(area);
  area.select();
  document.execCommand("copy");
  area.remove();
}

function DailyBars({ values }: { values: number[] }) {
  const max = Math.max(...values, 1);
  const width = 336;
  const height = 96;
  const barWidth = width / values.length - 2;
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="Tentativas por dia nos últimos 14 dias"
      className="w-full max-w-md"
    >
      {values.map((value, index) => {
        const barHeight = Math.round((value / max) * (height - 16));
        return (
          <rect
            key={index}
            x={index * (barWidth + 2)}
            y={height - barHeight}
            width={barWidth}
            height={barHeight}
            rx={2}
            className="fill-primary"
          />
        );
      })}
    </svg>
  );
}

function ProgressPage() {
  const state = useAppState();
  const hydrated = useAppHydrated();
  const now = Date.now();
  const [copied, setCopied] = useState(false);

  const estimates = useMemo(
    () => (hydrated ? skillEstimates(state, now, allMeta) : null),
    [hydrated, state, now],
  );
  const typesLast30 = useMemo(() => {
    const set = new Set<TaskType>();
    if (!hydrated) return set;
    const cutoff = now - 30 * 86400000;
    for (const attempt of state.attempts) {
      if (attempt.ts >= cutoff) set.add(attempt.type);
    }
    return set;
  }, [hydrated, state.attempts, now]);
  const dueCount = useMemo(
    () => (hydrated ? countDue(allMeta, state, now) : 0),
    [hydrated, state, now],
  );
  const report = useMemo(
    () => (hydrated ? weeklyReport(state, now, allMeta) : null),
    [hydrated, state, now],
  );
  const markdown = useMemo(() => (report ? renderReportMarkdown(report) : ""), [report]);

  const last14 = useMemo(() => {
    const values: number[] = [];
    for (let offset = 13; offset >= 0; offset -= 1) {
      values.push(state.daily[dayKey(now - offset * 86400000)]?.n ?? 0);
    }
    return values;
  }, [state.daily, now]);

  const streak = useMemo(
    () => (hydrated ? computeStreak(state.daily, dayKey(now), 60) : 0),
    [hydrated, state.daily, now],
  );

  const breakdown = useMemo(
    () => (hydrated ? errorBreakdown(state, now, 14) : null),
    [hydrated, state, now],
  );
  const missed = useMemo(() => (hydrated ? topMissedWords(state, 12) : null), [hydrated, state]);

  const typeRows = useMemo(() => {
    return SECTIONS.flatMap((section) =>
      (Object.keys(TYPE_META) as TaskType[])
        .filter((t) => TYPE_META[t].section === section)
        .map((type) => {
          let attempted = 0;
          let sum = 0;
          let scored = 0;
          for (const meta of allMeta) {
            if (meta.type !== type) continue;
            const snapshot = state.questions[meta.id];
            if (!snapshot) continue;
            attempted += 1;
            if (snapshot.lastScore !== null) {
              sum += snapshot.lastScore;
              scored += 1;
            }
          }
          return {
            type,
            section,
            label: TYPE_META[type].label,
            attempted,
            avg: scored === 0 ? null : sum / scored,
          };
        }),
    );
  }, [state.questions]);

  const quota = useMemo(() => (hydrated ? quotaStatus(state) : null), [hydrated, state]);
  const backupStale =
    state.settings.lastBackupAt === null || now - state.settings.lastBackupAt > 14 * 86400000;
  const hasData = state.attempts.length > 0 || Object.keys(state.questions).length > 0;

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <TopNav />
      <main className="mx-auto w-full max-w-3xl flex-1 space-y-8 px-4 py-8">
        <h1 className="font-serif text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Progresso
        </h1>
        {!hasData ? (
          <p className="rounded-lg border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
            Sem dados ainda — pratique algumas questões para gerar estimativas e padrões de erro.
          </p>
        ) : null}

        <section aria-label="Estimativas por habilidade">
          <h2 className="font-serif text-xl font-semibold text-foreground">
            Estimativas de treino por habilidade
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Estimativa de treino (nunca nota oficial) a partir das últimas 60 tentativas com nota em
            45 dias.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {SECTIONS.map((section) => {
              const estimate = estimates?.[section] ?? null;
              const readiness = estimate
                ? readinessOf(estimate.estimate, state.settings.targetScore, estimate.confidence)
                : null;
              const variety = varietyOf(typesLast30, section);
              return (
                <div key={section} className="rounded-xl border border-border bg-card p-4">
                  <h3 className="font-serif text-lg font-semibold text-foreground">
                    {SECTION_NAMES[section]}
                  </h3>
                  <p className="mt-1 text-2xl font-bold text-primary">
                    {estimate?.estimate !== null && estimate?.estimate !== undefined
                      ? estimate.estimate.toLocaleString("pt-BR")
                      : "—"}
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      estimativa de treino
                    </span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {estimate
                      ? `${confidenceLabelOf(estimate.confidence)} · tendência ${trendLabel(estimate.trend)}`
                      : "Dados insuficientes"}
                  </p>
                  {readiness ? (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {READINESS_LABELS[readiness.label]} para a meta de{" "}
                      {state.settings.targetScore}
                    </p>
                  ) : null}
                  <p className="text-xs text-muted-foreground">
                    Variedade: {variety.tried} de {variety.total} tipos nos últimos 30 dias.
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        <section aria-label="Últimos 14 dias">
          <h2 className="font-serif text-xl font-semibold text-foreground">Últimos 14 dias</h2>
          <div className="mt-3">
            <DailyBars values={last14} />
          </div>
          {hydrated ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Média diária: 7 dias{" "}
              {dailyAverages(state.daily, dayKey(now), 7, 60).avgAttempts.toFixed(1)} tentativa(s) ·
              14 dias {dailyAverages(state.daily, dayKey(now), 14, 60).avgAttempts.toFixed(1)}{" "}
              tentativa(s)/dia · {dueCount.toLocaleString("pt-BR")} vencidas hoje · sequência de{" "}
              {streak} dia(s).
            </p>
          ) : null}
        </section>

        <section aria-label="Padrões de erro">
          <h2 className="font-serif text-xl font-semibold text-foreground">
            Padrões de erro (14 dias)
          </h2>
          {breakdown && breakdown.total > 0 ? (
            <ul className="mt-3 flex flex-wrap gap-2">
              {Object.entries(breakdown.byTag).map(([tag, count]) => {
                const qid = tag === "missed" ? null : latestQidWithTag(state, tag);
                const content = (
                  <>
                    {tagLabel(tag)} · {count}
                  </>
                );
                return (
                  <li key={tag}>
                    {qid ? (
                      <Link
                        to="/practice"
                        search={{ q: qid }}
                        className="inline-flex min-h-9 items-center rounded-full border border-border bg-muted px-3 text-sm text-foreground hover:border-primary/50"
                      >
                        {content}
                      </Link>
                    ) : (
                      <span className="inline-flex min-h-9 items-center rounded-full border border-border bg-muted px-3 text-sm text-muted-foreground">
                        {content}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              Nenhum erro registrado nos últimos 14 dias.
            </p>
          )}
          {missed && missed.length > 0 ? (
            <div className="mt-3">
              <h3 className="text-sm font-semibold text-foreground">
                Palavras mais erradas (30 dias)
              </h3>
              <ul className="mt-2 flex flex-wrap gap-2">
                {missed.map((entry) => {
                  const qid = latestQidWithTag(state, `missed:${entry.word}`);
                  const content = (
                    <>
                      “{entry.word}” · {entry.count}
                    </>
                  );
                  return (
                    <li key={entry.word}>
                      {qid ? (
                        <Link
                          to="/practice"
                          search={{ q: qid }}
                          className="inline-flex min-h-9 items-center rounded-full border border-border bg-muted px-3 text-sm text-foreground hover:border-primary/50"
                        >
                          {content}
                        </Link>
                      ) : (
                        <span className="inline-flex min-h-9 items-center rounded-full border border-border bg-muted px-3 text-sm text-muted-foreground">
                          {content}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
        </section>

        <section aria-label="Tabela por tipo">
          <h2 className="font-serif text-xl font-semibold text-foreground">
            Média da última nota por tipo
          </h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Tipo</th>
                  <th className="py-2 pr-3 font-medium">Seção</th>
                  <th className="py-2 pr-3 font-medium">Tentadas</th>
                  <th className="py-2 font-medium">Média</th>
                </tr>
              </thead>
              <tbody>
                {typeRows.map((row) => (
                  <tr key={row.type} className="border-b border-border/50">
                    <td className="py-1.5 pr-3 text-foreground">{row.label}</td>
                    <td className="py-1.5 pr-3 text-muted-foreground">
                      {SECTION_NAMES[row.section]}
                    </td>
                    <td className="py-1.5 pr-3 text-muted-foreground">{row.attempted}</td>
                    <td className="py-1.5 text-muted-foreground">
                      {row.avg === null ? "—" : Math.round(row.avg).toLocaleString("pt-BR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section aria-label="Relatório da semana">
          <h2 className="font-serif text-xl font-semibold text-foreground">Relatório da semana</h2>
          <div className="mt-3 flex flex-wrap gap-3">
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              onClick={() => {
                copyToClipboard(markdown);
                setCopied(true);
              }}
            >
              {copied ? "Copiado!" : "Copiar Markdown"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              onClick={() =>
                downloadText(
                  `relatorio-semana-${new Date(now).toISOString().slice(0, 10)}.md`,
                  markdown,
                  "text/markdown",
                )
              }
            >
              Baixar .md
            </Button>
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              onClick={() =>
                report
                  ? downloadText(
                      `relatorio-semana-${report.period.from}.json`,
                      renderReportJson(report),
                      "application/json",
                    )
                  : undefined
              }
            >
              Baixar .json
            </Button>
          </div>
          <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap rounded-xl border border-border bg-muted p-4 text-xs leading-relaxed text-foreground">
            {markdown}
          </pre>
        </section>

        <section aria-label="Backup">
          <h2 className="font-serif text-xl font-semibold text-foreground">Backup</h2>
          {quota ? (
            <p className="mt-1 text-sm text-muted-foreground">
              Estado atual: ~{(quota.bytes / 1024).toFixed(1)} KB do limite do navegador (≈5 MB).{" "}
              {quota.warn
                ? "Atenção: aproximação do limite — exporte um backup e limpe tentativas antigas nos Ajustes."
                : ""}
            </p>
          ) : null}
          {backupStale ? (
            <p className="mt-2 rounded-lg border border-warning/50 bg-warning/10 px-3 py-2 text-sm text-warning-foreground">
              Último backup há mais de 14 dias —{" "}
              <Link to="/settings" className="font-medium underline">
                exporte agora nos Ajustes
              </Link>
              .
            </p>
          ) : null}
        </section>
      </main>
    </div>
  );
}
