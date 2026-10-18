// Aviso da voz TTS realmente usada — PRD §10.1, §15 ("mostrar a voz usada").

import { Volume2 } from "lucide-react";

export function TtsVoiceNote({
  voiceUsed,
  hasEnglishVoice,
}: {
  voiceUsed: string | null;
  hasEnglishVoice: boolean | null;
}) {
  if (hasEnglishVoice === false) {
    return (
      <p
        role="note"
        className="mt-2 rounded-lg border border-warning/50 bg-warning/10 px-3 py-2 text-sm text-warning-foreground"
      >
        Este navegador não tem voz em inglês instalada — instale uma voz do sistema (ex.: en-AU,
        en-US ou en-GB) para ouvir as questões.
      </p>
    );
  }
  if (!voiceUsed) return null;
  return (
    <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <Volume2 aria-hidden="true" className="size-3.5" />
      Voz usada: {voiceUsed}
    </p>
  );
}
