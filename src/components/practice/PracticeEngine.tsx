// Dispatcher das telas de prática — Motor A–D, PRD §10.2. Escolhe o motor
// pelo tipo da questão (22 tipos), registra a tentativa em recordAttempt e
// entrega o resultado ao ScorePanel do shell. Submissão duplicada é
// bloqueada aqui e os motores também guardam contra reenvio.

import { useCallback, useEffect, useRef, useState, type ReactElement } from "react";

import { AnswerShortEngine } from "./AnswerShortEngine";
import { DescribeImageEngine } from "./DescribeImageEngine";
import { LstFibEngine } from "./LstFibEngine";
import { LstHcsEngine } from "./LstHcsEngine";
import { LstHiwEngine } from "./LstHiwEngine";
import { LstSmwEngine } from "./LstSmwEngine";
import { McqEngine } from "./McqEngine";
import { ReadAloudEngine } from "./ReadAloudEngine";
import { ReadFibDragEngine } from "./ReadFibDragEngine";
import { ReadFibDropdownEngine } from "./ReadFibDropdownEngine";
import { RepeatSentenceEngine } from "./RepeatSentenceEngine";
import { RetellLectureEngine } from "./RetellLectureEngine";
import { ReorderEngine } from "./ReorderEngine";
import { RtsEngine } from "./RtsEngine";
import { SgdEngine } from "./SgdEngine";
import { SstEngine } from "./SstEngine";
import { SwtEngine } from "./SwtEngine";
import { WfdEngine } from "./WfdEngine";
import { WriteEssayEngine } from "./WriteEssayEngine";
import type { EngineProps, EngineSubmitPayload } from "./engine";
import { mutateAppState } from "@/lib/useAppState";
import { advanceSession, recordAttempt } from "@/lib/storage";
import type { Question, TaskType } from "@/lib/pte/types";
import { PracticeModeContext } from "./PracticeMode";

export type { EngineSubmitPayload as PracticeResultPayload } from "./engine";

const ENGINES: Partial<Record<TaskType, (props: EngineProps) => ReactElement>> = {
  // Motor A — voz
  read_aloud: ReadAloudEngine,
  repeat_sentence: RepeatSentenceEngine,
  describe_image: DescribeImageEngine,
  retell_lecture: RetellLectureEngine,
  answer_short: AnswerShortEngine,
  sgd: SgdEngine,
  rts: RtsEngine,
  // Motor B — escrita
  wfd: WfdEngine,
  swt: SwtEngine,
  sst: SstEngine,
  write_essay: WriteEssayEngine,
  // Motor C — escuta interativa
  lst_fib: LstFibEngine,
  lst_hiw: LstHiwEngine,
  lst_smw: LstSmwEngine,
  lst_hcs: LstHcsEngine,
  lst_mcq_single: McqEngine,
  lst_mcq_multi: McqEngine,
  // Motor D — leitura
  read_fib_dropdown: ReadFibDropdownEngine,
  read_fib_drag: ReadFibDragEngine,
  read_mcq_single: McqEngine,
  read_mcq_multi: McqEngine,
  reorder_paragraphs: ReorderEngine,
};

export function engineFor(type: TaskType): ((props: EngineProps) => ReactElement) | null {
  return ENGINES[type] ?? null;
}

export function PracticeEngine({
  question,
  onSubmitted,
  autoSubmitRef,
  mode = "practice",
}: {
  mode?: "practice" | "exam";
  question: Question;
  onSubmitted: (payload: EngineSubmitPayload) => void;
  /** ref do shell: guarda o auto-submit do motor montado para o onTimeUp do cronômetro */
  autoSubmitRef: { current: (() => void) | null };
}) {
  const [submitted, setSubmitted] = useState(false);
  const submittedRef = useRef(false);

  const registerAutoSubmit = useCallback(
    (fn: (() => void) | null) => {
      autoSubmitRef.current = fn;
    },
    [autoSubmitRef],
  );

  const handleSubmitted = useCallback(
    (payload: EngineSubmitPayload) => {
      if (submittedRef.current) return;
      submittedRef.current = true;
      setSubmitted(true);
      if (mode === "exam") {
        onSubmitted(payload);
        return;
      }
      mutateAppState((state) => {
        // Na sessão, a tentativa grava com mode "session" e avança o cursor
        // do rascunho (§7.2 — draft salvo a cada resposta).
        const draft = state.draft;
        const inSession = !!draft && draft.ids[draft.cursor] === question.id;
        const next = recordAttempt(state, {
          id: crypto.randomUUID(),
          qid: question.id,
          type: question.type,
          ts: Date.now(),
          score: payload.result.score,
          mode: inSession ? "session" : "practice",
          ...(payload.tags && payload.tags.length > 0 ? { tags: payload.tags } : {}),
          ...(payload.metrics ? { metrics: payload.metrics } : {}),
        });
        return inSession ? advanceSession(next, question.id, payload.result.score) : next;
      });
      onSubmitted(payload);
    },
    [mode, onSubmitted, question.id, question.type],
  );

  const Engine = engineFor(question.type);
  if (!Engine) return null;
  return (
    <PracticeModeContext.Provider value={mode}>
      <Engine
        mode={mode}
        question={question}
        onSubmit={handleSubmitted}
        submitted={submitted}
        registerAutoSubmit={registerAutoSubmit}
      />
    </PracticeModeContext.Provider>
  );
}

/** Exposto para o shell: dispara o auto-submit registrado pelo motor atual. */
export function fireAutoSubmit(get: () => (() => void) | null) {
  get()?.();
}
