// Medidor de nível do microfone — PRD §10.1 (AnalyserNode → visual).
// Apenas visual (aria-hidden); o estado é anunciado por texto nos controles.

const BARS = 5;

export function MicLevelMeter({ level, active }: { level: number; active: boolean }) {
  const lit = active ? Math.min(BARS, Math.ceil(level * BARS)) : 0;
  return (
    <div aria-hidden="true" className="flex items-end gap-1" data-testid="mic-level">
      {Array.from({ length: BARS }, (_, i) => (
        <span
          key={i}
          className={`w-1.5 rounded-sm transition-all duration-100 ${
            i < lit ? "h-4 bg-primary" : "h-1.5 bg-muted"
          }`}
        />
      ))}
    </div>
  );
}
