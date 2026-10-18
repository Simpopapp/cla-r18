// Metas do banco por tipo (PRD §6.6) e prioridade de busca (P0→P3).
// Metas, não obrigações: abaixo da mínima → selo "banco pequeno"; zero → "em breve" com motivo (D21).

import type { TaskType } from "./types";

export interface BankTarget {
  /** contagem mínima para prática confiável (abaixo → "banco pequeno") */
  min: number;
  /** contagem ideal */
  ideal: number;
}

export const BANK_TARGETS: Record<TaskType, BankTarget> = {
  wfd: { min: 300, ideal: 900 },
  read_aloud: { min: 100, ideal: 200 },
  read_fib_dropdown: { min: 40, ideal: 80 },
  repeat_sentence: { min: 200, ideal: 550 },
  describe_image: { min: 20, ideal: 60 },
  read_fib_drag: { min: 20, ideal: 50 },
  sst: { min: 60, ideal: 120 },
  retell_lecture: { min: 40, ideal: 80 },
  read_mcq_single: { min: 60, ideal: 110 },
  lst_fib: { min: 60, ideal: 100 },
  answer_short: { min: 80, ideal: 140 },
  read_mcq_multi: { min: 20, ideal: 50 },
  lst_hcs: { min: 20, ideal: 50 },
  sgd: { min: 12, ideal: 40 },
  reorder_paragraphs: { min: 40, ideal: 80 },
  lst_smw: { min: 20, ideal: 50 },
  rts: { min: 30, ideal: 60 },
  swt: { min: 40, ideal: 80 },
  lst_hiw: { min: 20, ideal: 50 },
  write_essay: { min: 30, ideal: 60 },
  lst_mcq_single: { min: 20, ideal: 50 },
  lst_mcq_multi: { min: 20, ideal: 50 },
};

// Prioridade de busca: tipos mais escassos primeiro (PRD §6.6).
export const SEARCH_PRIORITY: Record<"P0" | "P1" | "P2" | "P3", readonly TaskType[]> = {
  P0: [
    "lst_hcs",
    "lst_hiw",
    "lst_smw",
    "lst_mcq_single",
    "lst_mcq_multi",
    "answer_short",
    "read_mcq_multi",
    "sgd",
    "rts",
    "describe_image",
  ],
  P1: [
    "swt",
    "retell_lecture",
    "write_essay",
    "read_mcq_single",
    "read_fib_dropdown",
    "read_fib_drag",
    "reorder_paragraphs",
  ],
  P2: ["lst_fib", "sst", "read_aloud"],
  P3: ["wfd", "repeat_sentence"],
};
