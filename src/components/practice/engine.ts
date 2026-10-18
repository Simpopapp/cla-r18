// Tipos compartilhados dos motores de prática — PRD §10.2.
// O motor recebe a questão, envia o resultado e registra a tentativa no
// PracticeEngine (o shell exibe o ScorePanel).

import type { ScoreResultView } from "./ScorePanel";
import type { Question } from "@/lib/pte/types";

export interface EngineSubmitPayload {
  result: ScoreResultView;
  tags?: string[] | undefined;
  metrics?: Record<string, number> | undefined;
}

export interface EngineProps {
  mode?: "practice" | "exam";
  question: Question;
  onSubmit: (payload: EngineSubmitPayload) => void;
  /** true após o primeiro envio — motores travam a resposta */
  submitted: boolean;
  /**
   * Registra a função de auto-submit (tempo esgotado). O shell detém o
   * cronômetro; o motor registra no mount e limpa no unmount.
   */
  registerAutoSubmit: (fn: (() => void) | null) => void;
}
