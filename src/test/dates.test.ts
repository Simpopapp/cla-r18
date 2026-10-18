import { describe, expect, it } from "vitest";
import {
  addDays,
  computeStreak,
  dailyAverages,
  dayKey,
  daysBetween,
  startOfLocalDay,
} from "@/lib/pte/dates";

// Fase 1 — datas locais: calendário, nunca 24 h fixas (PRD §7.2).

describe("dayKey / startOfLocalDay", () => {
  it("formata a data local, não UTC", () => {
    // 23:30 local em 17/10/2026 pode já ser outro dia em UTC.
    const lateNight = new Date(2026, 9, 17, 23, 30).getTime();
    expect(dayKey(lateNight)).toBe("2026-10-17");
    expect(dayKey(new Date(2026, 0, 2, 0, 0).getTime())).toBe("2026-01-02");
  });

  it("startOfLocalDay zera horas do dia local", () => {
    const ts = new Date(2026, 9, 17, 15, 42).getTime();
    expect(new Date(startOfLocalDay(ts)).getHours()).toBe(0);
    expect(new Date(startOfLocalDay(ts)).getDate()).toBe(17);
  });
});

describe("addDays", () => {
  it("atravessa mês e ano pelo calendário", () => {
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDays("2026-02-28", 1)).toBe("2026-03-01");
    expect(addDays("2025-12-31", 1)).toBe("2026-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("não inventa data para chave inválida", () => {
    expect(addDays("lixeira", 1)).toBe("lixeira");
  });
});

describe("daysBetween", () => {
  it("conta dias entre chaves, nos dois sentidos", () => {
    expect(daysBetween("2026-10-01", "2026-10-17")).toBe(16);
    expect(daysBetween("2026-10-17", "2026-10-01")).toBe(-16);
    expect(daysBetween("2026-10-17", "2026-10-17")).toBe(0);
  });

  it("é imune a deslocamento de horário (meio-dia UTC)", () => {
    // Chaves atravessando fim de mês e bissexto.
    expect(daysBetween("2028-02-28", "2028-03-01")).toBe(2);
    expect(daysBetween("2027-02-28", "2027-03-01")).toBe(1);
  });

  it("chave inválida → NaN", () => {
    expect(daysBetween("x", "2026-10-17")).toBeNaN();
  });
});

describe("computeStreak", () => {
  const daily = (keys: string[]): Record<string, { n: number }> =>
    Object.fromEntries(keys.map((k) => [k, { n: 1 }]));

  it("conta dias consecutivos até hoje", () => {
    const keys = ["2026-10-17", "2026-10-16", "2026-10-15"];
    expect(computeStreak(daily(keys), "2026-10-17", 180)).toBe(3);
  });

  it("sem tentativas hoje, a sequência continua viva a partir de ontem", () => {
    const keys = ["2026-10-16", "2026-10-15"];
    expect(computeStreak(daily(keys), "2026-10-17", 180)).toBe(2);
  });

  it("buraco quebra a sequência", () => {
    const keys = ["2026-10-17", "2026-10-15"];
    expect(computeStreak(daily(keys), "2026-10-17", 180)).toBe(1);
  });

  it("é limitada pelo teto (até N dias)", () => {
    const keys: string[] = [];
    for (let i = 0; i < 10; i += 1) keys.push(addDays("2026-10-17", -i));
    expect(computeStreak(daily(keys), "2026-10-17", 5)).toBe(5);
  });
});

describe("dailyAverages", () => {
  it("média na janela local, incluindo dias vazios", () => {
    const daily: Record<string, { n: number; scored: number; sum: number }> = {
      "2026-10-17": { n: 4, scored: 3, sum: 240 },
      "2026-10-15": { n: 2, scored: 1, sum: 60 },
    };
    const result = dailyAverages(daily, "2026-10-17", 3, 180);
    expect(result.avgAttempts).toBe(2); // 6 tentativas / 3 dias
    expect(result.avgScore).toBe(75); // 300 / 4 pontuadas
  });

  it("janela maior que a retenção é limitada (D24)", () => {
    const daily: Record<string, { n: number; scored: number; sum: number }> = {
      "2026-10-17": { n: 1, scored: 0, sum: 0 },
    };
    expect(dailyAverages(daily, "2026-10-17", 999, 180).avgAttempts).toBe(1 / 180);
  });
});
