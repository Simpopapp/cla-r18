// Campo de texto com contador de palavras em tempo real e zona-alvo
// (§9.4: swt 5–75 · sst 50–70 · essay 200–300).

import { Textarea } from "@/components/ui/textarea";
import { countWords } from "@/lib/pte/coverage";

export function WordCountZone({
  value,
  onChange,
  min,
  max,
  disabled = false,
  label,
  placeholder,
  minH = "min-h-40",
}: {
  value: string;
  onChange: (value: string) => void;
  min: number;
  max: number;
  disabled?: boolean;
  label: string;
  placeholder?: string;
  minH?: string;
}) {
  const words = countWords(value);
  const inZone = words >= min && words <= max;
  return (
    <div>
      <label htmlFor={label} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <Textarea
        id={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        className={`mt-1 ${minH}`}
      />
      <p
        aria-live="polite"
        className={`mt-1 text-xs ${inZone ? "text-success-foreground" : "text-warning-foreground"}`}
      >
        {words} {words === 1 ? "palavra" : "palavras"} — zona {min}–{max}
      </p>
    </div>
  );
}
