// Describe Image — Motor A — PRD §10.2/§9.3 (D6). Imagem com alt, crédito e
// licença visíveis; conteúdo = cobertura de `facts` + `keywords` derivados
// dos dados do próprio gráfico; fluência proxy; pronúncia não avaliada.

import { useCallback, useEffect, useRef, useState } from "react";

import { buildSpeakingResult } from "./speakingResult";
import { SpeakingControls } from "./SpeakingControls";
import type { EngineProps } from "./engine";
import { useAppState } from "@/lib/useAppState";
import { useSpeakingAttempt } from "@/lib/useSpeakingAttempt";
import { contentFromKeywords, countAdjacentRepetitions, fluencyProxy } from "@/lib/pte/speaking";
import type { DescribeImageData } from "@/lib/pte/types";

export function DescribeImageEngine({
  question,
  onSubmit,
  submitted,
  registerAutoSubmit,
}: EngineProps) {
  const data = question.data as DescribeImageData;
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
    const coverage = ok
      ? contentFromKeywords([...data.facts, ...data.keywords], m.spokenText)
      : null;
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
            : "Treino sem nota: o reconhecimento de voz não ficou disponível — ouça a gravação e compare com os fatos do gráfico.",
        details: coverage
          ? [
              coverage.missing.length > 0
                ? `Fatos/palavras-chave não mencionados: ${coverage.missing.slice(0, 4).join(" · ")}${coverage.missing.length > 4 ? "…" : ""}`
                : "Todos os fatos-chave mencionados.",
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
  }, [data.facts, data.keywords, onSubmit, speaking]);

  useEffect(() => {
    registerAutoSubmit(finish);
    return () => registerAutoSubmit(null);
  }, [finish, registerAutoSubmit]);

  const toggle = () => {
    if (speaking.recording) finish();
    else speaking.start();
  };

  const source = question.source;
  return (
    <div>
      <img
        src={data.image}
        alt={data.alt}
        className="mx-auto max-h-96 w-auto max-w-full rounded-lg border border-border bg-background"
      />
      <p className="mt-2 text-xs text-muted-foreground">
        {source.license ? `${source.license} · ` : ""}
        {source.attribution ?? source.domain}
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        Descreva a imagem: o que ela mostra, tendências e destaques (números incluem-se bem).
      </p>
      <SpeakingControls attempt={speaking} onToggle={toggle} disabled={submitted} />
      {missing ? (
        <p className="mt-3 text-sm text-muted-foreground" data-testid="di-missing">
          {missing.length > 0
            ? `Itens do gráfico que ficaram de fora: ${missing.slice(0, 4).join(" · ")}`
            : "Cobertura completa dos fatos-chave."}
        </p>
      ) : null}
    </div>
  );
}
