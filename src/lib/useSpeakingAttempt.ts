// Tentativa de fala — Motor A — PRD §9.3. Junta STT (reconhecimento) e
// MediaRecorder (replay) + métricas: duração, wpm e pausas longas (nível
// baixo por ≥ 3 s). Suporte derivado em efeito; limpeza ao trocar de questão.

import { useCallback, useEffect, useRef, useState } from "react";

import type { Accent } from "@/lib/storage";
import { useSpeechRecognition, type SpeechRecognitionError } from "@/lib/useSpeechRecognition";
import { useSpeechRecorder, type RecorderError } from "@/lib/useSpeechRecorder";

/** nível abaixo disso por LONG_PAUSE_MS conta como pausa longa */
const LEVEL_QUIET_THRESHOLD = 0.06;
const LEVEL_POLL_MS = 250;

export interface SpeakingMetrics {
  /** transcrição final + parcial acumulada (o que o reconhecedor ouviu) */
  spokenText: string;
  seconds: number;
  /** palavras por minuto; null = sem transcrição suficiente */
  wpm: number | null;
  longPauses: number;
  /** URL da gravação local (replay) — pode ainda estar chegando ao parar */
  audioUrl: string | null;
  sttSupported: boolean;
  sttError: SpeechRecognitionError | null;
  recorderError: RecorderError | null;
}

export interface UseSpeakingAttemptResult {
  recording: boolean;
  /** nível 0–1 para o medidor visual */
  level: number;
  interim: string;
  finalText: string;
  sttSupported: boolean | null;
  sttError: SpeechRecognitionError | null;
  recorderSupported: boolean | null;
  recorderError: RecorderError | null;
  audioUrl: string | null;
  start: () => void;
  /** para os dois fluxos e devolve as métricas da tentativa */
  stopAndCollect: () => SpeakingMetrics;
  reset: () => void;
}

export function useSpeakingAttempt(accent: Accent): UseSpeakingAttemptResult {
  const rec = useSpeechRecognition(accent);
  const recorder = useSpeechRecorder();
  const [recording, setRecording] = useState(false);

  const startedAtRef = useRef<number | null>(null);
  const pauseRef = useRef({ quietMs: 0, longPauses: 0 });
  const recRef = useRef(rec);
  recRef.current = rec;

  // Detecção de pausas longas: nível baixo por ≥ 3 s enquanto grava.
  useEffect(() => {
    if (!recorder.recording) return;
    const interval = window.setInterval(() => {
      if (recorder.levelRef.current < LEVEL_QUIET_THRESHOLD) {
        pauseRef.current.quietMs += LEVEL_POLL_MS;
        if (pauseRef.current.quietMs >= 3000) {
          pauseRef.current.longPauses += 1;
          pauseRef.current.quietMs = 0;
        }
      } else {
        pauseRef.current.quietMs = 0;
      }
    }, LEVEL_POLL_MS);
    return () => window.clearInterval(interval);
  }, [recorder.recording, recorder.levelRef]);

  const start = useCallback(() => {
    pauseRef.current = { quietMs: 0, longPauses: 0 };
    startedAtRef.current = Date.now();
    rec.reset();
    recorder.reset();
    rec.start();
    recorder.start();
    setRecording(true);
  }, [rec, recorder]);

  const stopAndCollect = useCallback((): SpeakingMetrics => {
    recRef.current.stop();
    recorder.stop();
    setRecording(false);
    const seconds = startedAtRef.current !== null ? (Date.now() - startedAtRef.current) / 1000 : 0;
    const spokenText = `${recRef.current.finalText} ${recRef.current.interim}`.trim();
    const words = spokenText.split(/\s+/).filter(Boolean).length;
    const minutes = seconds / 60;
    const wpm = minutes > 0 && words > 0 ? Math.round(words / minutes) : null;
    return {
      spokenText,
      seconds,
      wpm,
      longPauses: pauseRef.current.longPauses,
      audioUrl: recorder.audioUrl,
      sttSupported: recRef.current.supported === true,
      sttError: recRef.current.error,
      recorderError: recorder.error,
    };
  }, [recorder]);

  const reset = useCallback(() => {
    rec.reset();
    recorder.reset();
    startedAtRef.current = null;
    pauseRef.current = { quietMs: 0, longPauses: 0 };
    setRecording(false);
  }, [rec, recorder]);

  // Parada/limpeza ao trocar de questão (PRD §9.3): os hooks internos já
  // abortam STT/gravação no unmount; aqui só encerramos o estado de gravação.
  useEffect(() => {
    return () => {
      recRef.current.stop();
      recorder.stop();
    };
    // recorder é estável (useCallback vazio de deps de estado de leitura)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    recording,
    level: recorder.level,
    interim: rec.interim,
    finalText: rec.finalText,
    sttSupported: rec.supported,
    sttError: rec.error,
    recorderSupported: recorder.supported,
    recorderError: recorder.error,
    audioUrl: recorder.audioUrl,
    start,
    stopAndCollect,
    reset,
  };
}
