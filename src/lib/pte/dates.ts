// Datas locais — PRD §7.2. Chaves de dia local "YYYY-MM-DD".
// Nunca somar 24 h fixas: tudo é calendário local (correto em mudança de horário de verão).
// Módulo puro: seguro para SSR e testes.

const DAY_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Chave de dia local de um timestamp: "YYYY-MM-DD". */
export function dayKey(ts: number): string {
  const d = new Date(ts);
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

/** Início do dia local de um timestamp (meia-noite local). */
export function startOfLocalDay(ts: number): number {
  const d = new Date(ts);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function parseKey(key: string): [year: number, monthIndex: number, day: number] | null {
  if (!DAY_KEY_RE.test(key)) return null;
  const year = Number(key.slice(0, 4));
  const month = Number(key.slice(5, 7));
  const day = Number(key.slice(8, 10));
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return null;
  }
  return [year, month - 1, day];
}

/**
 * Soma (ou subtrai) dias a uma chave de dia local, via calendário
 * (`new Date(y, m, d + n)`) — nunca via soma de 24 h fixas.
 * Chave inválida devolve a própria chave (não inventa data).
 */
export function addDays(key: string, n: number): string {
  const parsed = parseKey(key);
  if (!parsed) return key;
  const [year, monthIndex, day] = parsed;
  const shifted = new Date(year, monthIndex, day + n);
  return dayKey(shifted.getTime());
}

/**
 * Dias entre duas chaves de dia local (b − a). Meio-dia UTC evita
 * deslocamento de horário de verão. Chaves inválidas → NaN.
 */
export function daysBetween(keyA: string, keyB: string): number {
  const a = parseKey(keyA);
  const b = parseKey(keyB);
  if (!a || !b) return NaN;
  const ta = Date.UTC(a[0], a[1], a[2], 12);
  const tb = Date.UTC(b[0], b[1], b[2], 12);
  return Math.round((tb - ta) / 86_400_000);
}

/**
 * Sequência de dias com tentativas, iterando chaves locais (correta em DST).
 * Sem tentativas hoje, a sequência continua viva a partir de ontem.
 * Limitada a `maxDays` (D24 — exibida como "até N dias").
 */
export function computeStreak(
  daily: Record<string, { n: number }>,
  todayKey: string,
  maxDays: number,
): number {
  const isActive = (key: string): boolean => {
    const agg = daily[key];
    return !!agg && agg.n > 0;
  };
  let cursor = 0;
  if (!isActive(todayKey)) {
    cursor = 1;
    if (!isActive(addDays(todayKey, -1))) return 0;
  }
  let streak = 0;
  let key = addDays(todayKey, -cursor);
  while (streak < maxDays && isActive(key)) {
    streak += 1;
    key = addDays(key, -1);
  }
  return streak;
}

export interface DailyAverages {
  /** Média de tentativas por dia na janela. */
  avgAttempts: number;
  /** Nota média geral (média dos `sum` sobre os `scored`) na janela; null se nada pontuado. */
  avgScore: number | null;
}

/**
 * Médias diárias numa janela de `windowDays` dias locais terminando hoje
 * (inclusive). Iteração por chaves locais — correta em mudança de offset.
 * Limitada a `maxDays` (D24).
 */
export function dailyAverages(
  daily: Record<string, DailyAggregateLike>,
  todayKey: string,
  windowDays: number,
  maxDays: number,
): DailyAverages {
  const window = Math.max(0, Math.min(windowDays, maxDays));
  let n = 0;
  let scored = 0;
  let sum = 0;
  for (let i = 0; i < window; i += 1) {
    const agg = daily[addDays(todayKey, -i)];
    if (!agg) continue;
    n += agg.n;
    scored += agg.scored;
    sum += agg.sum;
  }
  return {
    avgAttempts: window === 0 ? 0 : n / window,
    avgScore: scored === 0 ? null : sum / scored,
  };
}

export interface DailyAggregateLike {
  n: number;
  scored: number;
  sum: number;
}
