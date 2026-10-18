// Lacunas (FIB: read_fib_dropdown, read_fib_drag, lst_fib) — PRD §9.2.
// Acertos por lacuna / total; digitação tolerante a caixa e espaços; tags
// `missed:` por lacuna. Módulo puro.

import { normalizeText } from "./coverage";

export const FIB_TAGS_MAX = 5;

export interface FibResult {
  /** 0–100: acertos / lacunas */
  score: number;
  correct: number;
  total: number;
  /** índices das lacunas erradas (0-based) */
  wrongBlanks: number[];
  tags: string[];
}

function sameAnswer(user: string, expected: string): boolean {
  const a = normalizeText(user);
  const b = normalizeText(expected);
  return a !== "" && a === b;
}

/** Lacunas respondidas por TEXTO (lst_fib digita; dropdown pode vir como texto). */
export function gradeFibTyped(
  expected: readonly string[],
  user: readonly (string | null)[],
): FibResult {
  const wrongBlanks: number[] = [];
  const tags: string[] = [];
  let correct = 0;
  expected.forEach((want, index) => {
    const got = user[index] ?? null;
    if (got !== null && got.trim() !== "" && sameAnswer(got, want)) {
      correct += 1;
    } else {
      wrongBlanks.push(index);
      if (tags.length < FIB_TAGS_MAX) tags.push(`missed:${normalizeText(want)}`);
    }
  });
  const total = expected.length;
  return {
    score: total === 0 ? 0 : Math.round((correct / total) * 100),
    correct,
    total,
    wrongBlanks,
    tags,
  };
}

/**
 * Lacunas respondidas por ÍNDICE (dropdown: índice da opção; drag: índice do
 * banco). `expected` e `user` alinhados por lacuna; null = em branco.
 */
export function gradeFibChoices(
  expected: readonly number[],
  user: readonly (number | null)[],
): FibResult {
  const wrongBlanks: number[] = [];
  const tags: string[] = [];
  let correct = 0;
  expected.forEach((want, index) => {
    const got = user[index] ?? null;
    if (got !== null && got === want) {
      correct += 1;
    } else {
      wrongBlanks.push(index);
      if (tags.length < FIB_TAGS_MAX) tags.push(`missed:blank-${index + 1}`);
    }
  });
  const total = expected.length;
  return {
    score: total === 0 ? 0 : Math.round((correct / total) * 100),
    correct,
    total,
    wrongBlanks,
    tags,
  };
}
