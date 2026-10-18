// Pack studie-plus — card de tradução por frase (PRD §13.1/§13.2).
// A linha em inglês expande SOMENTE por toque; 🔊 fica na linha da frase em
// inglês, fora da expansão, e fala o inglês original. Sem tradução carregada
// (ou origem mudada — h não bate) → estado vazio honesto, nunca tradução errada.

import { createContext, useContext, useEffect, useState } from "react";

import { PlusSpeakButton } from "./PlusSpeakButton";
import { PlusWordText } from "./PlusWordText";
import { loadPhrases } from "@/lib/plus/data";
import { plusFieldPolicy, type PlusPhase } from "@/lib/plus/plusAudio";
import { lookupPhrase } from "@/lib/plus/phrases";
import { useAppState } from "@/lib/useAppState";
import type { TaskType } from "@/lib/pte/types";

const PlusQuestionContext = createContext<string | null>(null);

/** Motores envolvem a questão com o provider; o card lê o qid daqui. */
export function PlusQuestionProvider({
  qid,
  children,
}: {
  qid: string;
  children: React.ReactNode;
}) {
  return <PlusQuestionContext.Provider value={qid}>{children}</PlusQuestionContext.Provider>;
}

export function PlusPhraseCard({
  sentence,
  index,
  type,
  field,
  phase,
  wordBubbles = true,
  disabled = false,
  qid: qidProp,
}: {
  sentence: string;
  index: number;
  type: TaskType;
  field: string;
  phase: PlusPhase;
  /** bolhas de palavra dentro da linha (toque na palavra tem prioridade) */
  wordBubbles?: boolean | undefined;
  /** no simulado o pack não aparece (não faz parte da replicação do PTE) */
  disabled?: boolean | undefined;
  /** qid direto (motores que não usam PlusQuestionProvider) */
  qid?: string | undefined;
}) {
  const { settings } = useAppState();
  const qidFromContext = useContext(PlusQuestionContext);
  const qid = qidProp ?? qidFromContext ?? "";
  const policy = disabled
    ? { phraseTranslation: false, phraseAudio: false }
    : plusFieldPolicy(type, field, phase);
  // a política do tipo só ELEGIBILIZA o campo; o interruptor do aluno decide
  // (pack desligado = regressão zero: sem gatilho, sem card, sem 🔊)
  const phraseOn = policy.phraseTranslation && settings.plus.phraseTranslation;
  const audioOn = policy.phraseAudio && settings.plus.plusAudio;
  const [expanded, setExpanded] = useState(false);
  const [lookup, setLookup] = useState<{ literal: string; contextual: string } | null | undefined>(
    undefined,
  );

  useEffect(() => {
    if (!phraseOn || !expanded) return;
    let cancelled = false;
    setLookup(undefined);
    loadPhrases(type).then((file) => {
      if (cancelled) return;
      setLookup(lookupPhrase(file, qid, field, index, sentence));
    });
    return () => {
      cancelled = true;
    };
  }, [phraseOn, expanded, type, field, index, sentence, qid]);

  // nenhum recurso de frase ativo → só as bolhas de palavra / texto simples
  if (!phraseOn && !audioOn) {
    return wordBubbles ? (
      <PlusWordText text={sentence} type={type} field={field} phase={phase} />
    ) : (
      <span>{sentence}</span>
    );
  }

  return (
    <span className="block">
      <span className="flex items-start justify-between gap-2">
        {wordBubbles ? (
          // botões não se aninham: palavras tocáveis ficam FORA do gatilho da frase
          <PlusWordText text={sentence} type={type} field={field} phase={phase} />
        ) : (
          <button
            type="button"
            data-plus-phrase
            className="flex-1 rounded text-left underline decoration-dotted decoration-muted-foreground/60 underline-offset-4"
            aria-expanded={expanded}
            onClick={(event) => {
              event.stopPropagation();
              if (phraseOn) setExpanded((v) => !v);
            }}
          >
            {sentence}
          </button>
        )}
        {phraseOn ? (
          <button
            type="button"
            data-plus-phrase
            aria-expanded={expanded}
            aria-label="Traduzir a frase"
            title="Traduzir a frase"
            className="inline-flex h-9 shrink-0 items-center rounded-full border border-border bg-card px-3 text-xs text-muted-foreground hover:bg-muted"
            onClick={(event) => {
              event.stopPropagation();
              setExpanded((v) => !v);
            }}
          >
            tradução
          </button>
        ) : null}
        {audioOn ? <PlusSpeakButton text={sentence} label="Pronunciar a frase em inglês" /> : null}
      </span>

      {expanded && phraseOn ? (
        <span
          data-plus-phrase-card
          className="mt-1 block rounded-lg border border-border bg-muted/60 p-3 text-sm"
        >
          {lookup === undefined ? (
            <span className="text-xs text-muted-foreground">Carregando…</span>
          ) : lookup === null ? (
            <span className="text-xs text-muted-foreground">Tradução não disponível</span>
          ) : (
            <>
              <span className="block text-foreground">{lookup.literal}</span>
              {lookup.contextual ? (
                <span className="mt-1 block text-xs text-muted-foreground">
                  {lookup.contextual}
                </span>
              ) : null}
            </>
          )}
        </span>
      ) : null}
    </span>
  );
}
