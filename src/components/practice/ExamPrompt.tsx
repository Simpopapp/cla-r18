/* eslint-disable react-refresh/only-export-components -- contexto + hook do mesmo domínio */
// Coordenação áudio × cronômetro do simulado — fidelidade F7. O runner arma o
// prazo de resposta só quando o enunciado em áudio termina; os motores avisam
// por este contexto (null fora do simulado).

import { createContext, useContext } from "react";

const ExamPromptContext = createContext<(() => void) | null>(null);

export const ExamPromptProvider = ExamPromptContext.Provider;

/** Chamado quando o áudio do enunciado termina (ou é interrompido). */
export function useExamPromptEnd(): (() => void) | null {
  return useContext(ExamPromptContext);
}
