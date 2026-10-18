// Fill in the Blanks (leitura · arrastar) — Motor D, PRD §10.2/§9.4. Bancos de
// palavras: toque/click coloca no primeiro espaço vazio; toque no espaço
// devolve a palavra. Botões nativos = alternativa de teclado (§9.4).

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { EngineProps } from "./engine";
import { splitTemplate } from "./blankUtils";
import { Button } from "@/components/ui/button";
import { gradeFibTyped } from "@/lib/pte/fib";
import type { FibDragData } from "@/lib/pte/types";

export function ReadFibDragEngine({
  question,
  onSubmit,
  submitted,
  registerAutoSubmit,
}: EngineProps) {
  const data = question.data as FibDragData;
  // slot → índice no banco (ou null)
  const [slots, setSlots] = useState<(number | null)[]>(() => data.answers.map(() => null));
  const slotsRef = useRef(slots);
  const submittedRef = useRef(false);

  const parts = useMemo(() => splitTemplate(data.passage), [data.passage]);

  const update = (next: (number | null)[]) => {
    setSlots(next);
    slotsRef.current = next;
  };

  const placeFromBank = (bankIndex: number) => {
    if (submitted) return;
    if (slotsRef.current.includes(bankIndex)) return; // já em uso
    const target = slotsRef.current.indexOf(null);
    if (target === -1) return; // sem espaço vazio
    const next = [...slotsRef.current];
    next[target] = bankIndex;
    update(next);
  };

  const clearSlot = (slotIndex: number) => {
    if (submitted) return;
    const next = [...slotsRef.current];
    next[slotIndex] = null;
    update(next);
  };

  const doSubmit = useCallback(() => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    const values = slotsRef.current.map((bankIndex) =>
      bankIndex === null ? null : (data.bank[bankIndex] ?? null),
    );
    const result = gradeFibTyped(
      data.answers.map((bankIndex) => data.bank[bankIndex] ?? ""),
      values,
    );
    onSubmit({
      result: {
        score: result.score,
        subscores: [{ label: "Lacunas corretas", value: result.correct }],
        feedback: `${result.correct} de ${result.total} lacunas corretas.`,
      },
      tags: result.tags,
      metrics: { correct: result.correct, total: result.total },
    });
  }, [data.answers, data.bank, onSubmit]);

  useEffect(() => {
    registerAutoSubmit(doSubmit);
    return () => registerAutoSubmit(null);
  }, [doSubmit, registerAutoSubmit]);

  const used = new Set(slots);

  return (
    <div>
      <p className="text-lg leading-relaxed text-foreground">
        {parts.map((part, i) => {
          if (part.blank === null) return <span key={`t-${i}`}>{part.text}</span>;
          const slotIndex = part.blank - 1;
          const bankIndex = slots[slotIndex] ?? null;
          return (
            <button
              key={`b-${part.blank}-${i}`}
              type="button"
              onClick={() => clearSlot(slotIndex)}
              disabled={submitted || bankIndex === null}
              aria-label={`Lacuna ${part.blank}${bankIndex !== null ? " (toque para devolver a palavra)" : " (vazia)"}`}
              className={`mx-1 inline-block min-w-24 rounded-md border-b-2 border-dashed px-2 py-0.5 text-base ${
                bankIndex !== null
                  ? "border-primary bg-accent text-foreground"
                  : "border-muted-foreground text-muted-foreground"
              }`}
            >
              {bankIndex !== null ? data.bank[bankIndex] : "____"}
            </button>
          );
        })}
      </p>
      <div className="mt-4 rounded-lg border border-border bg-card p-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Banco de palavras
        </p>
        <ul className="mt-2 flex flex-wrap gap-2">
          {data.bank.map((word, bankIndex) => {
            const isUsed = used.has(bankIndex);
            return (
              <li key={`${bankIndex}-${word}`}>
                <button
                  type="button"
                  onClick={() => placeFromBank(bankIndex)}
                  disabled={submitted || isUsed}
                  aria-label={`Colocar a palavra ${word}${isUsed ? " (já usada)" : ""}`}
                  className={`min-h-11 rounded-md border px-3 py-1.5 text-sm transition-colors ${
                    isUsed
                      ? "border-border text-muted-foreground opacity-50"
                      : "border-border bg-background text-foreground hover:bg-accent"
                  }`}
                >
                  {word}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
      {submitted ? null : (
        <Button type="button" onClick={doSubmit} className="mt-4 min-h-11">
          Corrigir
        </Button>
      )}
    </div>
  );
}
