// Re-order Paragraphs — PRD §9.2. Pares adjacentes corretos / (n − 1).
// Os parágrafos do banco estão na ordem correta; a resposta do aluno é a
// permutação de índices. Módulo puro.

export interface ReorderResult {
  /** 0–100: adjacentes corretos / (n − 1) */
  score: number;
  adjacentCorrect: number;
  maxAdjacent: number;
  /** índices das junções erradas (0-based: junção entre posição i e i+1) */
  brokenAt: number[];
}

export function gradeReorder(userOrder: readonly number[]): ReorderResult {
  const n = userOrder.length;
  const brokenAt: number[] = [];
  let adjacentCorrect = 0;
  for (let i = 0; i + 1 < n; i += 1) {
    const here = userOrder[i];
    const next = userOrder[i + 1];
    if (here !== undefined && next !== undefined && next === here + 1) {
      adjacentCorrect += 1;
    } else {
      brokenAt.push(i);
    }
  }
  const maxAdjacent = Math.max(0, n - 1);
  return {
    score: maxAdjacent === 0 ? 100 : Math.round((adjacentCorrect / maxAdjacent) * 100),
    adjacentCorrect,
    maxAdjacent,
    brokenAt,
  };
}
