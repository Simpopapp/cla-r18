import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";

import { TopNav } from "@/components/common/TopNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { allMeta, TYPE_META } from "@/lib/pte/manifest";
import { buildQueue, countDue, type QueueEntry } from "@/lib/pte/queue";
import { buildDailyPlan, planSummary, PLAN_MIN_GOAL, SECTION_LABELS } from "@/lib/pte/studyPlan";
import { TASK_TYPES, type TaskType } from "@/lib/pte/types";
import {
  discardDraft,
  endSession,
  isSessionComplete,
  sessionAveragesByType,
  startSession,
  type SessionKind,
} from "@/lib/storage";
import { mutateAppState, useAppHydrated, useAppState } from "@/lib/useAppState";

interface SessionSearch {
  kind?: SessionKind | undefined;
}

const KINDS: readonly SessionKind[] = ["mixed", "due", "plan", "errors", "exam"];

function validateSearch(search: Record<string, unknown>): SessionSearch {
  const raw = search["kind"];
  return { kind: KINDS.find((k) => k === raw) };
}

export const Route = createFileRoute("/session")({
  validateSearch,
  head: () => ({
    meta: [
      { title: "Sessão de estudo — PTE Master Hub" },
      {
        name: "description",
        content:
          "Monte uma sessão do PTE Academic com a fila do dia, o plano de hoje ou revisão de erros — retomável e 100% local.",
      },
      { property: "og:title", content: "Sessão de estudo — PTE Master Hub" },
      {
        property: "og:description",
        content:
          "Fila do dia, plano de hoje e revisão de erros em sessões retomáveis — tudo neste navegador.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SessionPage,
});

const KIND_LABELS: Record<SessionKind, string> = {
  mixed: "Inteligente",
  due: "Fila do dia",
  plan: "Plano de hoje",
  errors: "Revisão de erros",
  exam: "Simulado",
};

const MODE_OPTIONS: readonly { value: "smart" | "due" | "errors"; label: string }[] = [
  { value: "smart", label: "Inteligente — 2 revisão : 1 nova, intercalando tipos" },
  { value: "due", label: "Fila do dia — só vencidas" },
  { value: "errors", label: "Erros — últimas notas abaixo da aprovação" },
];

function SessionPage() {
  const searchKind = Route.useSearch().kind;
  const navigate = useNavigate();
  const state = useAppState();
  const hydrated = useAppHydrated();
  const now = Date.now();

  const [mode, setMode] = useState<"smart" | "due" | "errors">(
    searchKind === "errors" ? "errors" : searchKind === "due" ? "due" : "smart",
  );
  const [size, setSize] = useState(20);
  const [typeFilter, setTypeFilter] = useState<"all" | TaskType>("all");

  const dueCount = useMemo(
    () => (hydrated ? countDue(allMeta, state, now) : 0),
    [hydrated, state, now],
  );
  const plan = useMemo(
    () => (hydrated ? buildDailyPlan(state, now, allMeta) : null),
    [hydrated, state, now],
  );

  const draft = state.draft;
  const draftComplete = isSessionComplete(state);

  const start = (kind: SessionKind, entries: QueueEntry[]) => {
    if (entries.length === 0) return;
    const ids = entries.map((e) => e.id);
    mutateAppState((s) => startSession(s, kind, ids, Date.now()));
    void navigate({ to: "/practice", search: { q: ids[0] } });
  };

  const startCustom = () => {
    const types = typeFilter === "all" ? undefined : [typeFilter];
    const entries = buildQueue({
      items: allMeta,
      state,
      now,
      mode,
      types,
      size,
    });
    start(mode === "due" ? "due" : mode === "errors" ? "errors" : "mixed", entries);
  };

  const startPlan = () => {
    if (!plan || plan.status !== "ok") return;
    const entries = buildQueue({
      items: allMeta,
      state,
      now,
      mode: "counts",
      counts: plan.counts,
      size: plan.total,
    });
    start("plan", entries);
  };

  const startDue = () => {
    if (dueCount === 0) return;
    const entries = buildQueue({ items: allMeta, state, now, mode: "due", size: dueCount });
    start("due", entries);
  };

  const summary = useMemo(() => {
    if (!draft) return null;
    return sessionAveragesByType(state, draft.startedAt);
  }, [draft, state]);

  const history = [...state.sessions].slice(-10).reverse();

  if (draft?.kind === "exam")
    return (
      <div className="flex min-h-dvh flex-col bg-background text-foreground">
        <TopNav />
        <main className="mx-auto w-full max-w-3xl px-4 py-8">
          <h1 className="font-serif text-2xl">Simulado em andamento</h1>
          <Link
            to="/exam"
            className="mt-4 inline-flex min-h-11 items-center text-primary underline"
          >
            Retomar simulado ou ver resultado
          </Link>
        </main>
      </div>
    );

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <TopNav />
      <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 py-8">
        <h1 className="font-serif text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Sessão de estudo
        </h1>

        {draft && !draftComplete ? (
          <div className="rounded-xl border border-primary/40 bg-primary/10 p-4">
            <h2 className="font-serif text-lg font-semibold text-foreground">
              Sessão em andamento — {KIND_LABELS[draft.kind]}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {draft.cursor} de {draft.ids.length} respondidas. Dá para retomar de onde parou.
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              <Button
                type="button"
                onClick={() => {
                  const nextId = draft.ids[draft.cursor];
                  if (draft.kind === "exam") void navigate({ to: "/exam" });
                  else if (nextId) void navigate({ to: "/practice", search: { q: nextId } });
                }}
                className="min-h-11"
              >
                Retomar
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => mutateAppState((s) => discardDraft(s))}
                className="min-h-11"
              >
                Descartar
              </Button>
            </div>
          </div>
        ) : null}

        {draft && draftComplete ? (
          <div className="rounded-xl border border-border bg-card p-4">
            <h2 className="font-serif text-lg font-semibold text-foreground">
              Sessão concluída — {KIND_LABELS[draft.kind]}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {draft.results} questão(ões) · média{" "}
              {draft.results === 0
                ? "—"
                : Math.round(draft.sumScore / draft.results).toLocaleString("pt-BR")}
            </p>
            {summary && Object.keys(summary).length > 0 ? (
              <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                {(Object.entries(summary) as [TaskType, [number, number]][]).map(
                  ([type, [n, sum]]) => (
                    <li key={type}>
                      {TYPE_META[type]?.label ?? type}: {n} resposta(s) · média{" "}
                      {Math.round(sum / n).toLocaleString("pt-BR")}
                    </li>
                  ),
                )}
              </ul>
            ) : null}
            <Button
              type="button"
              className="mt-3 min-h-11"
              onClick={() => mutateAppState((s) => endSession(s, Date.now(), `sess-${Date.now()}`))}
            >
              Arquivar e ver histórico
            </Button>
          </div>
        ) : null}

        <section aria-label="Atalhos do dia" className="grid gap-3 sm:grid-cols-2">
          <Button
            type="button"
            variant="outline"
            onClick={startDue}
            disabled={dueCount === 0}
            className="min-h-11 justify-start"
          >
            Fila do dia ({dueCount.toLocaleString("pt-BR")})
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={startPlan}
            disabled={!plan || plan.status !== "ok"}
            className="min-h-11 justify-start"
          >
            {plan && plan.status === "ok"
              ? `Plano de hoje (${plan.total})`
              : (plan?.message ?? "Plano de hoje (indisponível)")}
          </Button>
        </section>
        {plan && plan.status === "ok" ? (
          <p className="text-sm text-muted-foreground">{planSummary(plan)}</p>
        ) : null}

        <section
          aria-label="Sessão personalizada"
          className="rounded-xl border border-border bg-card p-4 sm:p-6"
        >
          <h2 className="font-serif text-xl font-semibold text-foreground">Sessão personalizada</h2>
          <div className="mt-4 space-y-5">
            <div>
              <Label htmlFor="session-mode">Modo</Label>
              <select
                id="session-mode"
                value={mode}
                onChange={(event) => setMode(event.target.value as typeof mode)}
                className="mt-1 min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
              >
                {MODE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="session-size">Tamanho da sessão</Label>
              <Input
                id="session-size"
                type="number"
                min={1}
                max={100}
                value={size}
                onChange={(event) => setSize(Number(event.target.value))}
                className="mt-1 max-w-32"
              />
            </div>
            <div>
              <Label htmlFor="session-type">Tipos</Label>
              <select
                id="session-type"
                value={typeFilter}
                onChange={(event) =>
                  setTypeFilter(
                    event.target.value === "all" ? "all" : (event.target.value as TaskType),
                  )
                }
                className="mt-1 min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
              >
                <option value="all">Todos os tipos</option>
                {TASK_TYPES.filter((t) => TYPE_META[t].ready).map((t) => (
                  <option key={t} value={t}>
                    {SECTION_LABELS[TYPE_META[t].section]} · {TYPE_META[t].label}
                  </option>
                ))}
              </select>
            </div>
            <Button type="button" onClick={startCustom} className="min-h-11">
              Iniciar sessão
            </Button>
          </div>
        </section>

        <section aria-label="Histórico de sessões">
          <h2 className="font-serif text-xl font-semibold text-foreground">Últimas sessões</h2>
          {history.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Nenhuma sessão concluída ainda — arquivamos aqui as 10 últimas.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {history.map((session) => (
                <li
                  key={session.id}
                  className="flex flex-wrap items-baseline justify-between gap-2 rounded-lg border border-border bg-muted px-3 py-2 text-sm"
                >
                  <span className="font-medium text-foreground">{KIND_LABELS[session.kind]}</span>
                  <span className="text-muted-foreground">
                    {new Date(session.endedAt).toLocaleString("pt-BR")} · {session.n} questão(ões) ·
                    média{" "}
                    {session.n === 0
                      ? "—"
                      : Math.round(session.sum / session.n).toLocaleString("pt-BR")}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            A sessão é salva a cada resposta: se o navegador fechar, o botão “Retomar” continua de
            onde parou. Mínimo do plano: {PLAN_MIN_GOAL} questões.
          </p>
        </section>
      </main>
    </div>
  );
}
