// Respond to a Situation — Motor A — PRD §10.2/§9.3. A situação é mostrada
// como texto (como na prova) com áudio opcional; prep 10 s; conteúdo =
// cobertura de `keywords` (referência < 4 → "sem nota").

import { useCallback, useEffect, useRef, useState } from "react";

import { PlusText } from "@/components/plus/PlusText";
import { buildSpeakingResult } from "./speakingResult";
import { SpeakingControls } from "./SpeakingControls";
import type { EngineProps } from "./engine";
import { Button } from "@/components/ui/button";
import { TtsVoiceNote } from "./TtsVoiceNote";
import { useAppState } from "@/lib/useAppState";
import { useSpeakingAttempt } from "@/lib/useSpeakingAttempt";
import { useSpeechSynthesis } from "@/lib/useSpeechSynthesis";
import { contentFromKeywords, countAdjacentRepetitions, fluencyProxy } from "@/lib/pte/speaking";
import type { RtsData } from "@/lib/pte/types";

export function RtsEngine({
  question,
  onSubmit,
  submitted,
  registerAutoSubmit,
  mode,
}: EngineProps) {
  const data = question.data as RtsData;
  const { settings } = useAppState();
  const speaking = useSpeakingAttempt(settings.accent);
  const synth = useSpeechSynthesis();
  const submittedRef = useRef(false);
  const [missing, setMissing] = useState<string[] | null>(null);
  const [captured, setCaptured] = useState(false);

  const finish = useCallback(() => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    synth.cancel();
    const m = speaking.stopAndCollect();
    const ok = m.sttSupported && !m.sttError && m.spokenText.length > 0;
    const coverage = ok ? contentFromKeywords(data.keywords ?? [], m.spokenText) : null;
    setMissing(coverage ? coverage.missing : null);
    setCaptured(ok);
    const fluency = fluencyProxy({
      wpm: m.wpm,
      longPauses: m.longPauses,
      repetitions: countAdjacentRepetitions(m.spokenText),
    });
    onSubmit({
      result: buildSpeakingResult({
        content: coverage ? coverage.content : null,
        fluency,
        noScoreReason: ok
          ? coverage
            ? undefined
            : "Referência insuficiente — sem nota: esta questão tem menos de 4 palavras-chave no banco."
          : m.sttSupported
            ? "Sem nota: nenhuma fala foi capturada na tentativa."
            : "Treino sem nota: o reconhecimento de voz não ficou disponível — ouça a gravação e avalie você mesmo.",
        details: coverage
          ? [
              coverage.missing.length > 0
                ? `Palavras-chave não mencionadas: ${coverage.missing.slice(0, 5).join(" · ")}${coverage.missing.length > 5 ? "…" : ""}`
                : "Todas as palavras-chave mencionadas.",
            ]
          : [],
      }),
      tags: ok ? [] : ["sem-stt"],
      metrics: {
        longPauses: m.longPauses,
        ...(m.wpm !== null ? { wpm: m.wpm } : {}),
        ...(coverage ? { missingKeywords: coverage.missing.length } : {}),
      },
    });
  }, [data.keywords, onSubmit, speaking, synth]);

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
      <p className="text-base leading-relaxed text-foreground sm:text-lg">
        <PlusText
          text={data.scenario}
          type="rts"
          field="scenario"
          phase="pre"
          qid={question.id}
          disabled={mode === "exam"}
        />
      </p>
      {!submitted ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={!synth.supported || synth.hasEnglishVoice === false}
            onClick={() =>
              synth.speaking
                ? synth.cancel()
                : synth.speak(data.scenario, settings.modelRate, settings.accent)
            }
            className="min-h-11"
          >
            {synth.speaking ? "Parar" : "Ouvir a situação"}
          </Button>
          <TtsVoiceNote voiceUsed={synth.voiceUsed} hasEnglishVoice={synth.hasEnglishVoice} />
        </div>
      ) : null}
      <p className="mt-2 text-sm text-muted-foreground">
        Responda à situação em voz alta (até 40 s) — depois de 10 s de preparação.
      </p>
      <SpeakingControls attempt={speaking} onToggle={toggle} disabled={submitted} />
      {missing ? (
        <p className="mt-3 text-sm text-muted-foreground" data-testid="rts-missing">
          {missing.length > 0
            ? `Palavras-chave que ficaram de fora: ${missing.slice(0, 5).join(" · ")}`
            : "Cobertura completa das palavras-chave."}
        </p>
      ) : null}
    </div>
  );
}
