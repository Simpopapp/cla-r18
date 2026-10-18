// Controles de gravação compartilhados dos 7 tipos de fala — PRD §10.1/§9.3.
// Aviso de microfone (1ª vez), botão gravar/parar com medidor de nível,
// transcrição interina ao vivo, mensagens de erro/permissão e replay da
// própria voz (MediaRecorder). Sem STT/permissão → treino sem nota (D23).

import { Mic, Square } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { UseSpeakingAttemptResult } from "@/lib/useSpeakingAttempt";

import { MicLevelMeter } from "./MicLevelMeter";
import { MicNotice } from "./MicNotice";

const STT_MESSAGES: Record<string, string> = {
  "not-supported":
    "Este navegador não oferece reconhecimento de voz — treino sem nota: grave e ouça a sua resposta.",
  "no-permission":
    "Permissão do microfone negada — treino sem nota. Permita o microfone para receber avaliação de conteúdo.",
  network:
    "O reconhecimento de voz falhou por rede — treino sem nota; a gravação continua disponível.",
  aborted: "O reconhecimento foi interrompido — tente gravar novamente.",
};

export function SpeakingControls({
  attempt,
  onToggle,
  disabled = false,
  disabledReason,
}: {
  attempt: UseSpeakingAttemptResult;
  /** grava/para — o motor dono da questão decide e corrige ao parar */
  onToggle: () => void;
  disabled?: boolean;
  disabledReason?: string;
}) {
  const sttMessage = attempt.sttError ? STT_MESSAGES[attempt.sttError] : null;
  return (
    <div className="mt-4">
      <MicNotice />
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Button
          type="button"
          onClick={onToggle}
          data-testid="mic-record"
          disabled={disabled}
          aria-pressed={attempt.recording}
          className="min-h-11"
        >
          {attempt.recording ? (
            <>
              <Square aria-hidden="true" className="size-4" /> Parar
            </>
          ) : (
            <>
              <Mic aria-hidden="true" className="size-4" /> Gravar resposta
            </>
          )}
        </Button>
        <MicLevelMeter level={attempt.level} active={attempt.recording} />
        {disabled && disabledReason ? (
          <span className="text-xs text-muted-foreground">{disabledReason}</span>
        ) : null}
      </div>
      <p aria-live="polite" className="mt-2 min-h-5 text-sm text-muted-foreground">
        {attempt.recording
          ? attempt.interim
            ? `Ouvindo: ${attempt.interim}`
            : "Gravando — fale agora"
          : ""}
      </p>
      {sttMessage ? (
        <p role="status" data-testid="stt-error" className="mt-1 text-sm text-warning-foreground">
          {sttMessage}
        </p>
      ) : null}
      {attempt.recorderError ? (
        <p role="status" className="mt-1 text-sm text-warning-foreground">
          {attempt.recorderError === "no-permission"
            ? "Não foi possível acessar o microfone para gravar. Sem a gravação, o replay não fica disponível."
            : "A gravação não está disponível neste navegador."}
        </p>
      ) : null}
      {attempt.audioUrl && !attempt.recording ? (
        <figure className="mt-3">
          <figcaption className="text-sm font-medium text-foreground">
            Sua resposta (gravação local)
          </figcaption>
          <audio controls src={attempt.audioUrl} className="mt-1 w-full max-w-sm" />
        </figure>
      ) : null}
    </div>
  );
}
