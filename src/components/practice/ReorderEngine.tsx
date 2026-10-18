// Re-order Paragraphs — Motor D, PRD §10.2. As caixas são a ordem correta
// embaralhada; o aluno move com ↑/↓ (touch e teclado). Correção: pares
// adjacentes corretos, nota máxima em n−1 pares.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { EngineProps } from "./engine";
import { Button } from "@/components/ui/button";
import { gradeReorder } from "@/lib/pte/reorder";
import type { ReorderData } from "@/lib/pte/types";

export function ReorderEngine({ question, onSubmit, submitted, registerAutoSubmit }: EngineProps) {
  const data = question.data as ReorderData;
  // items[i] = índice da caixa original na posição i
  const [order, setOrder] = useState<number[]>(() => {
    const initial = data.paragraphs.map((_, i) => i);
    // PRD: embaralhamento determinístico por seed da questão.
    let seed = [...question.id].reduce((acc, ch) => acc * 31 + ch.charCodeAt(0), 7) >>> 0;
    const rand = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };
    for (let i = initial.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      const ai = initial[i] ?? i;
      const aj = initial[j] ?? j;
      initial[i] = aj;
      initial[j] = ai;
    }
    return initial;
  });
  const orderRef = useRef(order);
  const submittedRef = useRef(false);

  const move = (position: number, delta: -1 | 1) => {
    if (submitted) return;
    const target = position + delta;
    if (target < 0 || target >= orderRef.current.length) return;
    const next = [...orderRef.current];
    const cur = next[position] ?? position;
    const swap = next[target] ?? target;
    next[position] = swap;
    next[target] = cur;
    setOrder(next);
    orderRef.current = next;
  };

  const doSubmit = useCallback(() => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    const result = gradeReorder(orderRef.current);
    onSubmit({
      result: {
        score: result.score,
        subscores: [{ label: "Pares adjacentes corretos", value: result.adjacentCorrect }],
        feedback:
          result.score === 100
            ? "Ordem perfeita."
            : `${result.adjacentCorrect} de ${result.maxAdjacent} pares adjacentes corretos.`,
      },
      metrics: { correct: result.adjacentCorrect, total: result.maxAdjacent },
    });
  }, [onSubmit]);

  useEffect(() => {
    registerAutoSubmit(doSubmit);
    return () => registerAutoSubmit(null);
  }, [doSubmit, registerAutoSubmit]);

  const targetOrder = useMemo(() => data.paragraphs.map((_, i) => i), [data.paragraphs]);

  return (
    <div>
      <p className="text-xs text-muted-foreground">
        Use as setas para ordenar os parágrafos em um texto coerente.
      </p>
      <ul className="mt-2 space-y-2">
        {order.map((boxIndex, position) => (
          <li
            key={`${boxIndex}-${data.paragraphs[boxIndex]?.slice(0, 16) ?? boxIndex}`}
            className="rounded-lg border border-border bg-card p-3"
          >
            <div className="flex items-start gap-2">
              <span className="mt-1 text-xs font-medium text-muted-foreground">{position + 1}</span>
              <p className="flex-1 text-sm leading-relaxed text-foreground">
                {data.paragraphs[boxIndex]}
              </p>
              {submitted ? null : (
                <span className="flex flex-col gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="min-h-9 px-2"
                    onClick={() => move(position, -1)}
                    disabled={position === 0}
                    aria-label={`Mover parágrafo ${position + 1} para cima`}
                  >
                    ↑
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="min-h-9 px-2"
                    onClick={() => move(position, 1)}
                    disabled={position === order.length - 1}
                    aria-label={`Mover parágrafo ${position + 1} para baixo`}
                  >
                    ↓
                  </Button>
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>
      {submitted ? (
        <div className="mt-4 rounded-lg border border-success/40 bg-success/10 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Ordem correta
          </p>
          <ol className="mt-1 space-y-1 text-sm text-foreground">
            {targetOrder.map((boxIndex, position) => (
              <li key={boxIndex} className="leading-snug">
                {position + 1}. {data.paragraphs[boxIndex]?.slice(0, 120)}
                {(data.paragraphs[boxIndex]?.length ?? 0) > 120 ? "…" : ""}
              </li>
            ))}
          </ol>
        </div>
      ) : (
        <Button type="button" onClick={doSubmit} className="mt-4 min-h-11">
          Corrigir
        </Button>
      )}
    </div>
  );
}
