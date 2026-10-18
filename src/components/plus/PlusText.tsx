// Pack studie-plus — texto completo com bolhas de palavra + cards por frase.
// Um único ponto de integração para os motores: campo elegível + recursos ativos
// → frases em PlusPhraseCard; só bolhas → PlusWordText; pack desligado → texto
// simples idêntico ao anterior (regressão zero).

import { PlusPhraseCard } from "./PlusPhraseCard";
import { PlusWordText } from "./PlusWordText";
import { plusFieldPolicy, plusWordPolicy, type PlusPhase } from "@/lib/plus/plusAudio";
import { splitSentences } from "@/lib/plus/sentences";
import { useAppState } from "@/lib/useAppState";
import type { TaskType } from "@/lib/pte/types";

export function PlusText({
  text,
  type,
  field,
  phase,
  className,
  wordBubbles = true,
  disabled = false,
  qid,
}: {
  text: string;
  type: TaskType;
  field: string;
  phase: PlusPhase;
  className?: string;
  wordBubbles?: boolean | undefined;
  /** no simulado o pack não aparece (não faz parte da replicação do PTE) */
  disabled?: boolean | undefined;
  /** qid direto — obrigatório quando o campo tem tradução por frase */
  qid?: string | undefined;
}) {
  const { settings } = useAppState();
  const policy = disabled
    ? { phraseTranslation: false, phraseAudio: false }
    : plusFieldPolicy(type, field, phase);
  const wordOk = !disabled && plusWordPolicy(type, field, phase);
  // política do tipo = elegibilidade; interruptores do aluno = decisão
  const phraseOn = policy.phraseTranslation && settings.plus.phraseTranslation;
  const audioOn = policy.phraseAudio && settings.plus.plusAudio;

  if (!phraseOn && !audioOn) {
    return wordBubbles ? (
      <PlusWordText
        text={text}
        type={type}
        field={field}
        phase={phase}
        className={className}
        disabled={disabled}
      />
    ) : (
      <span className={className}>{text}</span>
    );
  }

  const sentences = splitSentences(text);
  let offset = 0;
  return (
    <span className={className}>
      {sentences.map((sentence) => {
        const index = offset++;
        return (
          <span key={index} className="mb-1 block">
            <PlusPhraseCard
              sentence={sentence}
              index={index}
              type={type}
              field={field}
              phase={phase}
              wordBubbles={wordBubbles && wordOk}
              disabled={disabled}
              qid={qid}
            />{" "}
          </span>
        );
      })}
    </span>
  );
}
