// Pack studie-plus — botão de pronúncia do inglês (PRD §13.1.3, §13.2).
// Compacto 44×44; fala SEMPRE o inglês original (sotaque/velocidade dos ajustes);
// oculto sem voz inglesa; cancela ao desmontar (o hook cancela no unmount).

import { useEffect } from "react";

import { useAppState } from "@/lib/useAppState";
import { useSpeechSynthesis } from "@/lib/useSpeechSynthesis";

export function PlusSpeakButton({
  text,
  label,
  onSpeakingChange,
}: {
  text: string;
  label: string;
  onSpeakingChange?: ((speaking: boolean) => void) | undefined;
}) {
  const { settings } = useAppState();
  const { supported, hasEnglishVoice, speaking, speak, cancel } = useSpeechSynthesis();

  useEffect(() => {
    onSpeakingChange?.(speaking);
  }, [speaking, onSpeakingChange]);

  // interruptor do aluno desligado, sem suporte ou sem voz inglesa → oculto
  if (!settings.plus.plusAudio) return null;
  if (supported === false || hasEnglishVoice === false) return null;

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      data-plus-speak
      onClick={(event) => {
        event.stopPropagation();
        if (speaking) {
          cancel();
        } else {
          speak(text, settings.modelRate, settings.accent);
        }
      }}
      className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-border bg-card text-foreground hover:bg-muted"
    >
      <span aria-hidden="true">{speaking ? "⏹" : "🔊"}</span>
    </button>
  );
}
