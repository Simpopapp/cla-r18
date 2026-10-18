// Aviso de revisão SRS — PRD §8/§10.1. Chip "Revisar hoje" quando a questão está vencida.

import { RefreshCcw } from "lucide-react";

import { isDue } from "@/lib/pte/srs";
import type { QuestionSnapshot } from "@/lib/storage";

export function DueNotice({
  snapshot,
  now,
  className = "",
}: {
  snapshot: QuestionSnapshot | undefined;
  now: number;
  className?: string;
}) {
  if (!isDue(snapshot, now)) return null;
  return (
    <span
      className={
        "inline-flex min-h-6 items-center gap-1 rounded-full border border-warning/50 bg-warning/10 px-2 text-xs font-medium text-warning-foreground " +
        className
      }
    >
      <RefreshCcw aria-hidden="true" className="size-3.5" />
      Revisar hoje
    </span>
  );
}
