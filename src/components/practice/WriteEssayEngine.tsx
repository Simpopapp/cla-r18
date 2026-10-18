// Write Essay — Motor B, PRD §9.4/§10.2. 20 min com auto-submit; estrutura
// (≥ 3 parágrafos), cobertura de keywords e ajuste de tamanho; rotulado
// "estimativa de forma/conteúdo" — gramática e coerência não avaliadas.

import { useCallback, useEffect, useRef, useState } from "react";

import { PlusText } from "@/components/plus/PlusText";
import type { EngineProps } from "./engine";
import { WordCountZone } from "./WordCountZone";
import { Button } from "@/components/ui/button";
import { useAppState } from "@/lib/useAppState";
import { gradeEssay } from "@/lib/pte/essay";
import { detectTemplate } from "@/lib/pte/templateDetector";
import type { EssayData } from "@/lib/pte/types";

const TEMPLATE_WARNING =
  "A resposta tem características de template (frases prontas) e pode ser enviada a revisão humana — a nota não foi alterada.";

export function WriteEssayEngine({
  question,
  onSubmit,
  submitted,
  registerAutoSubmit,
  mode,
}: EngineProps) {
  const data = question.data as EssayData;
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
    const result = gradeEssay(textRef.current, data.keywords);
    const verdict = detectTemplate(textRef.current);
    const tags = verdict.likelyTemplate ? [...result.tags, "template"] : [...result.tags];
    const feedbackParts: string[] = [];
    if (result.feedback) feedbackParts.push(result.feedback);
    feedbackParts.push(
      `Estimativa de forma/conteúdo: ${result.paragraphs} parágrafo(s), ${result.words} palavras. Gramática, ortografia e coerência não são avaliadas.`,
    );
    if (verdict.likelyTemplate) {
      feedbackParts.push(`${TEMPLATE_WARNING} Sinais: ${verdict.reasons.join("; ")}.`);
    }
    onSubmit({
      result: {
        score: result.score,
        subscores: [
          { label: "Conteúdo (cobertura)", value: result.content },
          { label: "Estrutura (≥ 3 parágrafos)", value: result.structure },
          { label: "Tamanho (200–300)", value: Math.round(result.sizeFactor * 100) },
        ],
        feedback: feedbackParts.join(" "),
      },
      tags: tags.length > 0 ? tags : undefined,
      metrics: { words: result.words, paragraphs: result.paragraphs },
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
          text={data.prompt}
          type="write_essay"
          field="prompt"
          phase="pre"
          qid={question.id}
          disabled={mode === "exam"}
        />
      </p>
      <div className="mt-4">
        <WordCountZone
          value={text}
          onChange={update}
          min={200}
          max={300}
          disabled={submitted}
          label="Seu ensaio (200–300 palavras)"
          placeholder="Introdução, desenvolvimento e conclusão — linhas em branco separam parágrafos"
          minH="min-h-72"
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
