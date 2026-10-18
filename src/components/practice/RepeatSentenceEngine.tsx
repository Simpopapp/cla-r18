// Repeat Sentence — Motor A — PRD §10.2/§9.3. Áudio 1× (TTS = o próprio
// transcript), fala ≤ 15 s, correção por alinhamento; transcript só aparece
// no resultado (nunca antes — §10.1).

import { useCallback, useEffect, useRef, useState } from "react";

import { AudioPlayOnce } from "./AudioPlayOnce";
import { buildSpeakingResult } from "./speakingResult";
import { SpeakingControls } from "./SpeakingControls";
import type { EngineProps } from "./engine";
import { useAppState } from "@/lib/useAppState";
import { useSpeakingAttempt } from "@/lib/useSpeakingAttempt";
import {
  alignSpeech,
  countAdjacentRepetitions,
  fluencyProxy,
  type AlignmentResult,
} from "@/lib/pte/speaking";
import { PlusText } from "@/components/plus/PlusText";
import { plusEnabled } from "@/lib/plus/settings";
import type { RepeatSentenceData } from "@/lib/pte/types";

const STATUS_CLASS: Record<AlignmentResult["words"][number]["status"], string> = {
  hit: "text-foreground",
  missed: "text-destructive line-through",
  substituted: "text-warning-foreground underline decoration-dotted",
  moved: "text-warning-foreground underline",
};

export function RepeatSentenceEngine({
  question,
  onSubmit,
  submitted,
  registerAutoSubmit,
  mode = "practice",
}: EngineProps) {
  const data = question.data as RepeatSentenceData;
  const { settings } = useAppState();
  const speaking = useSpeakingAttempt(settings.accent);
  const submittedRef = useRef(false);
  const [graded, setGraded] = useState<AlignmentResult | null>(null);
  const [captured, setCaptured] = useState(false);

  const finish = useCallback(() => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    const m = speaking.stopAndCollect();
    const ok = m.sttSupported && !m.sttError && m.spokenText.length > 0;
    const g = ok ? alignSpeech(data.transcript, m.spokenText) : null;
    setGraded(g);
    setCaptured(ok);
    const fluency = fluencyProxy({
      wpm: m.wpm,
      longPauses: m.longPauses,
      repetitions: g ? g.repetitions : countAdjacentRepetitions(m.spokenText),
    });
    onSubmit({
      result: buildSpeakingResult({
        content: g ? g.content : null,
        fluency,
        noScoreReason: ok
          ? undefined
          : m.sttSupported
            ? "Sem nota: nenhuma fala foi capturada na tentativa."
            : "Treino sem nota: o reconhecimento de voz não ficou disponível — ouça a gravação e a frase original.",
        details: g
          ? [
              `Palavras corretas: ${g.words.filter((w) => w.status === "hit").length} de ${g.total}.` +
                ` Extras: ${g.extras} (−0,25 cada) · Repetições: ${g.repetitions} (−0,1 cada).`,
            ]
          : [],
      }),
      tags: ok ? [] : ["sem-stt"],
      metrics: {
        longPauses: m.longPauses,
        ...(m.wpm !== null ? { wpm: m.wpm } : {}),
        ...(g ? { extras: g.extras, repetitions: g.repetitions } : {}),
      },
    });
  }, [data.transcript, onSubmit, speaking]);

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
      <p className="text-sm text-muted-foreground">
        Ouça a frase (1×) e repita exatamente o que ouviu.
      </p>
      <div className="mt-2">
        <AudioPlayOnce
          text={data.transcript}
          canReplay={settings.allowReplay || submitted}
          label="Ouvir a frase (1×)"
        />
      </div>
      <SpeakingControls attempt={speaking} onToggle={toggle} disabled={submitted} />
      {graded ? (
        <div className="mt-4" data-testid="rs-compare">
          <p className="text-sm font-medium text-foreground">Frase correta:</p>
          <p className="mt-1 text-sm leading-relaxed">
            {graded.words.map((word, index) => (
              <span key={`${index}-${word.word}`} className={`${STATUS_CLASS[word.status]} mr-1`}>
                {word.word}
              </span>
            ))}
          </p>
        </div>
      ) : null}
      {graded && mode !== "exam" && plusEnabled(settings.plus) ? (
        <div className="mt-3 border-t border-border pt-3">
          <PlusText
            text={data.transcript}
            type="repeat_sentence"
            field="transcript"
            phase="post"
            qid={question.id}
          />
        </div>
      ) : null}
    </div>
  );
}
