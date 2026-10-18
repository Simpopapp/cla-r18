import { seededShuffle } from "./catalog";
import type { QuestionMeta } from "./manifest";
import { EXAM_BLUEPRINT, EXAM_PARTS, TASK_MATRIX, type ExamPart } from "./skillMatrix";
import { confidenceOf, estimateSkill, SKILLS_OF_TYPE } from "./estimate";
import { SECTIONS, type TaskType } from "./types";
import {
  advanceSession,
  endSession,
  recordAttempt,
  startSession,
  type AppState,
} from "@/lib/storage";

export type ExamKind = "full" | "mini" | ExamPart;
export interface ExamScore {
  qid: string;
  type: TaskType;
  score: number | null;
  tags: string[];
}
export interface ExamData {
  kind: ExamKind;
  deadline: number | null;
  played: string[];
  scores: ExamScore[];
}
export const examLabel = (kind: ExamKind) =>
  kind === "full"
    ? "Simulado completo"
    : kind === "mini"
      ? "Mini-simulado"
      : (EXAM_PARTS.find((p) => p.id === kind)?.label ?? "Simulado");

export function buildExamQueue(
  items: readonly QuestionMeta[],
  kind: ExamKind,
  onlyVerified: boolean,
  seed: string,
) {
  const parts =
    kind === "full" || kind === "mini" ? EXAM_PARTS : EXAM_PARTS.filter((p) => p.id === kind);
  const ids: string[] = [];
  const omissions: { type: TaskType; missing: number }[] = [];
  let seconds = 0;
  for (const part of parts)
    for (const type of part.types) {
      const wanted = kind === "mini" ? 1 : EXAM_BLUEPRINT[type].count;
      const pool = [
        ...new Map(
          items
            .filter((m) => m.type === type && (!onlyVerified || m.provenance === "verificada"))
            .map((m) => [m.id, m]),
        ).values(),
      ];
      const chosen = seededShuffle(pool, `${seed}:${type}`).slice(0, wanted);
      ids.push(...chosen.map((m) => m.id));
      seconds += chosen.length * EXAM_BLUEPRINT[type].seconds;
      if (chosen.length < wanted) omissions.push({ type, missing: wanted - chosen.length });
    }
  return { ids, omissions, seconds };
}

export function examTiming(type: TaskType) {
  const row = TASK_MATRIX.find((r) => r.slug === type);
  return {
    seconds: EXAM_BLUEPRINT[type].seconds,
    prep: row?.timing.prepSeconds ?? 0,
    approximate: row?.approx ?? true,
  };
}

/** Tipos cujo enunciado é áudio (fidelidade F7): no simulado o prazo de
 * resposta só arma depois que a reprodução do enunciado termina. RTS mostra a
 * situação como texto com áudio opcional — não espera; read_aloud e
 * describe_image não têm enunciado em áudio. */
export const EXAM_AUDIO_PROMPTS: readonly TaskType[] = [
  "repeat_sentence",
  "retell_lecture",
  "answer_short",
  "sgd",
  "wfd",
  "sst",
  "lst_fib",
  "lst_hiw",
  "lst_smw",
  "lst_hcs",
  "lst_mcq_single",
  "lst_mcq_multi",
];

export function examPromptWaits(type: TaskType): boolean {
  return EXAM_AUDIO_PROMPTS.includes(type);
}

export function startExam(state: AppState, ids: string[], kind: ExamKind, now: number): AppState {
  if (state.draft || ids.length === 0) return state;
  const next = startSession(state, "exam", ids, now);
  if (!next.draft) return state;
  return {
    ...next,
    draft: { ...next.draft, exam: { kind, deadline: null, played: [], scores: [] } },
  };
}

export function armExamItem(state: AppState, qid: string, type: TaskType, now: number): AppState {
  const draft = state.draft;
  if (!draft?.exam || draft.ids[draft.cursor] !== qid || draft.exam.deadline !== null) return state;
  return {
    ...state,
    draft: { ...draft, exam: { ...draft.exam, deadline: now + examTiming(type).seconds * 1000 } },
  };
}

export function claimExamAudio(state: AppState, qid: string): AppState {
  const draft = state.draft;
  if (!draft?.exam || draft.ids[draft.cursor] !== qid || draft.exam.played.includes(qid))
    return state;
  return {
    ...state,
    draft: { ...draft, exam: { ...draft.exam, played: [...draft.exam.played, qid] } },
  };
}

export function submitExamItem(
  state: AppState,
  answer: ExamScore,
  now: number,
  id: string,
): AppState {
  const draft = state.draft;
  if (!draft?.exam || draft.ids[draft.cursor] !== answer.qid) return state;
  const next = advanceSession(
    recordAttempt(state, {
      ...answer,
      id,
      ts: now,
      mode: "exam",
      tags: [...new Set([...answer.tags, "exame"])],
    }),
    answer.qid,
    answer.score,
  );
  if (!next.draft) return state;
  return {
    ...next,
    draft: {
      ...next.draft,
      exam: { ...draft.exam, deadline: null, scores: [...draft.exam.scores, answer] },
    },
  };
}

export function finishExam(state: AppState, now: number): AppState {
  if (!state.draft?.exam || state.draft.cursor < state.draft.ids.length) return state;
  const exam = state.draft.exam;
  const next = endSession(state, now);
  return {
    ...next,
    sessions: next.sessions.map((s, i) => (i === next.sessions.length - 1 ? { ...s, exam } : s)),
  };
}

export function examSummary(scores: readonly ExamScore[]) {
  const skills = SECTIONS.map((skill) => {
    const pool = scores.filter((s) => s.score !== null && SKILLS_OF_TYPE[s.type].includes(skill));
    const mean = pool.length
      ? pool.reduce((sum, s) => sum + (s.score ?? 0), 0) / pool.length
      : null;
    return {
      skill,
      estimate: mean === null ? null : estimateSkill(mean),
      confidence: confidenceOf(pool.length),
      n: pool.length,
    };
  });
  const types = [...new Set(scores.map((s) => s.type))].map((type) => {
    const pool = scores.filter((s) => s.type === type && s.score !== null);
    return {
      type,
      n: pool.length,
      average: pool.length ? pool.reduce((sum, s) => sum + (s.score ?? 0), 0) / pool.length : null,
    };
  });
  return { skills, types, unscored: scores.filter((s) => s.score === null).length };
}
