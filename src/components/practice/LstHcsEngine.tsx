// Highlight Correct Summary (lst_hcs) — Motor C, PRD §10.2. Áudio 1×; o aluno
// escolhe o resumo que corresponde à transcrição; explicação no resultado.

import { useCallback, useEffect, useRef, useState } from "react";

import { AudioPlayOnce } from "./AudioPlayOnce";
import type { EngineProps } from "./engine";
import { Button } from "@/components/ui/button";
import { useAppState } from "@/lib/useAppState";
import { gradeMcqSingle } from "@/lib/pte/mcq";
import type { LstHcsData } from "@/lib/pte/types";

export function LstHcsEngine({ question, onSubmit, submitted, registerAutoSubmit }: EngineProps) {
  const data = question.data as LstHcsData;
  const { settings } = useAppState();
  const [selected, setSelected] = useState<number | null>(null);
  const selectedRef = useRef<number | null>(null);
  const submittedRef = useRef(false);

  const choose = (index: number) => {
    if (submitted) return;
    setSelected(index);
    selectedRef.current = index;
  };

  const doSubmit = useCallback(() => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    const result = gradeMcqSingle(selectedRef.current, data.answer);
    onSubmit({
      result: {
        score: result.score,
        subscores: [{ label: "Resumo correto", value: result.score === 100 ? 1 : 0 }],
        feedback:
          result.score === 100
            ? "Resumo correto."
            : data.explanation
              ? `Resumo incorreto. ${data.explanation}`
              : `Resumo incorreto — a opção correta era a ${data.answer + 1}.`,
      },
      tags: result.tags,
      metrics: { correct: result.score === 100 ? 1 : 0 },
    });
  }, [data.answer, data.explanation, onSubmit]);

  useEffect(() => {
    registerAutoSubmit(doSubmit);
    return () => registerAutoSubmit(null);
  }, [doSubmit, registerAutoSubmit]);

  return (
    <div>
      <AudioPlayOnce
        text={data.transcript}
        canReplay={settings.allowReplay || submitted}
        label="Ouvir a gravação (1×)"
      />
      <p className="mt-4 text-sm text-muted-foreground">Escolha o resumo que melhor corresponde:</p>
      <ul className="mt-2 space-y-2">
        {data.options.map((option, index) => (
          <li key={`${index}-${option.slice(0, 24)}`}>
            <label
              className={`flex min-h-11 items-start gap-3 rounded-lg border px-3 py-2 text-sm leading-relaxed transition-colors ${
                selected === index ? "border-primary bg-accent" : "border-border bg-card"
              } ${submitted ? "opacity-90" : "cursor-pointer"}`}
            >
              <input
                type="radio"
                name="lst-hcs-option"
                checked={selected === index}
                onChange={() => choose(index)}
                disabled={submitted}
                className="mt-1 size-4"
              />
              <span className="text-foreground">{option}</span>
            </label>
          </li>
        ))}
      </ul>
      {submitted ? null : (
        <Button type="button" onClick={doSubmit} className="mt-4 min-h-11">
          Corrigir
        </Button>
      )}
    </div>
  );
}
