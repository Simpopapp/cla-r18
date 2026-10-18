// Select Missing Word (lst_smw) — Motor C, PRD §10.2. Áudio que termina com
// bipe sintético; o aluno escolhe a palavra que completa a transcrição.

import { useCallback, useEffect, useRef, useState } from "react";

import { AudioPlayOnce } from "./AudioPlayOnce";
import type { EngineProps } from "./engine";
import { Button } from "@/components/ui/button";
import { useAppState } from "@/lib/useAppState";
import { gradeMcqSingle } from "@/lib/pte/mcq";
import type { LstSmwData } from "@/lib/pte/types";

export function LstSmwEngine({ question, onSubmit, submitted, registerAutoSubmit }: EngineProps) {
  const data = question.data as LstSmwData;
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
        subscores: [{ label: "Resposta correta", value: result.score === 100 ? 1 : 0 }],
        feedback:
          result.score === 100
            ? "A palavra escolhida completa a transcrição."
            : `Resposta incorreta — a palavra correta era a opção ${data.answer + 1}.`,
      },
      tags: result.tags,
      metrics: { correct: result.score === 100 ? 1 : 0 },
    });
  }, [data.answer, onSubmit]);

  useEffect(() => {
    registerAutoSubmit(doSubmit);
    return () => registerAutoSubmit(null);
  }, [doSubmit, registerAutoSubmit]);

  return (
    <div>
      <AudioPlayOnce
        text={data.transcript}
        beep
        canReplay={settings.allowReplay || submitted}
        label="Ouvir o texto (termina com bipe)"
      />
      <p className="mt-4 text-sm text-muted-foreground">
        Escolha a palavra que completa o texto no lugar do bipe:
      </p>
      <ul className="mt-2 space-y-2">
        {data.options.map((option, index) => (
          <li key={`${index}-${option.slice(0, 16)}`}>
            <label
              className={`flex min-h-11 items-center gap-3 rounded-lg border px-3 py-2 text-sm transition-colors ${
                selected === index ? "border-primary bg-accent" : "border-border bg-card"
              } ${submitted ? "opacity-90" : "cursor-pointer"}`}
            >
              <input
                type="radio"
                name="lst-smw-option"
                checked={selected === index}
                onChange={() => choose(index)}
                disabled={submitted}
                className="size-4"
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
