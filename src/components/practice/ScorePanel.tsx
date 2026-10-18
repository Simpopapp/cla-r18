// Painel de resultado — PRD §10.1/§1.3. Base compartilhada pelos motores
// (Fases 4–5): nota do exercício (0–100), subscores honestos ("não avaliado"
// quando o app não mede) e o aviso de revisão SRS. Nunca mistura escalas.

import { Gauge } from "lucide-react";

import { DueNotice } from "@/components/common/DueNotice";
import type { QuestionSnapshot } from "@/lib/storage";

export interface ScoreSubscore {
  label: string;
  /** null = o app não mede (ex.: pronúncia) — exibido como "não avaliado" */
  value: number | null;
}

export interface ScoreResultView {
  /** nota do exercício, escala 0–100 (a estimativa 10–90 é outra superfície) */
  score: number | null;
  subscores: ScoreSubscore[];
  feedback?: string;
}

function scoreTone(score: number): string {
  if (score >= 75) return "text-success-foreground";
  if (score >= 50) return "text-warning-foreground";
  return "text-destructive";
}

export function ScorePanel({
  result,
  snapshot,
  now,
}: {
  result: ScoreResultView;
  snapshot: QuestionSnapshot | undefined;
  now: number;
}) {
  return (
    <section
      aria-label="Resultado do exercício"
      className="rounded-xl border border-border bg-card p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="inline-flex items-center gap-2 text-base font-semibold text-foreground">
          <Gauge aria-hidden="true" className="size-4" />
          Resultado
        </h2>
        <span className="text-xs text-muted-foreground">
          nota do exercício (0–100) — estimativa de treino, nunca nota oficial
        </span>
      </div>
      <p
        className={`mt-2 font-serif text-4xl font-bold ${result.score === null ? "text-muted-foreground" : scoreTone(result.score)}`}
      >
        {result.score === null ? "—" : result.score}
      </p>
      <ul className="mt-3 space-y-1.5">
        {result.subscores.map((sub) => (
          <li key={sub.label} className="flex items-center justify-between gap-3 text-sm">
            <span className="text-muted-foreground">{sub.label}</span>
            <span
              className={
                sub.value === null ? "text-muted-foreground" : "font-medium text-foreground"
              }
            >
              {sub.value === null ? "não avaliado" : sub.value}
            </span>
          </li>
        ))}
      </ul>
      {result.feedback ? (
        <p className="mt-3 rounded-lg border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
          {result.feedback}
        </p>
      ) : null}
      <div className="mt-3">
        <DueNotice snapshot={snapshot} now={now} />
      </div>
    </section>
  );
}
