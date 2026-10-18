// Múltipla escolha (read_mcq_single/multi · lst_mcq_single/multi) — Motores
// C e D, PRD §10.2. Reading mostra a passagem; Listening toca o áudio 1×.
// Espaço marca a opção (teclado nativo do input); explicação/armadilhas no
// resultado.

import { useCallback, useEffect, useRef, useState } from "react";

import { PlusText } from "@/components/plus/PlusText";
import { AudioPlayOnce } from "./AudioPlayOnce";
import type { EngineProps } from "./engine";
import { Button } from "@/components/ui/button";
import { useAppState } from "@/lib/useAppState";
import { gradeMcqMulti, gradeMcqSingle } from "@/lib/pte/mcq";
import type { LstMcqData, ReadMcqData } from "@/lib/pte/types";

export function McqEngine({
  question,
  onSubmit,
  submitted,
  registerAutoSubmit,
  mode,
}: EngineProps) {
  const isListening = question.type.startsWith("lst_");
  const isMulti = question.type.endsWith("_multi");
  const data = question.data as ReadMcqData | LstMcqData;
  const { settings } = useAppState();

  const [single, setSingle] = useState<number | null>(null);
  const [multi, setMulti] = useState<number[]>([]);
  const singleRef = useRef<number | null>(null);
  const multiRef = useRef<number[]>([]);
  const submittedRef = useRef(false);

  const traps = "traps" in data ? data.traps : undefined;
  const passage = "passage" in data ? data.passage : undefined;
  const transcript = "transcript" in data ? data.transcript : undefined;

  const chooseSingle = (index: number) => {
    if (submitted) return;
    setSingle(index);
    singleRef.current = index;
  };
  const toggleMulti = (index: number) => {
    if (submitted) return;
    setMulti((prev) => {
      const next = prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index];
      multiRef.current = next;
      return next;
    });
  };

  const doSubmit = useCallback(() => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    if (isMulti) {
      const result = gradeMcqMulti(multiRef.current, data.answer as number[], traps);
      const parts: string[] = [
        `${result.correctSelected} certa(s), ${result.wrongSelected} errada(s), ${result.missed} faltando.`,
      ];
      if (result.trapTexts.length > 0) parts.push(`Armadilhas: ${result.trapTexts.join(" · ")}`);
      if (data.explanation) parts.push(data.explanation);
      onSubmit({
        result: {
          score: result.score,
          subscores: [
            { label: "Certas", value: result.correctSelected },
            { label: "Erradas", value: result.wrongSelected },
            { label: "Faltando", value: result.missed },
          ],
          feedback: parts.join(" "),
        },
        tags: result.tags,
        metrics: {
          correct: result.correctSelected,
          wrong: result.wrongSelected,
          missed: result.missed,
        },
      });
      return;
    }
    const result = gradeMcqSingle(singleRef.current, data.answer as number, traps);
    const parts: string[] = [];
    if (result.score === 100) parts.push("Resposta correta.");
    else {
      parts.push(
        data.explanation
          ? `Resposta incorreta. ${data.explanation}`
          : `Resposta incorreta — a correta era a opção ${(data.answer as number) + 1}.`,
      );
      if (result.trapText) parts.push(`Armadilha: ${result.trapText}`);
    }
    onSubmit({
      result: {
        score: result.score,
        subscores: [{ label: "Resposta correta", value: result.score === 100 ? 1 : 0 }],
        feedback: parts.join(" "),
      },
      tags: result.tags,
      metrics: { correct: result.score === 100 ? 1 : 0 },
    });
  }, [data, isMulti, onSubmit, traps]);

  useEffect(() => {
    registerAutoSubmit(doSubmit);
    return () => registerAutoSubmit(null);
  }, [doSubmit, registerAutoSubmit]);

  return (
    <div>
      {isListening ? (
        <AudioPlayOnce
          text={transcript ?? ""}
          canReplay={settings.allowReplay || submitted}
          label="Ouvir o áudio (1×)"
        />
      ) : (
        <p className="text-lg leading-relaxed text-foreground">
          <PlusText
            text={passage ?? ""}
            type={question.type}
            field="passage"
            phase="pre"
            qid={question.id}
            disabled={mode === "exam"}
          />
        </p>
      )}
      {data.question ? (
        <p className="mt-3 font-medium text-foreground">
          <PlusText
            text={data.question}
            type={question.type}
            field="question"
            phase="pre"
            qid={question.id}
            disabled={mode === "exam"}
          />
        </p>
      ) : null}
      {isMulti ? (
        <p className="mt-1 text-xs text-muted-foreground">
          Mais de uma resposta pode estar correta; errar desconta.
        </p>
      ) : null}
      <ul className="mt-3 space-y-2">
        {data.options.map((option, index) => {
          const checked = isMulti ? multi.includes(index) : single === index;
          return (
            <li key={`${index}-${option.slice(0, 24)}`}>
              <label
                className={`flex min-h-11 items-start gap-3 rounded-lg border px-3 py-2 text-sm leading-relaxed transition-colors ${
                  checked ? "border-primary bg-accent" : "border-border bg-card"
                } ${submitted ? "opacity-90" : "cursor-pointer"}`}
              >
                <input
                  type={isMulti ? "checkbox" : "radio"}
                  name={`mcq-${question.id}`}
                  checked={checked}
                  onChange={() => (isMulti ? toggleMulti(index) : chooseSingle(index))}
                  disabled={submitted}
                  className="mt-1 size-4"
                />
                <span className="text-foreground">{option}</span>
              </label>
            </li>
          );
        })}
      </ul>
      {submitted ? null : (
        <Button type="button" onClick={doSubmit} className="mt-4 min-h-11">
          Corrigir
        </Button>
      )}
    </div>
  );
}
