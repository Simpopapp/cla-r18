// Write From Dictation (wfd) — Motor B, PRD §10.2/§9.2.
// TTS 1× + campo de resposta; correção por palavra com LCS; mapa de
// acertos/omissões/extras no resultado.

import { useCallback, useEffect, useRef, useState } from "react";

import { AudioPlayOnce } from "./AudioPlayOnce";
import { PlusText } from "@/components/plus/PlusText";
import { plusEnabled } from "@/lib/plus/settings";
import type { EngineProps } from "./engine";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAppState } from "@/lib/useAppState";
import { gradeDictation, type DictationResult } from "@/lib/pte/dictation";
import type { WfdData } from "@/lib/pte/types";

export function WfdEngine({
  question,
  onSubmit,
  submitted,
  registerAutoSubmit,
  mode = "practice",
}: EngineProps) {
  const data = question.data as WfdData;
  const { settings } = useAppState();
  const [answer, setAnswer] = useState("");
  const [graded, setGraded] = useState<DictationResult | null>(null);
  const answerRef = useRef("");
  const submittedRef = useRef(false);

  const update = (value: string) => {
    setAnswer(value);
    answerRef.current = value;
  };

  const doSubmit = useCallback(() => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    const result = gradeDictation(answerRef.current, data.sentence);
    setGraded(result);
    const missedLabel =
      result.missed.length > 0
        ? `Palavras erradas ou omitidas: ${result.missed.join(", ")}.`
        : "Todas as palavras corretas.";
    const extraLabel =
      result.extras > 0 ? ` (${result.extras} palavra(s) extra(s) na resposta)` : "";
    onSubmit({
      result: {
        score: result.score,
        subscores: [
          { label: "Palavras corretas", value: result.hits },
          { label: "De um total de", value: result.total },
          { label: "Extras", value: result.extras },
        ],
        feedback: `${missedLabel}${extraLabel} Cada palavra correta vale +1.`,
      },
      tags: result.tags,
      metrics: { hits: result.hits, extras: result.extras, total: result.total },
    });
  }, [data.sentence, onSubmit]);

  useEffect(() => {
    registerAutoSubmit(doSubmit);
    return () => registerAutoSubmit(null);
  }, [doSubmit, registerAutoSubmit]);

  return (
    <div>
      <AudioPlayOnce
        text={data.sentence}
        canReplay={settings.allowReplay || submitted}
        label="Ouvir a frase (1×)"
      />
      <label htmlFor="wfd-answer" className="mt-4 block text-sm font-medium text-foreground">
        Escreva a frase que você ouviu
      </label>
      <Textarea
        id="wfd-answer"
        value={answer}
        onChange={(event) => update(event.target.value)}
        disabled={submitted}
        className="mt-1 min-h-24"
        placeholder="Digite exatamente o que ouviu — pontuação e caixa não contam"
      />
      {submitted ? null : (
        <Button type="button" onClick={doSubmit} className="mt-3 min-h-11">
          Corrigir
        </Button>
      )}
      {graded ? (
        <p className="mt-4 text-sm leading-relaxed" data-testid="wfd-target">
          <span className="font-medium text-foreground">Frase correta: </span>
          {graded.words.map((word, index) => (
            <span
              key={`${index}-${word.word}`}
              className={
                word.status === "hit" ? "text-foreground" : "text-destructive line-through"
              }
            >
              {word.word}{" "}
            </span>
          ))}
        </p>
      ) : null}
      {graded && mode !== "exam" && plusEnabled(settings.plus) ? (
        <div className="mt-3 border-t border-border pt-3">
          <PlusText
            text={data.sentence}
            type="wfd"
            field="sentence"
            phase="post"
            qid={question.id}
          />
        </div>
      ) : null}
    </div>
  );
}
