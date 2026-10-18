import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { TopNav } from "@/components/common/TopNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { countdownLabel } from "@/lib/pte/goal";
import { dayKey } from "@/lib/pte/dates";
import {
  sectionCounts,
  TOTAL_ALL_QUESTIONS,
  TYPE_COUNT,
  notReadyTypes,
  allMeta,
} from "@/lib/pte/manifest";
import { countDue, countDueBySection } from "@/lib/pte/queue";
import { buildDailyPlan, planSummary, PLAN_MIN_GOAL } from "@/lib/pte/studyPlan";
import { skillEstimates } from "@/lib/pte/estimate";
import { SECTIONS } from "@/lib/pte/types";
import { useAppHydrated, useAppState } from "@/lib/useAppState";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PTE Master Hub — preparo para o PTE Academic" },
      {
        name: "description",
        content:
          "Treino local e offline para o PTE Academic: os tipos oficiais do exame, repetição espaçada e diagnóstico de erros. Seus dados ficam neste navegador.",
      },
      { property: "og:title", content: "PTE Master Hub — preparo para o PTE Academic" },
      {
        property: "og:description",
        content: `Treino local para o PTE Academic com ${TOTAL_ALL_QUESTIONS.toLocaleString("pt-BR")} questões nos ${TYPE_COUNT} tipos oficiais. Sem conta, sem nuvem.`,
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomePage,
});

const SECTION_CARDS = [
  { to: "/speaking", section: "speaking" as const },
  { to: "/writing", section: "writing" as const },
  { to: "/reading", section: "reading" as const },
  { to: "/listening", section: "listening" as const },
];

const SECTION_DESCRIPTIONS: Record<(typeof SECTION_CARDS)[number]["section"], string> = {
  speaking: "Read Aloud, Repeat Sentence, Describe Image e os novos tipos de discussão e situação.",
  writing: "Summarize Written Text e Write Essay, com zonas de palavras e cronômetro.",
  reading: "Lacunas, múltipla escolha e reordenar parágrafos, com evidência textual.",
  listening: "Resumo, lacunas, palavras incorretas e ditado, com áudio tocado uma vez.",
};

const SECTION_NAMES: Record<(typeof SECTION_CARDS)[number]["section"], string> = {
  speaking: "Falar",
  writing: "Escrever",
  reading: "Ler",
  listening: "Ouvir",
};

function DailyRing({ done, goal }: { done: number; goal: number }) {
  const size = 72;
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const ratio = goal === 0 ? 0 : Math.min(1, done / goal);
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={`${done} de ${goal} questões de hoje`}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        strokeWidth={stroke}
        className="stroke-muted"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - ratio)}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        className="stroke-primary"
      />
      <text x="50%" y="54%" textAnchor="middle" className="fill-foreground text-sm font-semibold">
        {done}/{goal}
      </text>
    </svg>
  );
}

function HomePage() {
  const state = useAppState();
  const hydrated = useAppHydrated();
  const now = Date.now();

  const dueBySection = useMemo(
    () => (hydrated ? countDueBySection(allMeta, state, now) : null),
    [hydrated, state, now],
  );
  const dueTotal = useMemo(
    () => (hydrated ? countDue(allMeta, state, now) : 0),
    [hydrated, state, now],
  );
  const plan = useMemo(
    () => (hydrated ? buildDailyPlan(state, now, allMeta) : null),
    [hydrated, state, now],
  );
  const estimates = useMemo(
    () => (hydrated ? skillEstimates(state, now, allMeta) : null),
    [hydrated, state, now],
  );
  const countdown = useMemo(
    () =>
      hydrated ? countdownLabel(state.settings.examDate, state.settings.targetScore, now) : null,
    [hydrated, state.settings.examDate, state.settings.targetScore, now],
  );
  const todayDone = state.daily[dayKey(now)]?.n ?? 0;

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <TopNav />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
        <section className="max-w-2xl">
          <h1 className="font-serif text-4xl font-bold tracking-tight sm:text-5xl">
            Prepare-se para o <span className="text-primary">PTE Academic</span> com honestidade
          </h1>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Treino local para os {TYPE_COUNT} tipos oficiais do exame, com{" "}
            {TOTAL_ALL_QUESTIONS.toLocaleString("pt-BR")} questões rastreáveis: repetição espaçada
            para saber o que revisar, plano do dia para saber quando e diagnóstico para entender por
            que errou. Estimativas de treino — nunca promessa de nota oficial. Tudo roda neste
            navegador: sem conta, sem nuvem.
          </p>
          {countdown ? (
            <p className="mt-4 inline-flex rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-sm font-medium text-foreground">
              {countdown}
            </p>
          ) : null}
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild>
              <Link to="/session">
                Sessão de estudo <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/progress">Ver progresso</Link>
            </Button>
          </div>
          {notReadyTypes.length > 0 ? (
            <p className="mt-4 rounded-lg border border-warning/50 bg-warning/10 px-3 py-2 text-sm text-warning-foreground">
              Tipos ainda sem banco suficiente aparecem com o selo “em breve” nas seções — nunca com
              conteúdo duvidoso.
            </p>
          ) : null}
        </section>

        <section aria-labelledby="today-heading" className="mt-12">
          <h2 id="today-heading" className="text-lg font-semibold">
            Hoje
          </h2>
          <div className="mt-4 flex flex-wrap items-center gap-6 rounded-xl border border-border bg-card p-4 sm:p-6">
            <DailyRing done={todayDone} goal={state.settings.dailyGoal} />
            <div className="min-w-56 flex-1">
              <p className="text-sm text-muted-foreground">
                {dueTotal > 0
                  ? `${dueTotal.toLocaleString("pt-BR")} questão(ões) vencida(s) para revisar hoje.`
                  : "Nada vencido hoje — pratique algo novo para manter o ritmo."}
              </p>
              {plan && plan.status === "ok" ? (
                <p className="mt-1 text-sm text-muted-foreground">{planSummary(plan)}</p>
              ) : plan ? (
                <p className="mt-1 text-sm text-muted-foreground">{plan.message}</p>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-3">
                <Button asChild size="sm" className="min-h-11">
                  <Link to="/session" search={{ kind: dueTotal > 0 ? "due" : undefined }}>
                    {dueTotal > 0
                      ? `Fila do dia (${dueTotal.toLocaleString("pt-BR")})`
                      : "Sessão de estudo"}
                  </Link>
                </Button>
                {plan && plan.status === "ok" ? (
                  <Button asChild size="sm" variant="outline" className="min-h-11">
                    <Link to="/session" search={{ kind: "plan" }}>
                      Plano de hoje ({plan.total})
                    </Link>
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            O plano do dia entra no ar com pelo menos {PLAN_MIN_GOAL} questões; até então, use a
            fila do dia ou uma sessão livre.
          </p>
        </section>

        <section aria-labelledby="sections-heading" className="mt-12">
          <h2 id="sections-heading" className="text-lg font-semibold">
            Seções do exame
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {SECTION_CARDS.map((card) => {
              const estimateValue = estimates?.[card.section]?.estimate ?? null;
              return (
                <Card key={card.to} className="transition-colors hover:border-primary/40">
                  <CardHeader>
                    <CardTitle className="font-serif text-xl">
                      {SECTION_NAMES[card.section]}
                    </CardTitle>
                    <CardDescription>{SECTION_DESCRIPTIONS[card.section]}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {sectionCounts[card.section].toLocaleString("pt-BR")} questões
                      {dueBySection && dueBySection[card.section] > 0
                        ? ` · ${dueBySection[card.section].toLocaleString("pt-BR")} vencidas hoje`
                        : ""}
                    </p>
                    {estimates ? (
                      <p className="mt-1 text-sm text-muted-foreground">
                        Estimativa de treino:{" "}
                        {estimateValue === null ? "—" : estimateValue.toLocaleString("pt-BR")}
                      </p>
                    ) : null}
                    <Link
                      to={card.to}
                      className="mt-2 inline-flex min-h-11 items-center gap-1 text-sm font-medium text-primary hover:underline"
                    >
                      Abrir seção <ArrowRight aria-hidden="true" className="size-4" />
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            O banco de questões já está no ar; os motores interativos de resposta e correção entram
            nas próximas fases do plano.
          </p>
        </section>
      </main>
      <footer className="border-t border-border py-6 text-center text-sm text-muted-foreground">
        <p>100% local — seus dados ficam neste navegador, com backup exportável.</p>
      </footer>
    </div>
  );
}
