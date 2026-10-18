// Read Aloud — Motor A — PRD §10.2/§9.3. Layout próprio: texto grande para
// leitura, modelo TTS opcional, prep/fala cronometrados pelo shell, correção
// por alinhamento (LCS) com penalidades de extras e repetições.

import { useCallback, useEffect, useRef, useState } from "react";

import { buildSpeakingResult } from "./speakingResult";
import { SpeakingControls } from "./SpeakingControls";
import type { EngineProps } from "./engine";
import { Button } from "@/components/ui/button";
import { TtsVoiceNote } from "./TtsVoiceNote";
import { PlusText } from "@/components/plus/PlusText";
import { useAppState } from "@/lib/useAppState";
import { useSpeakingAttempt } from "@/lib/useSpeakingAttempt";
import { useSpeechSynthesis } from "@/lib/useSpeechSynthesis";
import {
  alignSpeech,
  countAdjacentRepetitions,
  fluencyProxy,
  type AlignmentResult,
} from "@/lib/pte/speaking";
import type { ReadAloudData } from "@/lib/pte/types";

const STATUS_CLASS: Record<AlignmentResult["words"][number]["status"], string> = {
  hit: "text-foreground",
  missed: "text-destructive line-through",
  substituted: "text-warning-foreground underline decoration-dotted",
  moved: "text-warning-foreground underline",
};

export function ReadAloudEngine({
  question,
  onSubmit,
  submitted,
  registerAutoSubmit,
  mode = "practice",
}: EngineProps) {
  const data = question.data as ReadAloudData;
  const { settings } = useAppState();
  const speaking = useSpeakingAttempt(settings.accent);
  const synth = useSpeechSynthesis();
  const submittedRef = useRef(false);
  const [graded, setGraded] = useState<AlignmentResult | null>(null);
  const [captured, setCaptured] = useState(false);

  const finish = useCallback(() => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    synth.cancel();
    const m = speaking.stopAndCollect();
    const ok = m.sttSupported && !m.sttError && m.spokenText.length > 0;
    const g = ok ? alignSpeech(data.text, m.spokenText) : null;
    setGraded(g);
    setCaptured(ok);
    const fluency = fluencyProxy({
      wpm: m.wpm,
      longPauses: m.longPauses,
      repetitions: g ? g.repetitions : countAdjacentRepetitions(m.spokenText),
    });
    const details = g
      ? [
          `Palavras corretas: ${g.words.filter((w) => w.status === "hit").length} de ${g.total}.` +
            ` Extras: ${g.extras} (−${g.extras} × 0,25) · Repetições: ${g.repetitions} (−${g.repetitions} × 0,1).`,
        ]
      : [];
    onSubmit({
      result: buildSpeakingResult({
        content: g ? g.content : null,
        fluency,
        noScoreReason: ok
          ? undefined
          : m.sttSupported
            ? "Sem nota: nenhuma fala foi capturada na tentativa."
            : "Treino sem nota: o reconhecimento de voz não ficou disponível — ouça a gravação e compare com o texto.",
        details,
      }),
      tags: ok ? [] : ["sem-stt"],
      metrics: {
        longPauses: m.longPauses,
        ...(m.wpm !== null ? { wpm: m.wpm } : {}),
        ...(g ? { extras: g.extras, repetitions: g.repetitions } : {}),
      },
    });
  }, [data.text, onSubmit, speaking, synth]);

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
      <p className="font-serif text-xl leading-relaxed text-foreground sm:text-2xl">
        <PlusText
          text={data.text}
          type="read_aloud"
          field="text"
          phase="pre"
          disabled={mode === "exam"}
        />
      </p>
      {!submitted && mode !== "exam" ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={!synth.supported || synth.hasEnglishVoice === false}
            onClick={() =>
              synth.speaking
                ? synth.cancel()
                : synth.speak(data.text, settings.modelRate, settings.accent)
            }
            className="min-h-11"
          >
            {synth.speaking ? "Parar modelo" : "Ouvir modelo"}
          </Button>
          <TtsVoiceNote voiceUsed={synth.voiceUsed} hasEnglishVoice={synth.hasEnglishVoice} />
        </div>
      ) : null}
      <SpeakingControls attempt={speaking} onToggle={toggle} disabled={submitted} />
      {graded ? (
        <div className="mt-4" data-testid="ra-compare">
          <p className="text-sm font-medium text-foreground">Comparação com o texto:</p>
          <p className="mt-1 text-sm leading-relaxed">
            {graded.words.map((word, index) => (
              <span key={`${index}-${word.word}`} className={`${STATUS_CLASS[word.status]} mr-1`}>
                {word.word}
              </span>
            ))}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            riscado = omitida/errada · pontilhado = som parecido (meio crédito) · sublinhado = fora
            de posição (meio crédito)
          </p>
        </div>
      ) : null}
      {submitted && !captured && speaking.audioUrl ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Ouça a gravação acima e compare com o texto — treino sem nota.
        </p>
      ) : null}
    </div>
  );
}
