// Selos de proveniência e de banco — PRD §6.2, D21. Estado sempre com ícone + texto
// (nunca só cor). Contagens e selos derivam do manifesto — nada hardcoded.

import { CheckCircle2, Hourglass, ShieldAlert } from "lucide-react";

import { isSmallBank, notReadyReason } from "@/lib/pte/manifest";
import type { Provenance, TaskType } from "@/lib/pte/types";

const PROVENANCE_TEXT: Record<Provenance, string> = {
  verificada: "fonte verificada",
  comunitaria: "fonte comunitária",
};

export function ProvenanceBadge({ provenance }: { provenance: Provenance }) {
  const verified = provenance === "verificada";
  return (
    <span
      className={
        verified
          ? "inline-flex min-h-6 items-center gap-1 rounded-full border border-success/40 bg-success/10 px-2 text-xs font-medium text-success-foreground"
          : "inline-flex min-h-6 items-center gap-1 rounded-full border border-info/40 bg-info/10 px-2 text-xs font-medium text-info-foreground"
      }
    >
      {verified ? (
        <CheckCircle2 aria-hidden="true" className="size-3.5" />
      ) : (
        <Hourglass aria-hidden="true" className="size-3.5" />
      )}
      {PROVENANCE_TEXT[provenance]}
    </span>
  );
}

/** Selo do banco: "em breve" (sem banco) ou "banco pequeno" (abaixo da meta). */
export function BankSeal({ type }: { type: TaskType }) {
  const reason = notReadyReason(type);
  if (reason) {
    return (
      <span className="inline-flex min-h-6 items-center gap-1 rounded-full border border-warning/50 bg-warning/10 px-2 text-xs font-medium text-warning-foreground">
        <ShieldAlert aria-hidden="true" className="size-3.5" />
        em breve — {reason}
      </span>
    );
  }
  if (isSmallBank(type)) {
    return (
      <span className="inline-flex min-h-6 items-center gap-1 rounded-full border border-warning/50 bg-warning/10 px-2 text-xs font-medium text-warning-foreground">
        <ShieldAlert aria-hidden="true" className="size-3.5" />
        banco pequeno
      </span>
    );
  }
  return null;
}
