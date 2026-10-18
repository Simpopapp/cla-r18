// Fill in the Blanks (leitura · dropdown) — Motor D, PRD §10.2. Passagem com
// <select> inline por lacuna; teclado/touch nativos. Sem dicas de correção.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { EngineProps } from "./engine";
import { splitTemplate } from "./blankUtils";
import { Button } from "@/components/ui/button";
import { gradeFibTyped } from "@/lib/pte/fib";
import type { FibDropdownData } from "@/lib/pte/types";

export function ReadFibDropdownEngine({
  question,
  onSubmit,
  submitted,
  registerAutoSubmit,
}: EngineProps) {
  const data = question.data as FibDropdownData;
  const [values, setValues] = useState<(string | null)[]>(() => data.blanks.map(() => null));
  const valuesRef = useRef(values);
  const submittedRef = useRef(false);

  const parts = useMemo(() => splitTemplate(data.passage), [data.passage]);

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
    const result = gradeFibTyped(
      data.blanks.map((blank) => blank.options[blank.answer] ?? ""),
      valuesRef.current,
    );
    onSubmit({
      result: {
        score: result.score,
        subscores: [{ label: "Lacunas corretas", value: result.correct }],
        feedback: `${result.correct} de ${result.total} lacunas corretas. Caixa e espaços não contam.`,
      },
      tags: result.tags,
      metrics: { correct: result.correct, total: result.total },
    });
  }, [data.blanks, onSubmit]);

  useEffect(() => {
    registerAutoSubmit(doSubmit);
    return () => registerAutoSubmit(null);
  }, [doSubmit, registerAutoSubmit]);

  return (
    <div>
      <p className="text-lg leading-relaxed text-foreground">
        {parts.map((part, i) => {
          if (part.blank === null) return <span key={`t-${i}`}>{part.text}</span>;
          const blankIndex = part.blank - 1;
          const blank = data.blanks[blankIndex];
          return (
            <select
              key={`b-${part.blank}-${i}`}
              value={values[blankIndex] ?? ""}
              onChange={(event) => update(blankIndex, event.target.value)}
              disabled={submitted}
              aria-label={`Lacuna ${part.blank}`}
              className="mx-1 inline-block rounded-md border border-input bg-background px-2 py-1 text-base text-foreground"
            >
              <option value="">—</option>
              {blank?.options.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
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
