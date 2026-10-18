// Reconhecimento de fala (STT) — Motor A — PRD §9.3. Hook de browser: o
// suporte é derivado em `useEffect` (nunca `typeof window` no render — SSR e
// cliente divergem). Resultados interinos ao vivo, tratamento de erro e
// permissão, parada limpa ao trocar de questão (cleanup no unmount).

import { useCallback, useEffect, useRef, useState } from "react";

export type SpeechRecognitionError = "not-supported" | "no-permission" | "network" | "aborted";

interface SRResultItem {
  isFinal: boolean;
  0: { transcript: string };
}

interface SREvent {
  resultIndex: number;
  results: { length: number; [index: number]: SRResultItem };
}

interface SRErrorEvent {
  error?: string;
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SREvent) => void) | null;
  onerror: ((event: SRErrorEvent) => void) | null;
  onend: (() => void) | null;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getConstructor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export interface UseSpeechRecognitionResult {
  /** null = desconhecido até o efeito rodar no cliente */
  supported: boolean | null;
  listening: boolean;
  /** transcrição parcial da fala em andamento */
  interim: string;
  /** transcrição final acumulada da tentativa */
  finalText: string;
  error: SpeechRecognitionError | null;
  start: () => void;
  stop: () => void;
  reset: () => void;
}

export function useSpeechRecognition(lang: string): UseSpeechRecognitionResult {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [finalText, setFinalText] = useState("");
  const [error, setError] = useState<SpeechRecognitionError | null>(null);

  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const finalRef = useRef("");
  const wantRef = useRef(false);
  const fatalRef = useRef(false);

  useEffect(() => {
    setSupported(getConstructor() !== null);
    return () => {
      // Parada/limpeza ao trocar de questão (PRD §9.3).
      wantRef.current = false;
      try {
        recRef.current?.abort();
      } catch {
        // abort após unmount é melhor-esforço
      }
      recRef.current = null;
    };
  }, []);

  const start = useCallback(() => {
    const Ctor = getConstructor();
    if (!Ctor) {
      setSupported(false);
      setError("not-supported");
      return;
    }
    try {
      const rec = new Ctor();
      rec.lang = lang;
      rec.continuous = true;
      rec.interimResults = true;
      rec.onresult = (event) => {
        let interimText = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (!result) continue;
          if (result.isFinal) {
            finalRef.current = `${finalRef.current} ${result[0].transcript}`.trim();
          } else {
            interimText += result[0].transcript;
          }
        }
        setFinalText(finalRef.current);
        setInterim(interimText);
      };
      rec.onerror = (event) => {
        const code = event.error;
        if (code === "not-allowed" || code === "service-not-allowed") {
          fatalRef.current = true;
          setError("no-permission");
        } else if (code === "network") {
          fatalRef.current = true;
          setError("network");
        }
        // "aborted"/"no-speech" fazem parte do controle normal — não são erros.
      };
      rec.onend = () => {
        // Chrome encerra cedo; reinicia enquanto o aluno não parou e não houve
        // erro fatal (permissão/rede). Sem isso a transcrição se perde.
        if (wantRef.current && !fatalRef.current) {
          try {
            rec.start();
            return;
          } catch {
            // já iniciado — segue
          }
        }
        setListening(false);
      };
      recRef.current = rec;
      finalRef.current = "";
      fatalRef.current = false;
      setFinalText("");
      setInterim("");
      setError(null);
      wantRef.current = true;
      setListening(true);
      rec.start();
    } catch {
      setError("not-supported");
      setListening(false);
    }
  }, [lang]);

  const stop = useCallback(() => {
    wantRef.current = false;
    try {
      recRef.current?.stop();
    } catch {
      // stop após abort é melhor-esforço
    }
    setListening(false);
  }, []);

  const reset = useCallback(() => {
    finalRef.current = "";
    setFinalText("");
    setInterim("");
    setError(null);
  }, []);

  return { supported, listening, interim, finalText, error, start, stop, reset };
}
