import { Suspense, useEffect, useRef, useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { PracticeEngine } from "@/components/practice/PracticeEngine";
import { ExamPromptProvider } from "@/components/practice/ExamPrompt";
import { Button } from "@/components/ui/button";
import { questionQuery } from "@/lib/pte/catalog";
import { TYPE_META } from "@/lib/pte/manifest";
import { EXAM_PARTS } from "@/lib/pte/skillMatrix";
import {
  armExamItem,
  claimExamAudio,
  examPromptWaits,
  examTiming,
  submitExamItem,
} from "@/lib/pte/exam";
import { mutateAppState, useAppState } from "@/lib/useAppState";

export function ExamRunner({ id }: { id: string }) {
  return (
    <Suspense key={id} fallback={<p role="status">Carregando questão…</p>}>
      <ExamItem key={id} id={id} />
    </Suspense>
  );
}

function ExamItem({ id }: { id: string }) {
  const { data: question } = useSuspenseQuery(questionQuery(id));
  const state = useAppState();
  const draft = state.draft;
  const deadline = draft?.exam?.deadline;
  const autoSubmitRef = useRef<(() => void) | null>(null);
  const [now, setNow] = useState(Date.now());
  const fired = useRef(false);
  // Fidelidade F7: para enunciados em áudio, o prazo de resposta só arma
  // quando a reprodução termina. Se a reprodução já foi consumida (recarregar
  // no meio) ou não há voz disponível, o botão "iniciar o tempo" é a saída.
  const [promptEnded, setPromptEnded] = useState(false);
  const waits = question ? examPromptWaits(question.type) : false;
  useEffect(() => {
    if (!question) return;
    if (!waits || promptEnded) mutateAppState((s) => armExamItem(s, id, question.type, Date.now()));
  }, [id, question, waits, promptEnded]);
  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(interval);
  }, []);
  useEffect(() => {
    if (!deadline || now < deadline || fired.current || !autoSubmitRef.current) return;
    fired.current = true;
    autoSubmitRef.current();
  }, [deadline, now]);
  if (!question || !draft?.exam)
    return <p role="alert">Não foi possível abrir esta questão. Seu progresso continua salvo.</p>;
  const timing = examTiming(question.type);
  const waiting = waits && !deadline && !promptEnded;
  const remaining = deadline
    ? Math.min(timing.seconds, Math.max(0, Math.ceil((deadline - now) / 1000)))
    : timing.seconds;
  const prep = !waiting && timing.prep > 0 && remaining > timing.seconds - timing.prep;
  const part = EXAM_PARTS.find((p) => p.types.includes(question.type));
  return (
    <section aria-label="Questão do simulado" className="space-y-5">
      <header className="border-b border-border pb-4">
        <p className="text-sm text-muted-foreground">
          {part?.label} · duração aproximada da parte: {Math.round((part?.minSeconds ?? 0) / 60)}–
          {Math.round((part?.maxSeconds ?? 0) / 60)} min
        </p>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-serif text-2xl font-semibold">{TYPE_META[question.type].label}</h2>
          <span role="timer" aria-label="Tempo restante" className="font-mono text-xl text-primary">
            {waiting
              ? "—"
              : `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`}
          </span>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Questão {draft.cursor + 1} de {draft.ids.length} ·{" "}
          {waiting
            ? "Ouça o áudio antes de responder — o tempo de resposta começa quando o áudio termina"
            : prep
              ? "Preparação"
              : "Resposta"}
          {timing.approximate ? " · tempo aproximado" : ""}
        </p>
      </header>
      {/* Na espera do áudio o conteúdo fica ativo: o botão "Ouvir o áudio"
          está dentro do motor e precisa ser clicável (fidelidade F7). O envio
          segue bloqueado até o prazo armar. */}
      <div inert={prep} className={prep ? "opacity-60" : ""}>
        <ExamPromptProvider value={() => setPromptEnded(true)}>
          <PracticeEngine
            question={question}
            mode="exam"
            autoSubmitRef={autoSubmitRef}
            onSubmitted={(payload) => {
              mutateAppState((s) =>
                submitExamItem(
                  s,
                  {
                    qid: id,
                    type: question.type,
                    score: payload.result.score,
                    tags: payload.tags ?? [],
                  },
                  Date.now(),
                  crypto.randomUUID(),
                ),
              );
            }}
          />
        </ExamPromptProvider>
      </div>
      <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
        {waiting ? (
          <Button
            variant="outline"
            className="min-h-11"
            data-testid="exam-skip-audio"
            onClick={() =>
              mutateAppState((s) =>
                armExamItem(claimExamAudio(s, id), id, question.type, Date.now()),
              )
            }
          >
            Não consigo ouvir o áudio — iniciar o tempo
          </Button>
        ) : null}
        <Button
          disabled={prep || waiting}
          className="min-h-11"
          onClick={() => autoSubmitRef.current?.()}
        >
          Enviar e avançar
        </Button>
      </div>
    </section>
  );
}
