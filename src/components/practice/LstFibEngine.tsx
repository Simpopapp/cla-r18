// Fill in the Blanks (Listening) — Motor C, PRD §10.2. Player 1× com
// template e inputs inline; Tab navega lacunas; digitação tolerante.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { AudioPlayOnce } from "./AudioPlayOnce";
import { filledTemplate, splitTemplate } from "./blankUtils";
import type { EngineProps } from "./engine";
import { Button } from "@/components/ui/button";
import { useAppState } from "@/lib/useAppState";
import { gradeFibTyped } from "@/lib/pte/fib";
import type { LstFibData } from "@/lib/pte/types";

export function LstFibEngine({ question, onSubmit, submitted, registerAutoSubmit }: EngineProps) {
  const data = question.data as LstFibData;
  const { settings } = useAppState();
  const [values, setValues] = useState<(string | null)[]>(() => data.answers.map(() => null));
  const valuesRef = useRef(values);
  const submittedRef = useRef(false);

  const parts = useMemo(() => splitTemplate(data.template), [data.template]);
  const audioText = useMemo(
    () => filledTemplate(data.template, data.answers),
    [data.template, data.answers],
  );

  const update = (index: number, value: string) => {
    setValues((prev) => {
      const next = [...prev];
      next[index] = value === "" ? null : value;
      valuesRef.current = next;
      return next;
    });
  };

  const doSubmit = useCallback(() => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    const result = gradeFibTyped(data.answers, valuesRef.current);
    onSubmit({
      result: {
        score: result.score,
        subscores: [{ label: "Lacunas corretas", value: result.correct }],
        feedback: `${result.correct} de ${result.total} lacunas corretas. Caixa e espaços não contam.`,
      },
      tags: result.tags,
      metrics: { correct: result.correct, total: result.total },
    });
  }, [data.answers, onSubmit]);

  useEffect(() => {
    registerAutoSubmit(doSubmit);
    return () => registerAutoSubmit(null);
  }, [doSubmit, registerAutoSubmit]);

  return (
    <div>
      <AudioPlayOnce
        text={audioText}
        canReplay={settings.allowReplay || submitted}
        label="Ouvir o texto (1×)"
      />
      <p className="mt-4 text-lg leading-relaxed text-foreground">
        {parts.map((part, i) => {
          if (part.blank === null) return <span key={`t-${i}`}>{part.text}</span>;
          const blankIndex = part.blank - 1;
          return (
            <input
              key={`b-${part.blank}-${i}`}
              type="text"
              value={values[blankIndex] ?? ""}
              onChange={(event) => update(blankIndex, event.target.value)}
              disabled={submitted}
              aria-label={`Lacuna ${part.blank}`}
              className="mx-1 inline-block w-32 rounded-md border border-input bg-background px-2 py-1 text-base text-foreground"
            />
          );
        })}
      </p>
      {submitted ? null : (
        <Button type="button" onClick={doSubmit} className="mt-4 min-h-11">
          Corrigir
        </Button>
      )}
    </div>
  );
}
