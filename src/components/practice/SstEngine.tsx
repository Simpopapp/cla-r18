// Summarize Spoken Text (sst) — Motor B, PRD §9.4/§10.2.
// Áudio 1×, resumo de 50–70 palavras, cronômetro 10 min com auto-submit;
// score = conteúdo × fator de forma; template só avisa.

import { useCallback, useEffect, useRef, useState } from "react";

import { AudioPlayOnce } from "./AudioPlayOnce";
import type { EngineProps } from "./engine";
import { WordCountZone } from "./WordCountZone";
import { Button } from "@/components/ui/button";
import { useAppState } from "@/lib/useAppState";
import { gradeSst, sstFormFactor } from "@/lib/pte/summary";
import { detectTemplate } from "@/lib/pte/templateDetector";
import type { LectureRetellData } from "@/lib/pte/types";

const TEMPLATE_WARNING =
  "A resposta tem características de template (frases prontas) e pode ser enviada a revisão humana — a nota não foi alterada.";

export function SstEngine({ question, onSubmit, submitted, registerAutoSubmit }: EngineProps) {
  const data = question.data as LectureRetellData;
  const { settings } = useAppState();
  const [text, setText] = useState("");
  const textRef = useRef("");
  const submittedRef = useRef(false);

  const update = (value: string) => {
    setText(value);
    textRef.current = value;
  };

  const doSubmit = useCallback(() => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    const result = gradeSst(textRef.current, data.keywords);
    const verdict = detectTemplate(textRef.current);
    const tags = verdict.likelyTemplate ? [...result.tags, "template"] : [...result.tags];
    const feedbackParts: string[] = [];
    if (result.feedback) feedbackParts.push(result.feedback);
    if (verdict.likelyTemplate) {
      feedbackParts.push(`${TEMPLATE_WARNING} Sinais: ${verdict.reasons.join("; ")}.`);
    }
    onSubmit({
      result: {
        score: result.score,
        subscores: [
          { label: "Conteúdo (cobertura)", value: result.content },
          { label: "Palavras", value: result.words },
          { label: "Fator de forma", value: Math.round(sstFormFactor(result.words) * 100) },
        ],
        feedback:
          feedbackParts.length > 0
            ? feedbackParts.join(" ")
            : "Na zona de 50–70 palavras. Gramática e ortografia não são avaliadas.",
      },
      tags: tags.length > 0 ? tags : undefined,
      metrics: { words: result.words },
    });
  }, [data.keywords, onSubmit]);

  useEffect(() => {
    registerAutoSubmit(doSubmit);
    return () => registerAutoSubmit(null);
  }, [doSubmit, registerAutoSubmit]);

  return (
    <div>
      <AudioPlayOnce
        text={data.transcript}
        canReplay={settings.allowReplay || submitted}
        label="Ouvir a palestra (1×)"
      />
      <div className="mt-4">
        <WordCountZone
          value={text}
          onChange={update}
          min={50}
          max={70}
          disabled={submitted}
          label="Seu resumo (50–70 palavras)"
          placeholder="Escreva o resumo enquanto ouve ou depois"
        />
      </div>
      {submitted ? null : (
        <Button type="button" onClick={doSubmit} className="mt-3 min-h-11">
          Corrigir
        </Button>
      )}
    </div>
  );
}
