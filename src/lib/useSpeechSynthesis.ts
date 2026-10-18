// Síntese de voz (TTS) — PRD §10.1. Hook de browser: o suporte é derivado
// em `useEffect` (nunca em `typeof window` no render — SSR/cliente divergem).

import { useCallback, useEffect, useState } from "react";

import type { Accent } from "@/lib/storage";

export interface UseSpeechSynthesisResult {
  /** null = desconhecido até o efeito rodar no cliente */
  supported: boolean | null;
  /** null = lista de vozes ainda não carregada */
  hasEnglishVoice: boolean | null;
  speaking: boolean;
  /** nome da voz realmente usada na última reprodução (§15 — mostrar a voz) */
  voiceUsed: string | null;
  pickVoice: (accent: Accent) => SpeechSynthesisVoice | null;
  speak: (text: string, rate: number, accent: Accent, onEnd?: () => void) => void;
  cancel: () => void;
}

function normalizeLang(lang: string): string {
  return lang.replace("_", "-").toLowerCase();
}

export function useSpeechSynthesis(): UseSpeechSynthesisResult {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [speaking, setSpeaking] = useState(false);
  const [voiceUsed, setVoiceUsed] = useState<string | null>(null);

  useEffect(() => {
    if (!("speechSynthesis" in window)) {
      setSupported(false);
      return;
    }
    const synth = window.speechSynthesis;
    setSupported(true);
    const readVoices = () => setVoices(synth.getVoices());
    readVoices();
    synth.addEventListener("voiceschanged", readVoices);
    return () => {
      synth.removeEventListener("voiceschanged", readVoices);
      synth.cancel();
    };
  }, []);

  const pickVoice = useCallback(
    (accent: Accent): SpeechSynthesisVoice | null => {
      if (voices.length === 0) return null;
      const wanted = accent.toLowerCase();
      const exact = voices.find((v) => normalizeLang(v.lang) === wanted);
      if (exact) return exact;
      const english = voices.filter((v) => normalizeLang(v.lang).startsWith("en"));
      // Sotaque prioritário primeiro (ex.: pt tem en-GB antes de en-US quando pedido en-GB).
      english.sort((a, b) => {
        const aMatch = normalizeLang(a.lang).startsWith(wanted) ? 0 : 1;
        const bMatch = normalizeLang(b.lang).startsWith(wanted) ? 0 : 1;
        return aMatch - bMatch;
      });
      return english[0] ?? null;
    },
    [voices],
  );

  const speak = useCallback(
    (text: string, rate: number, accent: Accent, onEnd?: () => void) => {
      if (!("speechSynthesis" in window)) return;
      const synth = window.speechSynthesis;
      synth.cancel();
      const voice = pickVoice(accent);
      if (!voice) {
        setVoiceUsed(null);
        setSpeaking(false);
        onEnd?.();
        return;
      }
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.voice = voice;
      utterance.lang = voice.lang;
      utterance.rate = Math.min(Math.max(rate, 0.7), 1.2);
      utterance.onend = () => {
        setSpeaking(false);
        onEnd?.();
      };
      utterance.onerror = () => {
        setSpeaking(false);
        onEnd?.();
      };
      setVoiceUsed(voice.name);
      setSpeaking(true);
      synth.speak(utterance);
    },
    [pickVoice],
  );

  const cancel = useCallback(() => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  const hasEnglishVoice: boolean | null =
    supported === false
      ? false
      : voices.length === 0
        ? null
        : voices.some((v) => normalizeLang(v.lang).startsWith("en"));

  return { supported, hasEnglishVoice, speaking, voiceUsed, pickVoice, speak, cancel };
}
