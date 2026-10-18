import { describe, expect, it } from "vitest";

import { countdownLabel, daysUntil, targetVerdict } from "@/lib/pte/goal";
import { readinessOf, READINESS_LABELS, varietyOf } from "@/lib/pte/readiness";

const NOW = new Date(2026, 9, 17, 12, 0, 0).getTime(); // 2026-10-17 local 12:00

describe("daysUntil", () => {
  it("hoje = 0", () => {
    expect(daysUntil("2026-10-17", NOW)).toBe(0);
  });
  it("futuro conta dias de calendário", () => {
    expect(daysUntil("2026-10-20", NOW)).toBe(3);
  });
  it("passado → null", () => {
    expect(daysUntil("2026-10-16", NOW)).toBeNull();
  });
  it("inválido → null", () => {
    expect(daysUntil("não-é-data", NOW)).toBeNull();
  });
});

describe("countdownLabel", () => {
  it("falta N dias com alvo", () => {
    expect(countdownLabel("2026-10-20", 65, NOW)).toBe("Faltam 3 dias — alvo 65");
  });
  it("1 dia no singular", () => {
    expect(countdownLabel("2026-10-18", 79, NOW)).toBe("Faltam 1 dia — alvo 79");
  });
  it("hoje é a prova", () => {
    expect(countdownLabel("2026-10-17", 65, NOW)).toBe("A prova é hoje!");
  });
  it("sem data ou data passada → null", () => {
    expect(countdownLabel(null, 65, NOW)).toBeNull();
    expect(countdownLabel("2026-10-01", 65, NOW)).toBeNull();
  });
});

describe("targetVerdict", () => {
  it("sempre na escala 10–90, com gap explícito", () => {
    expect(targetVerdict(70, 65)).toBe("5 pontos acima do alvo");
    expect(targetVerdict(60, 65)).toBe("5 pontos abaixo do alvo");
    expect(targetVerdict(65, 65)).toBe("0 pontos acima do alvo");
    expect(targetVerdict(null, 65)).toContain("sem estimativa");
  });
});

describe("readinessOf", () => {
  it("rótulos por faixa de gap", () => {
    expect(readinessOf(70, 65, "alta").label).toBe("no-alvo");
    expect(readinessOf(63, 65, "alta").label).toBe("quase");
    expect(readinessOf(55, 65, "alta").label).toBe("em-progresso");
    expect(readinessOf(40, 65, "alta").label).toBe("distante");
  });
  it("confiança baixa → dados insuficientes, mesmo com número", () => {
    const result = readinessOf(80, 65, "baixa");
    expect(result.label).toBe("sem-dados");
    expect(result.gap).toBeNull();
    expect(READINESS_LABELS["sem-dados"]).toBe("Dados insuficientes");
  });
  it("sem estimativa → dados insuficientes", () => {
    expect(readinessOf(null, 65, "media").label).toBe("sem-dados");
  });
});

describe("varietyOf", () => {
  it("tipos tentados nos últimos 30 dias ÷ tipos da habilidade", () => {
    const attempted = new Set(["wfd", "sst", "read_aloud"] as const);
    const listening = varietyOf(attempted, "listening");
    expect(listening.total).toBeGreaterThan(0);
    expect(listening.tried).toBe(2); // wfd + sst
    expect(varietyOf(new Set(), "speaking").tried).toBe(0);
  });
});
