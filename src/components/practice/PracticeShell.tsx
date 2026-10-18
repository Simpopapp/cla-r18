// Shell comum de prática — PRD §10.1. Todo tipo herda: proveniência, SRS
// (DueNotice), cronômetro por tipo, favorito ★, notas com debounce, navegação,
// atalhos de teclado e painel de resultado (preenchido pelos motores).

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Keyboard, Star } from "lucide-react";

import { DueNotice } from "@/components/common/DueNotice";
import { ProvenanceBadge } from "@/components/common/seals";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { mutateAppState } from "@/lib/useAppState";
import { toggleBookmark, upsertNote } from "@/lib/storage";
import { neighborsOf } from "@/lib/pte/catalog";
import { TASK_MATRIX } from "@/lib/pte/skillMatrix";
import { PASS_SCORE_BY_TYPE, snapshotState } from "@/lib/pte/srs";
import type { Question, TaskType } from "@/lib/pte/types";
import { useAppState } from "@/lib/useAppState";

import { ScorePanel, type ScoreResultView } from "./ScorePanel";

const NOTE_DEBOUNCE_MS = 400;

const SHORTCUTS: readonly { keys: string; action: string }[] = [
  { keys: "← / J", action: "questão anterior" },
  { keys: "→ / K", action: "próxima questão" },
  { keys: "B", action: "favoritar ★" },
  { keys: "N", action: "abrir/fechar nota" },
  { keys: "?", action: "mostrar atalhos" },
  { keys: "Esc", action: "fechar sobreposições" },
  { keys: "Enter", action: "iniciar / confirmar (nos motores)" },
  { keys: "Espaço", action: "marcar opção (nos motores de seleção)" },
];

type TimerPhase = "idle" | "prep" | "response" | "done";

function formatSeconds(total: number): string {
  if (total >= 60) {
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  }
  return `${total} s`;
}

/** Cronômetro do tipo (prep → resposta). O tempo esgotado dispara onTimeUp — o shell entrega ao dispatcher. */
function useTaskTimer(type: TaskType, questionId: string, onTimeUp?: () => void) {
  const row = TASK_MATRIX.find((r) => r.slug === type);
  const timing = row?.timing ?? { responseSeconds: 60, label: "≈ 60 s" };
  const [phase, setPhase] = useState<TimerPhase>("idle");
  const [remaining, setRemaining] = useState(0);
  const [announce, setAnnounce] = useState("");

  useEffect(() => {
    const prep = timing.prepSeconds;
    if (prep) {
      setPhase("prep");
      setRemaining(prep);
    } else {
      setPhase("response");
      setRemaining(timing.responseSeconds);
    }
  }, [questionId, timing.prepSeconds, timing.responseSeconds]);

  useEffect(() => {
    if (phase !== "prep" && phase !== "response") return;
    const interval = window.setInterval(() => setRemaining((r) => r - 1), 1000);
    return () => window.clearInterval(interval);
  }, [phase, questionId]);

  const onTimeUpRef = useRef(onTimeUp);
  onTimeUpRef.current = onTimeUp;

  useEffect(() => {
    if (remaining > 0) return;
    if (phase === "prep") {
      setPhase("response");
      setRemaining(timing.responseSeconds);
    } else if (phase === "response") {
      setPhase("done");
      onTimeUpRef.current?.();
    }
  }, [remaining, phase, timing.responseSeconds]);

  // aria-live enxuto: anuncia a cada 5 s e no reta final (evita ruído por segundo).
  useEffect(() => {
    if (phase !== "prep" && phase !== "response") return;
    if (remaining <= 5 || remaining % 5 === 0) {
      setAnnounce(
        `${phase === "prep" ? "Preparação" : "Tempo restante"}: ${formatSeconds(Math.max(remaining, 0))}`,
      );
    }
  }, [remaining, phase]);

  return { timing, phase, remaining, announce };
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
}

export interface PracticeShellProps {
  question: Question;
  /** posição na fila atual (ids; na sessão, a fila é o rascunho) */
  queue: { prev: string | null; next: string | null; index: number; total: number };
  onNavigate: (id: string) => void;
  /** resultado preenchido pelo motor (Fases 4–5); null no shell puro */
  result?: ScoreResultView | null;
  /** disparado uma vez quando o tempo de resposta acaba — o shell entrega ao dispatcher */
  onTimeUp?: (() => void) | undefined;
  children: ReactNode;
}

export function PracticeShell({
  question,
  queue,
  onNavigate,
  result = null,
  onTimeUp,
  children,
}: PracticeShellProps) {
  const state = useAppState();
  const now = Date.now();
  const row = TASK_MATRIX.find((r) => r.slug === question.type);
  const label = row?.label ?? question.type;

  const snapshot = state.questions[question.id];
  const bookmarked = state.bookmarks.includes(question.id);
  const srsStatus = snapshot
    ? snapshotState(snapshot, PASS_SCORE_BY_TYPE[question.type] ?? 75, now)
    : null;

  const savedNote = state.notes[question.id]?.text ?? "";
  const [noteOpen, setNoteOpen] = useState(false);
  const [draft, setDraft] = useState(savedNote);
  const [noteSaved, setNoteSaved] = useState(false);
  const noteTimer = useRef<number | null>(null);
  const draftRef = useRef(draft);

  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const { timing, phase, remaining, announce } = useTaskTimer(question.type, question.id, onTimeUp);

  useEffect(() => {
    setDraft(state.notes[question.id]?.text ?? "");
    setNoteSaved(false);
    setNoteOpen(false);
    setShortcutsOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question.id]);

  const scheduleNoteSave = useCallback(
    (text: string) => {
      draftRef.current = text;
      if (noteTimer.current !== null) window.clearTimeout(noteTimer.current);
      noteTimer.current = window.setTimeout(() => {
        mutateAppState((s) => upsertNote(s, question.id, draftRef.current));
        setNoteSaved(true);
      }, NOTE_DEBOUNCE_MS);
    },
    [question.id],
  );

  useEffect(() => {
    return () => {
      if (noteTimer.current !== null) window.clearTimeout(noteTimer.current);
    };
  }, []);

  const toggleNote = useCallback(() => setNoteOpen((open) => !open), []);
  const toggleBookmarkAction = useCallback(() => {
    mutateAppState((s) => toggleBookmark(s, question.id));
  }, [question.id]);
  const navigateRef = useRef(onNavigate);
  navigateRef.current = onNavigate;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTypingTarget(event.target)) return;
      switch (event.key) {
        case "ArrowLeft":
        case "j":
        case "J": {
          if (queue.prev) navigateRef.current(queue.prev);
          break;
        }
        case "ArrowRight":
        case "k":
        case "K": {
          if (queue.next) navigateRef.current(queue.next);
          break;
        }
        case "b":
        case "B":
          toggleBookmarkAction();
          break;
        case "n":
        case "N":
          toggleNote();
          break;
        case "?":
          setShortcutsOpen((open) => !open);
          break;
        case "Escape":
          setShortcutsOpen(false);
          setNoteOpen(false);
          break;
        default:
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [queue.prev, queue.next, toggleBookmarkAction, toggleNote]);

  return (
    <div className="flex flex-1 flex-col">
      <div className="mx-auto w-full max-w-3xl px-4 pb-32 pt-6">
        <nav aria-label="Trilha" className="text-sm text-muted-foreground">
          <Link to="/" className="hover:underline">
            Início
          </Link>
          <span aria-hidden="true"> / </span>
          <span>Prática</span>
        </nav>

        <header className="mt-3">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-serif text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {label}
            </h1>
            <ProvenanceBadge provenance={question.provenance} />
            <DueNotice snapshot={snapshot} now={now} />
            {srsStatus ? (
              <span className="inline-flex min-h-6 items-center rounded-full border border-border bg-muted px-2 text-xs text-muted-foreground">
                {srsStatus}
              </span>
            ) : null}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span>
              Questão {queue.index + 1} de {queue.total}
            </span>
            <span
              aria-live="polite"
              aria-atomic="true"
              className="rounded-md border border-border bg-muted px-2 py-0.5 text-xs text-foreground"
            >
              {phase === "idle"
                ? timing.label
                : phase === "done"
                  ? "tempo esgotado — na prova, a resposta encerra aqui"
                  : formatSeconds(Math.max(remaining, 0))}
            </span>
            <span className="sr-only">{announce}</span>
            {question.topic ? <span>tema: {question.topic}</span> : null}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant={bookmarked ? "secondary" : "outline"}
              size="sm"
              aria-pressed={bookmarked}
              aria-label={bookmarked ? "Remover dos favoritos" : "Adicionar aos favoritos"}
              onClick={toggleBookmarkAction}
              className="min-h-11"
            >
              <Star aria-hidden="true" className={bookmarked ? "size-4 fill-current" : "size-4"} />
              {bookmarked ? "Favoritada" : "Favoritar"}
            </Button>
            <Button
              type="button"
              variant={noteOpen ? "secondary" : "outline"}
              size="sm"
              aria-expanded={noteOpen}
              aria-controls="practice-note"
              onClick={toggleNote}
              className="min-h-11"
            >
              Nota {noteSaved ? "· salva" : ""}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-expanded={shortcutsOpen}
              onClick={() => setShortcutsOpen((open) => !open)}
              className="min-h-11"
            >
              <Keyboard aria-hidden="true" className="size-4" />
              Atalhos (?)
            </Button>
          </div>
        </header>

        {shortcutsOpen ? (
          <div
            role="dialog"
            aria-label="Atalhos de teclado"
            className="mt-4 rounded-xl border border-border bg-card p-4"
          >
            <h2 className="text-base font-semibold text-foreground">Atalhos de teclado</h2>
            <dl className="mt-2 grid gap-x-6 gap-y-1 sm:grid-cols-2">
              {SHORTCUTS.map((shortcut) => (
                <div
                  key={shortcut.keys}
                  className="flex items-baseline justify-between gap-3 text-sm"
                >
                  <dt className="font-mono text-foreground">{shortcut.keys}</dt>
                  <dd className="text-muted-foreground">{shortcut.action}</dd>
                </div>
              ))}
            </dl>
          </div>
        ) : null}

        {noteOpen ? (
          <div id="practice-note" className="mt-4">
            <label htmlFor="practice-note-text" className="text-sm font-medium text-foreground">
              Nota pessoal (fica neste navegador)
            </label>
            <Textarea
              id="practice-note-text"
              value={draft}
              maxLength={2000}
              onChange={(event) => {
                setDraft(event.target.value);
                setNoteSaved(false);
                scheduleNoteSave(event.target.value);
              }}
              className="mt-1 min-h-24"
              placeholder="Escreva o que ajudou, o que errou, atalhos de vocabulário…"
            />
            <p aria-live="polite" className="mt-1 text-xs text-muted-foreground">
              {noteSaved ? "Nota salva" : "Salva automaticamente, com pequena pausa após digitar"}
            </p>
          </div>
        ) : null}

        <main className="mt-6">
          <div className="rounded-xl border border-border bg-card p-4 sm:p-6">{children}</div>
          {result ? (
            <div className="mt-4">
              <ScorePanel result={result} snapshot={snapshot} now={now} />
            </div>
          ) : null}
        </main>
      </div>

      {/* Barra de ação fixa: nunca cobre o conteúdo (padding pb-32 acima). */}
      <footer className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          <Button
            type="button"
            variant="outline"
            disabled={!queue.prev}
            onClick={() => queue.prev && onNavigate(queue.prev)}
            className="min-h-11"
          >
            <ChevronLeft aria-hidden="true" className="size-4" />
            Anterior
          </Button>
          <span className="text-xs text-muted-foreground">
            {queue.index + 1} / {queue.total}
          </span>
          <Button
            type="button"
            variant="outline"
            disabled={!queue.next}
            onClick={() => queue.next && onNavigate(queue.next)}
            className="min-h-11"
          >
            Próxima
            <ChevronRight aria-hidden="true" className="size-4" />
          </Button>
        </div>
      </footer>
    </div>
  );
}
