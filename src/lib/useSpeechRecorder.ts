// Gravação de voz para replay — Motor A — PRD §9.3 (MediaRecorder em
// paralelo ao STT). Hook de browser: suporte derivado em `useEffect`. O
// medidor de nível (AnalyserNode) alimenta o MicLevelMeter e a contagem de
// pausas longas. Tudo fica no dispositivo; nada é enviado.

import { useCallback, useEffect, useRef, useState } from "react";

export type RecorderError = "no-permission" | "unavailable";

export interface UseSpeechRecorderResult {
  /** null = desconhecido até o efeito rodar no cliente */
  supported: boolean | null;
  recording: boolean;
  /** nível 0–1 suavizado, para o medidor visual */
  level: number;
  /** ref do nível (lido por loops sem re-render) */
  levelRef: { current: number };
  /** URL da gravação (blob local) para ouvir depois — null até parar */
  audioUrl: string | null;
  error: RecorderError | null;
  start: () => void;
  stop: () => void;
  reset: () => void;
}

export function useSpeechRecorder(): UseSpeechRecorderResult {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [recording, setRecording] = useState(false);
  const [level, setLevel] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<RecorderError | null>(null);

  const levelRef = useRef(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const urlRef = useRef<string | null>(null);
  const unmountedRef = useRef(false);

  useEffect(() => {
    setSupported(
      typeof navigator !== "undefined" &&
        !!navigator.mediaDevices?.getUserMedia &&
        typeof window.MediaRecorder === "function",
    );
    return () => {
      unmountedRef.current = true;
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      const rec = recorderRef.current;
      if (rec && rec.state !== "inactive") {
        try {
          rec.stop();
        } catch {
          // melhor-esforço no unmount
        }
      }
      streamRef.current?.getTracks().forEach((track) => track.stop());
      void audioCtxRef.current?.close().catch(() => undefined);
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
  }, []);

  const start = useCallback(() => {
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia ||
      typeof window.MediaRecorder !== "function"
    ) {
      setSupported(false);
      return;
    }
    setError(null);
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        if (unmountedRef.current) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        try {
          const ctx = new AudioContext();
          audioCtxRef.current = ctx;
          const source = ctx.createMediaStreamSource(stream);
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 512;
          source.connect(analyser);
          const data = new Uint8Array(analyser.frequencyBinCount);
          const tick = () => {
            analyser.getByteTimeDomainData(data);
            let sum = 0;
            for (let i = 0; i < data.length; i++) {
              const v = ((data[i] ?? 128) - 128) / 128;
              sum += v * v;
            }
            const rms = Math.sqrt(sum / data.length);
            const smoothed = Math.max(rms, levelRef.current * 0.8);
            levelRef.current = Math.min(1, smoothed * 4);
            setLevel(levelRef.current);
            rafRef.current = requestAnimationFrame(tick);
          };
          rafRef.current = requestAnimationFrame(tick);
        } catch {
          // sem AnalyserNode: grava mesmo assim, sem medidor
        }
        try {
          const recorder = new MediaRecorder(stream);
          const chunks: Blob[] = [];
          recorder.ondataavailable = (event) => {
            if (event.data.size > 0) chunks.push(event.data);
          };
          recorder.onstop = () => {
            if (urlRef.current) URL.revokeObjectURL(urlRef.current);
            const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
            urlRef.current = URL.createObjectURL(blob);
            setAudioUrl(urlRef.current);
          };
          recorderRef.current = recorder;
          recorder.start();
          setRecording(true);
        } catch {
          setError("unavailable");
        }
      })
      .catch(() => {
        setError("no-permission");
      });
  }, []);

  const stop = useCallback(() => {
    try {
      const rec = recorderRef.current;
      if (rec && rec.state !== "inactive") rec.stop();
    } catch {
      // melhor-esforço
    }
    setRecording(false);
    setLevel(0);
    levelRef.current = 0;
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    void audioCtxRef.current?.close().catch(() => undefined);
    audioCtxRef.current = null;
  }, []);

  const reset = useCallback(() => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = null;
    setAudioUrl(null);
    setError(null);
  }, []);

  return { supported, recording, level, levelRef, audioUrl, error, start, stop, reset };
}
