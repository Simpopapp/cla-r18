// Re-tell Lecture — Motor A — PRD §10.2/§9.3. Áudio da aula 1× (transcript
// oculto até o resultado), prep 10 s, conteúdo = cobertura de `keywords`
// (referência < 4 → "sem nota", nunca inventar).

import { useCallback, useEffect, useRef, useState } from "react";

import { PlusText } from "@/components/plus/PlusText";
import { AudioPlayOnce } from "./AudioPlayOnce";
import { buildSpeakingResult } from "./speakingResult";
import { SpeakingControls } from "./SpeakingControls";
import type { EngineProps } from "./engine";
import { useAppState } from "@/lib/useAppState";
import { useSpeakingAttempt } from "@/lib/useSpeakingAttempt";
import { contentFromKeywords, countAdjacentRepetitions, fluencyProxy } from "@/lib/pte/speaking";
import type { LectureRetellData } from "@/lib/pte/types";

export function RetellLectureEngine({
  question,
  onSubmit,
  submitted,
  registerAutoSubmit,
  mode,
}: EngineProps) {
  const data = question.data as LectureRetellData;
  const { settings } = useAppState();
  const speaking = useSpeakingAttempt(settings.accent);
  const submittedRef = useRef(false);
  const [missing, setMissing] = useState<string[] | null>(null);
  const [captured, setCaptured] = useState(false);

  const finish = useCallback(() => {
    if (submittedRef.current) return;
    submittedRef.current = true;
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
            : "Treino sem nota: o reconhecimento de voz não ficou disponível — ouça a gravação e o áudio da aula.",
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
  }, [data.keywords, onSubmit, speaking]);

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
      <AudioPlayOnce
        text={data.transcript}
        canReplay={settings.allowReplay || submitted}
        label="Ouvir a aula (1×)"
      />
      <p className="mt-2 text-sm text-muted-foreground">
        Reproduza as ideias principais da aula em até 40 s — depois da preparação de 10 s.
      </p>
      <SpeakingControls attempt={speaking} onToggle={toggle} disabled={submitted} />
      {missing ? (
        <p className="mt-3 text-sm text-muted-foreground" data-testid="rl-missing">
          {missing.length > 0
            ? `Palavras-chave que ficaram de fora: ${missing.slice(0, 5).join(" · ")}`
            : "Cobertura completa das palavras-chave."}
        </p>
      ) : null}
      {submitted && !captured ? (
        <details className="mt-3">
          <summary className="cursor-pointer text-sm font-medium text-foreground">
            Ver transcrição da aula
          </summary>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            <PlusText
              text={data.transcript}
              type="retell_lecture"
              field="transcript"
              phase="post"
              qid={question.id}
              disabled={mode === "exam"}
            />
          </p>
        </details>
      ) : null}
    </div>
  );
}
