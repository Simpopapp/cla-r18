// Pack studie-plus — texto com palavras tocáveis (PRD §13.1/§13.2).
// Balão portalado em document.body, posicionado dentro do viewport; abre SOMENTE
// por tap/click (nunca hover, foco ou rolagem); fecha por toque fora, ✕ ou Esc.
// Balão mostra a tradução só com `wordTranslation`; 🔊 (que fala o inglês) só
// com `plusAudio`. Pack desligado → texto simples, zero mudança visual.

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { PlusSpeakButton } from "./PlusSpeakButton";
import { lookupWord, GLOSSARY_MISS, type GlossaryEntry } from "@/lib/plus/glossary";
import { loadGlossary } from "@/lib/plus/data";
import { plusWordPolicy, type PlusPhase } from "@/lib/plus/plusAudio";
import { splitWords, normalizeWordToken } from "@/lib/plus/words";
import { useAppState } from "@/lib/useAppState";
import type { TaskType } from "@/lib/pte/types";

interface BubbleState {
  word: string;
  x: number;
  y: number;
}

interface LookupState {
  entry: GlossaryEntry | null;
  done: boolean;
}

export function PlusWordText({
  text,
  type,
  field,
  phase,
  className,
  disabled = false,
}: {
  text: string;
  type: TaskType;
  field: string;
  phase: PlusPhase;
  className?: string | undefined;
  /** no simulado o pack não aparece (não faz parte da replicação do PTE) */
  disabled?: boolean | undefined;
}) {
  const { settings } = useAppState();
  const active =
    !disabled &&
    plusWordPolicy(type, field, phase) &&
    (settings.plus.wordTranslation || settings.plus.plusAudio);

  const [bubble, setBubble] = useState<BubbleState | null>(null);
  const [lookup, setLookup] = useState<LookupState>({ entry: null, done: false });
  const bubbleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!bubble) return;
    let cancelled = false;
    setLookup({ entry: null, done: false });
    loadGlossary().then((glossary) => {
      if (cancelled) return;
      setLookup({ entry: lookupWord(glossary, bubble.word), done: true });
    });
    return () => {
      cancelled = true;
    };
  }, [bubble]);

  // fecha por toque fora ou Esc — nunca abre por hover/foco/rolagem
  useEffect(() => {
    if (!bubble) return;
    const onPointerDown = (event: PointerEvent) => {
      if (bubbleRef.current && !bubbleRef.current.contains(event.target as Node)) {
        setBubble(null);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setBubble(null);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [bubble]);

  if (!active) return <span className={className}>{text}</span>;

  const tokens = text.split(/(\s+)/);
  const known = new Set(splitWords(text));

  return (
    <span className={className}>
      {tokens.map((token, index) => {
        const isWord = known.has(normalizeWordToken(token));
        if (!isWord) {
          // preserva espaços e pontuação exatamente como no texto original
          return token.includes("\n") || token.trim() === "" ? (
            <span key={index}>{token}</span>
          ) : (
            <span key={index}>{token}</span>
          );
        }
        return (
          <button
            key={index}
            type="button"
            data-plus-word
            className="rounded px-0.5 text-left underline decoration-dotted decoration-muted-foreground/60 underline-offset-4"
            onClick={(event) => {
              event.stopPropagation();
              const rect = event.currentTarget.getBoundingClientRect();
              setBubble({ word: normalizeWordToken(token), x: rect.left, y: rect.bottom });
            }}
          >
            {token}
          </button>
        );
      })}
      {bubble
        ? createPortal(
            <div
              ref={bubbleRef}
              role="dialog"
              aria-label={`Tradução de ${bubble.word}`}
              className="fixed z-50 w-64 max-w-[calc(100vw-1rem)] rounded-lg border border-border bg-card p-3 text-sm shadow-lg"
              style={{
                left: Math.min(Math.max(bubble.x - 16, 8), (window.innerWidth ?? 390) - 272),
                top: Math.min(bubble.y + 8, (window.innerHeight ?? 844) - 140),
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium text-foreground">{bubble.word}</p>
                <button
                  type="button"
                  aria-label="Fechar tradução"
                  className="-mt-1 -mr-1 inline-flex size-9 items-center justify-center rounded-full text-muted-foreground"
                  onClick={() => setBubble(null)}
                >
                  ✕
                </button>
              </div>
              {settings.plus.wordTranslation ? (
                lookup.done ? (
                  lookup.entry ? (
                    <div className="mt-1">
                      <p className="text-foreground">{lookup.entry.literal}</p>
                      {lookup.entry.contextual ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {lookup.entry.contextual}
                        </p>
                      ) : null}
                    </div>
                  ) : (
                    <p className="mt-1 text-xs text-muted-foreground">{GLOSSARY_MISS}</p>
                  )
                ) : (
                  <p className="mt-1 text-xs text-muted-foreground">Carregando…</p>
                )
              ) : null}
              {settings.plus.plusAudio ? (
                <div className="mt-2">
                  <PlusSpeakButton text={bubble.word} label={`Pronunciar ${bubble.word}`} />
                </div>
              ) : null}
            </div>,
            document.body,
          )
        : null}
    </span>
  );
}
