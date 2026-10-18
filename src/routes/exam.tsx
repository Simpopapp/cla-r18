import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { TopNav } from "@/components/common/TopNav";
import { ExamRunner } from "@/components/exam/ExamRunner";
import { Button } from "@/components/ui/button";
import { allMeta, TYPE_META } from "@/lib/pte/manifest";
import { EXAM_PARTS } from "@/lib/pte/skillMatrix";
import {
  buildExamQueue,
  examLabel,
  examSummary,
  finishExam,
  startExam,
  type ExamKind,
  type ExamScore,
} from "@/lib/pte/exam";
import { discardDraft, type AppState } from "@/lib/storage";
import { mutateAppState, useAppHydrated, useAppState } from "@/lib/useAppState";

export const Route = createFileRoute("/exam")({
  head: () => ({
    meta: [
      { title: "Simulado PTE Academic — PTE Master Hub" },
      {
        name: "description",
        content:
          "Ensaie o PTE Academic com simulado completo, por parte ou mini, cronômetro e resultados de treino salvos neste navegador.",
      },
      { property: "og:title", content: "Simulado PTE Academic — PTE Master Hub" },
      {
        property: "og:description",
        content:
          "Simulados cronometrados do PTE Academic com estimativas honestas e histórico local.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ExamPage,
});

const SKILL_LABELS = {
  speaking: "Fala",
  writing: "Escrita",
  reading: "Leitura",
  listening: "Escuta",
};

function ExamResults({
  scores,
  state,
  startedAt,
}: {
  scores: ExamScore[];
  state: AppState;
  startedAt: number;
}) {
  const [view, setView] = useState<"skills" | "types">("skills");
  const summary = examSummary(scores);
  const practice = examSummary(
    state.attempts
      .filter((a) => a.mode === "practice" && a.ts < startedAt)
      .map((a) => ({ ...a, tags: a.tags ?? [] })),
  );
  const previous = [...state.sessions]
    .reverse()
    .find((s) => s.kind === "exam" && s.startedAt < startedAt && s.exam);
  const old = previous?.exam ? examSummary(previous.exam.scores) : null;
  const weak = summary.types.filter((t) => t.average !== null && t.average < 75);
  const tags = [...new Set(scores.flatMap((s) => s.tags))].filter((t) => t !== "exame");
  return (
    <div className="space-y-6">
      <div
        role="tablist"
        aria-label="Resultados"
        className="flex gap-2 border-b border-border pb-3"
      >
        <Button
          role="tab"
          aria-selected={view === "skills"}
          variant={view === "skills" ? "secondary" : "ghost"}
          onClick={() => setView("skills")}
        >
          Habilidades
        </Button>
        <Button
          role="tab"
          aria-selected={view === "types"}
          variant={view === "types" ? "secondary" : "ghost"}
          onClick={() => setView("types")}
        >
          Por exercício
        </Button>
      </div>
      {view === "skills" ? (
        <>
          <section aria-label="Estimativas por habilidade">
            <h2 className="font-serif text-xl font-semibold">Estimativa de treino · 10–90</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Alvo {state.settings.targetScore} · não é nota oficial. Pronúncia: não avaliada.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {summary.skills.map((s, i) => (
                <article key={s.skill} className="rounded-lg border border-border p-4">
                  <h3 className="font-semibold">{SKILL_LABELS[s.skill]}</h3>
                  <p className="mt-2 text-3xl font-semibold text-primary">{s.estimate ?? "—"}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Confiança {s.confidence === "media" ? "média" : s.confidence} · {s.n} respostas
                    pontuadas
                  </p>
                  <p className="mt-2 text-sm">
                    Prática: {practice.skills[i]?.estimate ?? "—"} · anterior:{" "}
                    {old?.skills[i]?.estimate ?? "—"}
                  </p>
                  <p className="mt-1 text-sm">
                    {s.estimate === null
                      ? "Sem dados pontuados"
                      : s.estimate >= state.settings.targetScore
                        ? "Alvo alcançado nesta estimativa"
                        : `${state.settings.targetScore - s.estimate} pontos até o alvo`}
                  </p>
                </article>
              ))}
            </div>
            {summary.unscored ? (
              <p className="mt-3 text-sm text-muted-foreground">
                {summary.unscored} respostas sem nota; não entram nas médias.
              </p>
            ) : null}
          </section>
        </>
      ) : (
        <>
          <section aria-label="Resultados por tipo">
            <h2 className="font-serif text-xl font-semibold">Resultados dos exercícios · 0–100</h2>
            <ul className="mt-3 divide-y divide-border">
              {summary.types.map((t) => (
                <li key={t.type} className="flex justify-between gap-3 py-3 text-sm">
                  <span>{TYPE_META[t.type].label}</span>
                  <span className="shrink-0">
                    {t.average === null ? "Sem nota" : Math.round(t.average)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
      <section aria-label="Pontos fracos">
        <h2 className="font-serif text-xl font-semibold">Pontos fracos</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {weak.length
            ? weak.map((t) => TYPE_META[t.type].label).join(" · ")
            : "Nenhum tipo abaixo de 75 entre as respostas pontuadas."}
        </p>
        {tags.length ? (
          <p className="mt-2 text-sm text-muted-foreground">{tags.slice(0, 10).join(" · ")}</p>
        ) : null}
        <Link
          to="/session"
          search={{ kind: "errors" }}
          className="mt-3 inline-flex min-h-11 items-center text-primary underline"
        >
          Montar sessão de reforço
        </Link>
      </section>
    </div>
  );
}

function ExamPage() {
  const state = useAppState();
  const hydrated = useAppHydrated();
  const [kind, setKind] = useState<ExamKind>("mini");
  const [seed] = useState("exam-preview");
  const [confirmExit, setConfirmExit] = useState(false);
  const [selectedHistory, setSelectedHistory] = useState<string | null>(null);
  const plan = useMemo(
    () => buildExamQueue(allMeta, kind, state.settings.onlyVerified, seed),
    [kind, state.settings.onlyVerified, seed],
  );
  const draft = state.draft;
  const active = draft?.kind === "exam" && draft.exam ? draft : null;
  const id = active?.ids[active.cursor];
  const history = [...state.sessions].filter((s) => s.kind === "exam").reverse();
  const selected = history.find((s) => s.id === selectedHistory);
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      {!id ? <TopNav /> : null}
      <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 py-8">
        <h1 className="font-serif text-3xl font-bold">
          {active?.exam ? examLabel(active.exam.kind) : "Simulado PTE Academic"}
        </h1>
        {!hydrated ? (
          <p role="status">Carregando seu progresso…</p>
        ) : id ? (
          <>
            <ExamRunner id={id} />
            <Button variant="ghost" onClick={() => setConfirmExit(true)}>
              Encerrar simulado
            </Button>
            {confirmExit ? (
              <div
                role="alertdialog"
                aria-label="Encerrar simulado"
                className="space-y-3 border-t border-border pt-4"
              >
                <p>Descartar o restante? As respostas enviadas continuam no seu progresso.</p>
                <Button
                  variant="destructive"
                  onClick={() => {
                    mutateAppState((s) => discardDraft(s));
                    setConfirmExit(false);
                  }}
                >
                  Descartar restante
                </Button>
                <Button variant="outline" className="ml-2" onClick={() => setConfirmExit(false)}>
                  Continuar
                </Button>
              </div>
            ) : null}
          </>
        ) : active?.exam ? (
          <>
            <p role="status" className="text-primary">
              Simulado concluído · {active.results} respostas
            </p>
            <ExamResults scores={active.exam.scores} state={state} startedAt={active.startedAt} />
            <Button
              className="min-h-11"
              onClick={() => mutateAppState((s) => finishExam(s, Date.now()))}
            >
              Arquivar simulado
            </Button>
          </>
        ) : (
          <>
            <section aria-label="Novo simulado" className="space-y-4">
              <label htmlFor="exam-kind" className="block text-sm font-medium">
                Formato
              </label>
              <select
                id="exam-kind"
                value={kind}
                onChange={(e) => setKind(e.target.value as ExamKind)}
                className="min-h-11 w-full rounded-md border border-input bg-background px-3 text-foreground"
              >
                <option value="full">Simulado completo</option>
                {EXAM_PARTS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
                <option value="mini">Mini-simulado</option>
              </select>
              <p>
                {plan.ids.length} questões · aproximadamente {Math.ceil(plan.seconds / 60)} min, sem
                contar a reprodução dos áudios
              </p>
              <p className="text-sm text-muted-foreground">
                Sem voltar ou refazer · áudio 1× · envio ao esgotar o tempo. Os tempos por questão
                de leitura e escuta são aproximados; a prova usa tempo por parte. Áudio sintetizado,
                não gravação oficial.
              </p>
              <p className="text-sm text-muted-foreground">
                {state.settings.onlyVerified
                  ? "Somente fontes verificadas"
                  : "Fontes verificadas e comunitárias"}
              </p>
              {plan.omissions.length ? (
                <div role="status" className="border-l-2 border-warning-foreground pl-3">
                  <p className="font-medium">
                    {kind === "full"
                      ? "Simulado incompleto — banco insuficiente"
                      : "Questões omitidas por falta de banco"}
                  </p>
                  <ul className="mt-2 text-sm text-muted-foreground">
                    {plan.omissions.map((o) => (
                      <li key={o.type}>
                        {TYPE_META[o.type].label}: {o.missing} faltando
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {draft ? (
                <p role="status">
                  Existe uma sessão em andamento.{" "}
                  <Link to="/session" className="text-primary underline">
                    Retomar ou descartar sessão
                  </Link>
                </p>
              ) : null}
              <Button
                disabled={!plan.ids.length || !!draft}
                className="min-h-11"
                onClick={() => {
                  const queue = buildExamQueue(
                    allMeta,
                    kind,
                    state.settings.onlyVerified,
                    crypto.randomUUID(),
                  );
                  mutateAppState((s) => startExam(s, queue.ids, kind, Date.now()));
                }}
              >
                Iniciar simulado
              </Button>
            </section>
            <section aria-label="Histórico de simulados" className="border-t border-border pt-6">
              <h2 className="font-serif text-xl font-semibold">Simulados anteriores</h2>
              {history.length ? (
                <ul className="mt-3 divide-y divide-border">
                  {history.map((s) => (
                    <li key={s.id} className="py-2">
                      <Button
                        variant="ghost"
                        className="h-auto min-h-11 w-full justify-between whitespace-normal text-left"
                        onClick={() => setSelectedHistory(s.id)}
                      >
                        <span>{s.exam ? examLabel(s.exam.kind) : "Simulado"}</span>
                        <span>
                          {new Date(s.endedAt).toLocaleDateString("pt-BR")} · {s.n} respostas
                        </span>
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">
                  Nenhum simulado arquivado ainda.
                </p>
              )}
            </section>
            {selected?.exam ? (
              <ExamResults
                scores={selected.exam.scores}
                state={state}
                startedAt={selected.startedAt}
              />
            ) : null}
          </>
        )}
      </main>
    </div>
  );
}
