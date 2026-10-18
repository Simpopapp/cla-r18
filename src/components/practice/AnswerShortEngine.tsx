// Answer Short Question — Motor A — PRD §9.2/§9.3. Áudio 1× (a pergunta é
// só áudio), resposta reconhecida ∈ `answers` (normalizada, sinônimos) →
// 100, senão 0; hesitação/vazio explicado no painel.

import { useCallback, useEffect, useRef, useState } from "react";

import { AudioPlayOnce } from "./AudioPlayOnce";
import { buildSpeakingResult } from "./speakingResult";
import { SpeakingControls } from "./SpeakingControls";
import type { EngineProps } from "./engine";
import { useAppState } from "@/lib/useAppState";
import { useSpeakingAttempt } from "@/lib/useSpeakingAttempt";
import { answerShortMatch, countAdjacentRepetitions, fluencyProxy } from "@/lib/pte/speaking";
import type { AnswerShortData } from "@/lib/pte/types";

export function AnswerShortEngine({
  question,
  onSubmit,
  submitted,
  registerAutoSubmit,
}: EngineProps) {
  const data = question.data as AnswerShortData;
  const { settings } = useAppState();
  const speaking = useSpeakingAttempt(settings.accent);
  const submittedRef = useRef(false);
  const [captured, setCaptured] = useState(false);
  const [correct, setCorrect] = useState(false);

  const finish = useCallback(() => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    const m = speaking.stopAndCollect();
    const ok = m.sttSupported && !m.sttError && m.spokenText.length > 0;
    const hit = ok ? answerShortMatch(m.spokenText, data.answers) : false;
    setCorrect(ok ? hit : false);
    setCaptured(ok);
    const fluency = fluencyProxy({
      wpm: m.wpm,
      longPauses: m.longPauses,
      repetitions: countAdjacentRepetitions(m.spokenText),
    });
    onSubmit({
      result: buildSpeakingResult({
        content: ok ? (hit ? 100 : 0) : null,
        fluency,
        noScoreReason: ok
          ? undefined
          : m.sttSupported
            ? "Sem nota: nenhuma resposta foi capturada — hesitação ou silêncio."
            : "Treino sem nota: o reconhecimento de voz não ficou disponível — ouça a gravação e compare com a resposta.",
        details: ok
          ? [
              hit
                ? "A resposta reconhecida está entre as respostas aceitas."
                : "A resposta reconhecida não corresponde às respostas aceitas.",
            ]
          : [],
      }),
      tags: ok ? [] : ["sem-stt"],
      metrics: {
        longPauses: m.longPauses,
        ...(m.wpm !== null ? { wpm: m.wpm } : {}),
      },
    });
  }, [data.answers, onSubmit, speaking]);

  useEffect(() => {
    registerAutoSubmit(finish);
    return () => registerAutoSubmit(null);
  }, [finish, registerAutoSubmit]);

  const toggle = () => {
    if (speaking.recording) finish();
    else speaking.start();
  };

  return (
    <div>
      <AudioPlayOnce
        text={data.question}
        canReplay={settings.allowReplay || submitted}
        label="Ouvir a pergunta (1×)"
      />
      <p className="mt-2 text-sm text-muted-foreground">
        Responda em uma palavra ou expressão curta (≤ 10 s).
      </p>
      <SpeakingControls attempt={speaking} onToggle={toggle} disabled={submitted} />
      {submitted ? (
        <p className="mt-3 text-sm text-foreground" data-testid="as-answer">
          {correct ? "Correto!" : `Resposta(s) aceita(s): ${data.answers.join(", ")}.`}
        </p>
      ) : null}
    </div>
  );
}
