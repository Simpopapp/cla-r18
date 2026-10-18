import { useCallback, useEffect, useRef, useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";

import { TopNav } from "@/components/common/TopNav";
import { BankSeal } from "@/components/common/seals";
import { PracticeContent } from "@/components/practice/PracticeContent";
import {
  PracticeEngine,
  engineFor,
  fireAutoSubmit,
  type PracticeResultPayload,
} from "@/components/practice/PracticeEngine";
import { PracticeShell } from "@/components/practice/PracticeShell";
import type { ScoreResultView } from "@/components/practice/ScorePanel";
import { neighborsOf, pickNext, questionQuery, typeQuery } from "@/lib/pte/catalog";
import { countOf, notReadyReason, typeOfQuestion, TYPE_META } from "@/lib/pte/manifest";
import { SECTIONS, TASK_TYPES, type Question, type TaskType } from "@/lib/pte/types";
import { useAppHydrated, useAppState } from "@/lib/useAppState";

interface PracticeSearch {
  q?: string | undefined;
  type?: TaskType | undefined;
}

function validateSearch(search: Record<string, unknown>): PracticeSearch {
  const rawQ = search["q"];
  const q = typeof rawQ === "string" && typeOfQuestion(rawQ) ? rawQ : undefined;
  const rawType = search["type"];
  const type = TASK_TYPES.find((t) => t === rawType);
  return { q, type };
}

export const Route = createFileRoute("/practice")({
  validateSearch,
  loaderDeps: ({ search }) => ({ q: search.q, type: search.type }),
  loader: async ({ context, deps }) => {
    if (deps.q) {
      const type = typeOfQuestion(deps.q);
      await Promise.all([
        context.queryClient.ensureQueryData(questionQuery(deps.q)),
        type ? context.queryClient.ensureQueryData(typeQuery(type)) : Promise.resolve(null),
      ]);
      return;
    }
    if (deps.type) {
      await context.queryClient.ensureQueryData(typeQuery(deps.type));
    }
  },
  head: () => ({
    meta: [
      { title: "Prática — PTE Master Hub" },
      {
        name: "description",
        content:
          "Pratique uma questão por vez, de qualquer tipo do PTE Academic, com notas e favoritos locais.",
      },
      { property: "og:title", content: "Prática — PTE Master Hub" },
      {
        property: "og:description",
        content:
          "Pratique questões do PTE Academic com notas, atalhos e favoritos — 100% neste navegador.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PracticePage,
});

function PracticePage() {
  const { q, type } = Route.useSearch();
  const state = useAppState();
  if (state.draft?.kind === "exam")
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="font-serif text-2xl">Simulado em andamento</h1>
        <Link to="/exam" className="mt-4 inline-flex min-h-11 items-center text-primary underline">
          Retomar simulado
        </Link>
      </div>
    );
  if (q) return <PracticeById id={q} />;
  if (type) return <PracticeNext type={type} />;
  return <TypeChooser />;
}

/** Sem parâmetros: escolha entre os tipos. A fila do dia chega com a camada de sessões. */
function TypeChooser() {
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <TopNav />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <h1 className="font-serif text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Praticar
        </h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Escolha um tipo para começar. A fila do dia (vencidas primeiro) chega com a camada de
          sessões.
        </p>
        {SECTIONS.map((section) => (
          <section key={section} aria-label={section} className="mt-6">
            <h2 className="text-lg font-semibold capitalize text-foreground">{section}</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {TASK_TYPES.filter((t) => TYPE_META[t].section === section).map((t) => {
                const reason = notReadyReason(t);
                if (reason) {
                  return (
                    <article
                      key={t}
                      className="rounded-xl border border-border bg-muted p-4 opacity-80"
                    >
                      <h3 className="font-serif text-lg font-semibold text-foreground">
                        {TYPE_META[t].label}
                      </h3>
                      <div className="mt-1">
                        <BankSeal type={t} />
                      </div>
                    </article>
                  );
                }
                return (
                  <Link
                    key={t}
                    to="/practice"
                    search={{ type: t }}
                    className="rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40"
                  >
                    <h3 className="font-serif text-lg font-semibold text-foreground">
                      {TYPE_META[t].label}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {countOf(t).toLocaleString("pt-BR")} questões
                    </p>
                    <div className="mt-1">
                      <BankSeal type={t} />
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}

function PracticeById({ id }: { id: string }) {
  const { data: question } = useSuspenseQuery(questionQuery(id));
  const typeId = typeOfQuestion(id);
  const { data: questions } = useSuspenseQuery(typeQuery(typeId ?? "read_aloud"));
  if (!question) {
    return (
      <div className="flex min-h-dvh flex-col bg-background text-foreground">
        <TopNav />
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12">
          <h1 className="font-serif text-2xl font-bold text-foreground">Questão não encontrada</h1>
          <p className="mt-2 text-muted-foreground">
            O id não existe mais no banco (pode ter sido unificado por dedupe). O progresso antigo
            permanece salvo e continua válido.
          </p>
          <Link
            to="/"
            className="mt-4 inline-flex min-h-11 items-center text-primary hover:underline"
          >
            Voltar ao início
          </Link>
        </main>
      </div>
    );
  }
  return <PracticeView question={question} questions={questions} />;
}

function PracticeNext({ type }: { type: TaskType }) {
  const { data: questions } = useSuspenseQuery(typeQuery(type));
  const state = useAppState();
  const hydrated = useAppHydrated();
  // undefined = ainda escolhendo; null = o tipo não tem questões.
  // A escolha é congelada após a hidratação: regravar a tentativa muda
  // state.questions e um novo pickNext trocaria a questão com o resultado
  // aberto (bug da Fase 4 — painel de resultado nunca aparecia).
  const [current, setCurrent] = useState<Question | null | undefined>(undefined);
  useEffect(() => {
    if (!hydrated || current !== undefined) return;
    setCurrent(pickNext(questions, state.questions, Date.now()));
  }, [current, hydrated, questions, state.questions]);
  if (current === undefined) {
    return (
      <div className="flex min-h-dvh flex-col bg-background text-foreground">
        <TopNav />
        <main aria-busy="true" className="mx-auto w-full max-w-3xl flex-1 px-4 py-12">
          <p className="text-sm text-muted-foreground">Escolhendo a próxima questão…</p>
        </main>
      </div>
    );
  }
  if (!current) {
    return (
      <div className="flex min-h-dvh flex-col bg-background text-foreground">
        <TopNav />
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12">
          <h1 className="font-serif text-2xl font-bold text-foreground">Sem questões</h1>
          <p className="mt-2 text-muted-foreground">Este tipo ainda não tem questões no banco.</p>
          <Link
            to="/"
            className="mt-4 inline-flex min-h-11 items-center text-primary hover:underline"
          >
            Voltar ao início
          </Link>
        </main>
      </div>
    );
  }
  return <PracticeView question={current} questions={questions} />;
}

function PracticeView({ question, questions }: { question: Question; questions: Question[] }) {
  const navigate = useNavigate();
  const state = useAppState();
  const draft = state.draft;
  const sessionIndex = draft ? draft.ids.indexOf(question.id) : -1;
  const inSession = sessionIndex >= 0 && draft !== null;
  const typed = neighborsOf(questions, question.id);
  // Na sessão, a fila é o rascunho (ids entre tipos); fora, a fila do tipo.
  const queue =
    inSession && draft
      ? {
          prev: draft.ids[sessionIndex - 1] ?? null,
          next: draft.ids[sessionIndex + 1] ?? null,
          index: sessionIndex,
          total: draft.ids.length,
        }
      : {
          prev: typed.prev?.id ?? null,
          next: typed.next?.id ?? null,
          index: typed.index,
          total: typed.total,
        };
  const sessionDone = !!draft && draft.cursor >= draft.ids.length;
  const [result, setResult] = useState<ScoreResultView | null>(null);
  const autoSubmitRef = useRef<(() => void) | null>(null);
  const Engine = engineFor(question.type);

  // Nova questão zera o resultado. O auto-submit pendente NÃO é zerado aqui:
  // efeitos de filhos rodam antes dos do pai, e zerar após o motor se
  // registrar deixaria o ref nulo para sempre (o envio pelo tempo esgotado
  // nunca disparava). O registro/cleanup do próprio motor cuida do ref.
  useEffect(() => {
    setResult(null);
  }, [question.id]);

  const handleSubmitted = useCallback(
    (payload: PracticeResultPayload) => setResult(payload.result),
    [],
  );

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <TopNav />
      <PracticeShell
        question={question}
        queue={queue}
        onNavigate={(id) => navigate({ to: "/practice", search: { q: id } })}
        result={result}
        onTimeUp={Engine ? () => fireAutoSubmit(() => autoSubmitRef.current) : undefined}
      >
        {inSession ? (
          <p className="mb-4 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-foreground">
            Sessão em andamento — questão {Math.min(sessionIndex + 1, queue.total)} de {queue.total}
            .{" "}
            <Link to="/session" className="font-medium text-primary hover:underline">
              Ver sessão
            </Link>
          </p>
        ) : null}
        {sessionDone ? (
          <p className="mb-4 rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground">
            Sessão concluída —{" "}
            <Link to="/session" className="font-medium text-primary hover:underline">
              ver o resumo
            </Link>
          </p>
        ) : null}
        {Engine ? (
          <PracticeEngine
            question={question}
            onSubmitted={handleSubmitted}
            autoSubmitRef={autoSubmitRef}
          />
        ) : (
          <PracticeContent question={question} />
        )}
      </PracticeShell>
    </div>
  );
}
