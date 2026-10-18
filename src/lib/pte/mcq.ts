// Múltipla escolha (read/lst mcq single e multi, lst_hcs, lst_smw) — PRD §9.2.
// Single: binário 0/100 com tag `trap:<índice>` quando a armadilha tem
// explicação. Multi: +1 por certa, −1 por errada, mínimo 0, normalizado.
// Módulo puro.

export interface McqSingleResult {
  /** 0 ou 100 */
  score: number;
  tags: string[];
  /** explicação da armadilha escolhida, quando houver */
  trapText: string | null;
}

export function gradeMcqSingle(
  selected: number | null,
  answer: number,
  traps?: readonly string[],
): McqSingleResult {
  if (selected === null || selected !== answer) {
    const tags: string[] = [];
    let trapText: string | null = null;
    if (selected !== null && traps && traps[selected] !== undefined) {
      const text = traps[selected];
      if (typeof text === "string" && text.trim() !== "") {
        tags.push(`trap:${selected}`);
        trapText = text;
      }
    }
    return { score: 0, tags, trapText };
  }
  return { score: 100, tags: [], trapText: null };
}

export interface McqMultiResult {
  /** 0–100: max(0, certas − erradas) / nº de respostas corretas */
  score: number;
  correctSelected: number;
  wrongSelected: number;
  missed: number;
  tags: string[];
  /** explicação de cada armadilha escolhida */
  trapTexts: string[];
}

export function gradeMcqMulti(
  selected: readonly number[],
  answers: readonly number[],
  traps?: readonly string[],
): McqMultiResult {
  const answerSet = new Set(answers);
  let correctSelected = 0;
  let wrongSelected = 0;
  const tags: string[] = [];
  const trapTexts: string[] = [];
  for (const index of selected) {
    if (answerSet.has(index)) {
      correctSelected += 1;
    } else {
      wrongSelected += 1;
      const text = traps?.[index];
      if (typeof text === "string" && text.trim() !== "") {
        tags.push(`trap:${index}`);
        trapTexts.push(text);
      }
    }
  }
  const missed = answers.length - correctSelected;
  const raw =
    answers.length === 0
      ? 0
      : (Math.max(0, correctSelected - wrongSelected) / answers.length) * 100;
  return {
    score: Math.round(raw),
    correctSelected,
    wrongSelected,
    missed,
    tags,
    trapTexts,
  };
}
