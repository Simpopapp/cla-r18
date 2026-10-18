// Player de áudio nativo que toca 1× — PRD §10.1. Repetir só com
// `allowReplay` ligado nos Ajustes ou após o resultado (canReplay).
// TTS via Web Speech API; bipe sintético opcional (lst_smw, §5.1).

import { useState } from "react";

import { useExamPromptEnd } from "./ExamPrompt";
import { TtsVoiceNote } from "./TtsVoiceNote";
import { Button } from "@/components/ui/button";
import { useAppState } from "@/lib/useAppState";
import { useSpeechSynthesis } from "@/lib/useSpeechSynthesis";
import { usePracticeMode } from "./PracticeMode";
import { claimExamAudio } from "@/lib/pte/exam";
import { mutateAppState } from "@/lib/useAppState";

/** Bipe sintético curto (Web Audio) — criado dentro do gesto do usuário. */
function playBeep(): void {
  if (typeof window === "undefined") return;
  try {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
    osc.onended = () => void ctx.close();
  } catch {
    // sem Web Audio: o bipe é melhor-esforço
  }
}

export function AudioPlayOnce({
  text,
  beep = false,
  canReplay,
  label = "Ouvir o áudio",
}: {
  text: string;
  beep?: boolean;
  /** allowReplay ligado ou resultado já exibido */
  canReplay: boolean;
  label?: string;
}) {
  const { settings, draft } = useAppState();
  const mode = usePracticeMode();
  const qid = draft?.ids[draft.cursor];
  const { supported, hasEnglishVoice, speaking, voiceUsed, speak, cancel } = useSpeechSynthesis();
  const [played, setPlayed] = useState(false);
  // Fidelidade F7: no simulado, o fim do enunciado em áudio arma o prazo.
  const notifyPromptEnd = useExamPromptEnd();

  const consumed = mode === "exam" ? !!qid && !!draft?.exam?.played.includes(qid) : played;
  const replay = mode !== "exam" && canReplay;
  const disabled = !supported || hasEnglishVoice === false || (consumed && !replay);
  const play = () => {
    if (consumed && !replay) return;
    if (mode === "exam" && qid) mutateAppState((s) => claimExamAudio(s, qid));
    if (speaking) {
      cancel();
      if (mode === "exam") notifyPromptEnd?.();
      return;
    }
    setPlayed(true);
    speak(text, settings.modelRate, settings.accent, () => {
      if (beep) playBeep();
      if (mode === "exam") notifyPromptEnd?.();
    });
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          onClick={play}
          disabled={disabled}
          className="min-h-11"
          aria-label={consumed && !replay ? "Áudio já reproduzido (1×)" : label}
        >
          {consumed && !replay
            ? "Áudio já reproduzido (1×)"
            : speaking
              ? "Parar"
              : played
                ? `Repetir (1× na prova)`
                : label}
        </Button>
        {consumed && !replay ? (
          <span className="text-xs text-muted-foreground">
            {mode === "exam"
              ? "Reprodução única no simulado."
              : "o áudio toca 1×, como na prova — repetir só após o resultado"}
          </span>
        ) : null}
      </div>
      <TtsVoiceNote voiceUsed={voiceUsed} hasEnglishVoice={hasEnglishVoice} />
    </div>
  );
}
