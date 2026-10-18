// Summarize Written Text (swt) — Motor B, PRD §9.4/§10.2.
// 1 frase de 5–75 palavras; conteúdo = cobertura de keywords; forma inválida
// limita a nota a 40; detector de template avisa, nunca altera a nota.

import { useCallback, useEffect, useRef, useState } from "react";

import { PlusText } from "@/components/plus/PlusText";
import type { EngineProps } from "./engine";
import { WordCountZone } from "./WordCountZone";
import { Button } from "@/components/ui/button";
import { useAppState } from "@/lib/useAppState";
import { gradeSwt } from "@/lib/pte/summary";
import { detectTemplate } from "@/lib/pte/templateDetector";
import type { SwtData } from "@/lib/pte/types";

const TEMPLATE_WARNING =
  "A resposta tem características de template (frases prontas) e pode ser enviada a revisão humana — a nota não foi alterada.";

export function SwtEngine({
  question,
  onSubmit,
  submitted,
  registerAutoSubmit,
  mode,
}: EngineProps) {
  const data = question.data as SwtData;
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
    const result = gradeSwt(textRef.current, data.keywords);
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
          { label: "Forma (1 frase, 5–75)", value: result.formValid ? 100 : 0 },
        ],
        feedback:
          feedbackParts.length > 0
            ? feedbackParts.join(" ")
            : "1 frase, na zona de tamanho. Gramática e vocabulário avançado não são avaliados.",
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
      <p className="text-lg leading-relaxed text-foreground">
        <PlusText
          text={data.text}
          type="swt"
          field="text"
          phase="pre"
          qid={question.id}
          disabled={mode === "exam"}
        />
      </p>
      <div className="mt-4">
        <WordCountZone
          value={text}
          onChange={update}
          min={5}
          max={75}
          disabled={submitted}
          label="Sua frase-resumo (exatamente 1 frase)"
          placeholder="Uma única frase, de 5 a 75 palavras"
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
