// Summarize Group Discussion — Motor A — PRD §10.2/§9.3. Áudio da discussão
// 1× com vozes/pitch distintos por falante (TTS nativo); transcript só no
// resultado; conteúdo = cobertura de `keywords`.

import { useCallback, useEffect, useRef, useState } from "react";

import { buildSpeakingResult } from "./speakingResult";
import { SpeakingControls } from "./SpeakingControls";
import { TtsVoiceNote } from "./TtsVoiceNote";
import { useExamPromptEnd } from "./ExamPrompt";
import type { EngineProps } from "./engine";
import { Button } from "@/components/ui/button";
import { useAppState } from "@/lib/useAppState";
import { useSpeakingAttempt } from "@/lib/useSpeakingAttempt";
import { useSpeechSynthesis } from "@/lib/useSpeechSynthesis";
import { contentFromKeywords, countAdjacentRepetitions, fluencyProxy } from "@/lib/pte/speaking";
import type { SgdData } from "@/lib/pte/types";
import { claimExamAudio } from "@/lib/pte/exam";
import { mutateAppState } from "@/lib/useAppState";

export function SgdEngine({
  question,
  onSubmit,
  submitted,
  registerAutoSubmit,
  mode = "practice",
}: EngineProps) {
  const data = question.data as SgdData;
  const { settings, draft } = useAppState();
  const consumed = mode === "exam" && !!draft?.exam?.played.includes(question.id);
  const speaking = useSpeakingAttempt(settings.accent);
  const synth = useSpeechSynthesis();
  // Fidelidade F7: no simulado, o fim da discussão em áudio arma o prazo.
  const notifyPromptEnd = useExamPromptEnd();
  const submittedRef = useRef(false);
  const playedRef = useRef(false);
  const [currentTurn, setCurrentTurn] = useState<number | null>(null);
  const [missing, setMissing] = useState<string[] | null>(null);
  const [captured, setCaptured] = useState(false);

  // TTS multi-voz: cada falante usa uma voz inglesa diferente (quando o
  // sistema tem mais de uma) e pitch distinto — declarado honestamente.
  const playFrom = useCallback(
    (index: number) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
      const turn = data.turns[index];
      if (!turn) {
        setCurrentTurn(null);
        if (mode === "exam") notifyPromptEnd?.();
        return;
      }
      setCurrentTurn(index);
      const utterance = new SpeechSynthesisUtterance(turn.text);
      const voice = synth.pickVoice(settings.accent);
      if (voice) {
        utterance.voice = voice;
        utterance.lang = voice.lang;
      }
      utterance.rate = Math.min(Math.max(settings.modelRate, 0.7), 1.2);
      utterance.pitch = 0.85 + (index % 3) * 0.15;
      utterance.onend = () => playFrom(index + 1);
      utterance.onerror = () => {
        setCurrentTurn(null);
        // F7: uma falha na reprodução também encerra a fase de áudio.
        if (mode === "exam") notifyPromptEnd?.();
      };
      window.speechSynthesis.speak(utterance);
    },
    [data.turns, settings.accent, settings.modelRate, synth, mode, notifyPromptEnd],
  );

  const playDiscussion = () => {
    if (consumed) return;
    if (mode === "exam") mutateAppState((s) => claimExamAudio(s, question.id));
    if (playedRef.current && !(settings.allowReplay || submittedRef.current)) return;
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    playedRef.current = true;
    playFrom(0);
  };

  const stopDiscussion = useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    setCurrentTurn(null);
    // Fidelidade F7: interromper o enunciado encerra a fase de áudio.
    if (mode === "exam") notifyPromptEnd?.();
  }, [mode, notifyPromptEnd]);

  const finish = useCallback(() => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    stopDiscussion();
    const m = speaking.stopAndCollect();
    const ok = m.sttSupported && !m.sttError && m.spokenText.length > 0;
    const coverage = ok ? contentFromKeywords(data.keywords, m.spokenText) : null;
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
            : "Treino sem nota: o reconhecimento de voz não ficou disponível — ouça a gravação e o áudio da discussão.",
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
  }, [data.keywords, onSubmit, speaking, stopDiscussion]);

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
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          disabled={consumed}
          onClick={playDiscussion}
          className="min-h-11"
          data-testid="sgd-play"
        >
          Ouvir a discussão (1×)
        </Button>
        {currentTurn !== null ? (
          <Button type="button" variant="outline" onClick={stopDiscussion} className="min-h-11">
            Parar
          </Button>
        ) : null}
      </div>
      <p aria-live="polite" className="mt-1 text-sm text-muted-foreground">
        {currentTurn !== null
          ? `Falando: ${data.turns[currentTurn]?.speaker ?? ""}`
          : "Discussão com múltiplas vozes (o sistema alterna vozes e tom — a qualidade varia por dispositivo)."}
      </p>
      <TtsVoiceNote voiceUsed={synth.voiceUsed} hasEnglishVoice={synth.hasEnglishVoice} />
      <p className="mt-2 text-sm text-muted-foreground">
        Resuma os pontos de vista da discussão em até 2 minutos — depois de 10 s de preparação.
      </p>
      <SpeakingControls attempt={speaking} onToggle={toggle} disabled={submitted} />
      {missing ? (
        <p className="mt-3 text-sm text-muted-foreground" data-testid="sgd-missing">
          {missing.length > 0
            ? `Palavras-chave que ficaram de fora: ${missing.slice(0, 5).join(" · ")}`
            : "Cobertura completa das palavras-chave."}
        </p>
      ) : null}
      {submitted ? (
        <details className="mt-3">
          <summary className="cursor-pointer text-sm font-medium text-foreground">
            Ver a transcrição da discussão
          </summary>
          <ul className="mt-2 space-y-1 text-sm leading-relaxed text-muted-foreground">
            {data.turns.map((turn, index) => (
              <li key={index}>
                <span className="font-medium text-foreground">{turn.speaker}:</span> {turn.text}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}
