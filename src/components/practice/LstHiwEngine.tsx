// Highlight Incorrect Words (lst_hiw) — Motor C, PRD §10.2/§9.2.
// Áudio toca o texto correto; o texto na tela tem divergências — o aluno
// clica para marcar as suspeitas. Correção: max(0, certos − falsos)/erradas.

import { useCallback, useEffect, useRef, useState } from "react";

import { AudioPlayOnce } from "./AudioPlayOnce";
import type { EngineProps } from "./engine";
import { Button } from "@/components/ui/button";
import { useAppState } from "@/lib/useAppState";
import { deriveWrongTokens, gradeHiw, splitShownTokens } from "@/lib/pte/hiw";
import type { LstHiwData } from "@/lib/pte/types";

export function LstHiwEngine({ question, onSubmit, submitted, registerAutoSubmit }: EngineProps) {
  const data = question.data as LstHiwData;
  const { settings } = useAppState();
  const tokens = splitShownTokens(data.shown);
  const [selected, setSelected] = useState<number[]>([]);
  const selectedRef = useRef(selected);
  const submittedRef = useRef(false);

  const toggle = (index: number) => {
    if (submitted) return;
    setSelected((prev) => {
      const next = prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index];
      selectedRef.current = next;
      return next;
    });
  };

  const doSubmit = useCallback(() => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    const wrong = deriveWrongTokens(data.spoken, data.shown);
    const result = gradeHiw(selectedRef.current, wrong, tokens);
    const feedbackParts: string[] = [];
    feedbackParts.push(
      `${result.wrongCount} palavra(s) divergente(s) no texto. Você marcou ${result.hits} correta(s).`,
    );
    if (result.falseList.length > 0) {
      feedbackParts.push(
        `Falsos positivos (marcados sem divergência): ${result.falseList.join(", ")}.`,
      );
    }
    if (result.wrongCount - result.hits > 0) {
      const missedWords = wrong
        .filter((index) => !selectedRef.current.includes(index))
        .map((index) => tokens[index] ?? "")
        .filter(Boolean);
      feedbackParts.push(`Ficaram faltando: ${missedWords.join(", ")}.`);
    }
    onSubmit({
      result: {
        score: result.score,
        subscores: [
          { label: "Certas", value: result.hits },
          { label: "Falsos positivos", value: result.falsePositives },
          { label: "Divergências no texto", value: result.wrongCount },
        ],
        feedback: feedbackParts.join(" "),
      },
      metrics: { hits: result.hits, falsePositives: result.falsePositives },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.spoken, data.shown, onSubmit]);

  useEffect(() => {
    registerAutoSubmit(doSubmit);
    return () => registerAutoSubmit(null);
  }, [doSubmit, registerAutoSubmit]);

  return (
    <div>
      <AudioPlayOnce
        text={data.spoken}
        canReplay={settings.allowReplay || submitted}
        label="Ouvir o texto correto (1×)"
      />
      <p className="mt-4 text-lg leading-relaxed text-foreground">
        {tokens.map((token, index) => {
          const isSelected = selected.includes(index);
          return (
            <button
              key={`${index}-${token}`}
              type="button"
              onClick={() => toggle(index)}
              disabled={submitted}
              aria-pressed={isSelected}
              className={`mx-0.5 rounded px-0.5 text-left transition-colors ${
                isSelected
                  ? "bg-warning text-warning-foreground underline decoration-2"
                  : "hover:bg-accent"
              }`}
            >
              {token}
            </button>
          );
        })}
      </p>
      <p className="mt-2 text-xs text-muted-foreground">
        Toque nas palavras que DIFEREM do áudio. Toque de novo para desmarcar.
      </p>
      {submitted ? null : (
        <Button type="button" onClick={doSubmit} className="mt-3 min-h-11">
          Corrigir
        </Button>
      )}
    </div>
  );
}
