// Prévia de conteúdo por tipo — Fase 3. Mostra apenas o que o aluno vê ANTES
// de responder (nunca gabarito: transcrições de áudio, respostas e frases de
// ditado ficam ocultas até os motores das Fases 4–5 entrarem com correção).

import { useAppState } from "@/lib/useAppState";
import { seededShuffle } from "@/lib/pte/catalog";
import { useSpeechSynthesis } from "@/lib/useSpeechSynthesis";
import type { Question } from "@/lib/pte/types";

import { TtsVoiceNote } from "./TtsVoiceNote";

const PREVIEW_NOTE =
  "Prévia de estudo: responder, corrigir e os cronômetros da prova chegam com os motores de prática.";

function AudioPromptPlaceholder({ promptLabel }: { promptLabel: string }) {
  return (
    <div className="rounded-xl border border-border bg-muted px-4 py-6 text-center">
      <p className="font-medium text-foreground">{promptLabel}</p>
      <p className="mt-2 text-sm text-muted-foreground">
        O áudio desta questão é reproduzido pelo motor de prática. A transcrição fica oculta para
        não revelar o gabarito antes da resposta.
      </p>
      <p className="mt-3 text-xs text-muted-foreground">{PREVIEW_NOTE}</p>
    </div>
  );
}

/** Divide a passagem nos marcadores {{n}}, mantendo o número da lacuna. */
function PassageWithBlanks({
  passage,
  renderBlank,
}: {
  passage: string;
  renderBlank: (n: number) => React.ReactNode;
}) {
  const parts = passage.split(/(\{\{\d+\}\})/).filter((part) => part !== "");
  return (
    <>
      {parts.map((part, i) => {
        const blank = /^\{\{(\d+)\}\}$/.exec(part);
        if (blank) {
          return <span key={`blank-${i}`}>{renderBlank(Number(blank[1]))}</span>;
        }
        return <span key={`text-${i}`}>{part}</span>;
      })}
    </>
  );
}

function BlankChip({ label }: { label: string }) {
  return (
    <span className="mx-1 inline-block min-w-16 rounded border border-input bg-background px-2 text-center text-sm text-muted-foreground">
      {label}
    </span>
  );
}

function OptionChips({ options }: { options: readonly string[] }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1 align-middle">
      {options.map((option, i) => (
        <span
          key={`${i}-${option.slice(0, 16)}`}
          className="rounded border border-border bg-background px-1.5 py-0.5 text-sm text-foreground"
        >
          {option}
        </span>
      ))}
    </span>
  );
}

function ReadAloudPreview({ question }: { question: Question }) {
  const { settings } = useAppState();
  const { supported, hasEnglishVoice, speaking, voiceUsed, speak, cancel } = useSpeechSynthesis();
  const text = (question.data as unknown as { text: string }).text;
  const ttsDisabled = supported === false || hasEnglishVoice === false;
  return (
    <div>
      <p className="text-lg leading-relaxed text-foreground sm:text-xl">{text}</p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={ttsDisabled}
          onClick={() => (speaking ? cancel() : speak(text, settings.modelRate, settings.accent))}
          className="inline-flex min-h-11 items-center gap-2 rounded-md border border-input bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          {speaking ? "Parar" : "Ouvir modelo"}
        </button>
      </div>
      <TtsVoiceNote voiceUsed={voiceUsed} hasEnglishVoice={hasEnglishVoice} />
      <p className="mt-3 text-xs text-muted-foreground">{PREVIEW_NOTE}</p>
    </div>
  );
}

export function PracticeContent({ question }: { question: Question }) {
  const d = question.data as unknown as { [key: string]: unknown };

  switch (question.type) {
    case "read_aloud":
      return <ReadAloudPreview question={question} />;

    case "repeat_sentence":
    case "retell_lecture":
    case "answer_short":
    case "sgd":
    case "rts":
    case "sst":
    case "wfd":
      return <AudioPromptPlaceholder promptLabel="Ouça e responda em voz alta ou por escrito" />;

    case "swt":
      return (
        <div>
          <p className="text-lg leading-relaxed text-foreground">{d["text"] as string}</p>
          <p className="mt-3 text-xs text-muted-foreground">{PREVIEW_NOTE}</p>
        </div>
      );

    case "write_essay":
      return (
        <div>
          <p className="text-lg leading-relaxed text-foreground">{d["prompt"] as string}</p>
          <p className="mt-3 text-xs text-muted-foreground">{PREVIEW_NOTE}</p>
        </div>
      );

    case "describe_image": {
      const source = question.source;
      return (
        <div>
          <img
            src={d["image"] as string}
            alt={d["alt"] as string}
            className="mx-auto max-h-96 w-auto max-w-full rounded-lg border border-border bg-background"
          />
          <p className="mt-2 text-xs text-muted-foreground">
            {source.license ? `${source.license} · ` : ""}
            {source.attribution ?? source.domain}
          </p>
          <p className="mt-3 text-xs text-muted-foreground">{PREVIEW_NOTE}</p>
        </div>
      );
    }

    case "read_mcq_single":
    case "read_mcq_multi":
    case "lst_mcq_single":
    case "lst_mcq_multi":
    case "lst_hcs":
    case "lst_smw": {
      const options = (d["options"] as string[]) ?? [];
      const isListening = question.type.startsWith("lst_");
      const passage = isListening ? null : ((d["passage"] as string) ?? null);
      const stem = (d["question"] as string) ?? null;
      return (
        <div>
          {passage ? <p className="text-lg leading-relaxed text-foreground">{passage}</p> : null}
          {stem ? <p className="mt-3 font-medium text-foreground">{stem}</p> : null}
          {options.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {options.map((option, i) => (
                <li
                  key={`${i}-${option.slice(0, 16)}`}
                  className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground"
                >
                  {option}
                </li>
              ))}
            </ul>
          ) : null}
          {isListening ? (
            <p className="mt-3 text-xs text-muted-foreground">
              O áudio é reproduzido pelo motor de prática; a transcrição fica oculta antes da
              resposta. {PREVIEW_NOTE}
            </p>
          ) : null}
        </div>
      );
    }

    case "read_fib_dropdown":
    case "lst_fib":
    case "read_fib_drag": {
      const passage = (d["passage"] as string) ?? (d["template"] as string) ?? "";
      const isListening = question.type === "lst_fib";
      return (
        <div>
          <p className="text-lg leading-relaxed text-foreground">
            <PassageWithBlanks
              passage={passage}
              renderBlank={(n) => <BlankChip label={`lacuna ${n}`} />}
            />
          </p>
          {question.type === "read_fib_dropdown"
            ? ((d["blanks"] as { options: string[] }[]) ?? []).map((blank, i) => (
                <p key={`blank-options-${i}`} className="mt-1 text-sm">
                  <span className="text-muted-foreground">Lacuna {i + 1}:</span>{" "}
                  <OptionChips options={blank.options} />
                </p>
              ))
            : null}
          {question.type === "read_fib_drag" ? (
            <p className="mt-2 text-sm">
              <span className="text-muted-foreground">Banco de palavras:</span>{" "}
              <OptionChips options={(d["bank"] as string[]) ?? []} />
            </p>
          ) : null}
          {isListening ? (
            <p className="mt-3 text-xs text-muted-foreground">
              O áudio é reproduzido pelo motor de prática. {PREVIEW_NOTE}
            </p>
          ) : null}
        </div>
      );
    }

    case "reorder_paragraphs": {
      const shuffled = seededShuffle((d["paragraphs"] as string[]) ?? [], question.id);
      return (
        <div>
          <ol className="space-y-2">
            {shuffled.map((paragraph, i) => (
              <li
                key={`${i}-${paragraph.slice(0, 12)}`}
                className="rounded-lg border border-border bg-card px-3 py-2 text-sm leading-relaxed text-foreground"
              >
                <span className="mr-2 font-semibold text-muted-foreground">{i + 1}.</span>
                {paragraph}
              </li>
            ))}
          </ol>
          <p className="mt-3 text-xs text-muted-foreground">{PREVIEW_NOTE}</p>
        </div>
      );
    }

    case "lst_hiw":
      return <AudioPromptPlaceholder promptLabel="Marque as palavras diferentes do áudio" />;
  }
}
