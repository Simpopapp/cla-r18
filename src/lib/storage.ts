// Persistência e integridade — PRD §7 (D1, D2, D8, D9, D24).
// Estado v1 em localStorage com snapshot por questão; log truncável é só
// auditoria; quarentena nunca sobrescreve o bruto; versão futura é somente
// leitura; escrita coalescida (N mutações no mesmo tick = 1 setItem).
// Todo acesso a window/localStorage fica dentro de funções — SSR-safe.

import type { TaskType } from "@/lib/pte/types";
import type { ExamData } from "@/lib/pte/exam";
import { addDays, dayKey, daysBetween } from "@/lib/pte/dates";
import { applyAttemptToSnapshot, PASS_SCORE_BY_TYPE } from "@/lib/pte/srs";

// ---- Constantes únicas (C7) ----

export const STORAGE_KEY = "pte-hub-state";
export const UNDO_KEY = "pte-hub-undo";
export const QUARANTINE_PREFIX = "pte-hub-quarantine-";
export const STATE_VERSION = 1;
export const MAX_ATTEMPT_LOG = 2000;
export const MAX_SESSIONS = 100;
export const DAILY_RETENTION_DAYS = 180;
export const NOTE_MAX = 2000;
export const PRACTICAL_QUOTA_BYTES = 4 * 1024 * 1024;
export const QUOTA_WARN = 0.8;
export const BACKUP_REMINDER_DAYS = 14;
export const BACKUP_APP = "pte-master-hub";

// ---- Contratos de estado (PRD §7.1) ----

export interface QuestionSnapshot {
  attempts: number;
  bestScore: number | null;
  lastScore: number | null;
  lastAttemptAt: number;
  strongAttempts: number;
  box: number; // 0–5
  dueAt: number;
}

export interface DailyAggregate {
  n: number;
  scored: number;
  sum: number;
  byType: Partial<Record<TaskType, [n: number, sum: number]>>;
}

export type AttemptMode = "practice" | "session" | "exam";

export interface AttemptSubscores {
  content?: number | null;
  fluency?: number | null;
  pronunciation: null; // D5 — a Web Speech API não expõe pronúncia
}

export interface Attempt {
  id: string;
  qid: string;
  type: TaskType;
  ts: number;
  score: number | null;
  mode: AttemptMode;
  sub?: AttemptSubscores;
  metrics?: Record<string, number>;
  tags?: string[];
  wpm?: number;
}

export type SessionKind = "mixed" | "due" | "plan" | "errors" | "exam";

export interface SessionDraft {
  exam?: ExamData;
  kind: SessionKind;
  startedAt: number;
  ids: string[];
  cursor: number;
  results: number;
  sumScore: number;
}

export interface SessionRecord {
  exam?: ExamData;
  id: string;
  kind: SessionKind;
  startedAt: number;
  endedAt: number;
  n: number;
  sum: number;
}

export type Accent = "en-AU" | "en-US" | "en-GB";

export interface Settings {
  accent: Accent;
  modelRate: number; // 0,7–1,2
  dailyGoal: number; // 0–200
  examDate: string | null; // ISO "YYYY-MM-DD"
  targetScore: number; // 10–90
  onlyVerified: boolean;
  allowReplay: boolean;
  lastBackupAt: number | null;
  micNoticeSeen: boolean;
  plus: {
    wordTranslation: boolean;
    phraseTranslation: boolean;
    plusAudio: boolean;
  };
}

export interface AppState {
  version: 1;
  attempts: Attempt[]; // log truncável — só auditoria/diagnóstico
  questions: Record<string, QuestionSnapshot>; // fonte de verdade do SRS
  daily: Record<string, DailyAggregate>; // chave "YYYY-MM-DD" local
  dailyCutoff: string; // dia mais antigo retido
  bookmarks: string[];
  notes: Record<string, { text: string; updatedAt: number }>;
  sessions: SessionRecord[];
  draft: SessionDraft | null;
  settings: Settings;
}

export const DEFAULT_SETTINGS: Settings = {
  accent: "en-AU",
  modelRate: 1,
  dailyGoal: 20,
  examDate: null,
  targetScore: 65,
  onlyVerified: false,
  allowReplay: false,
  lastBackupAt: null,
  micNoticeSeen: false,
  plus: { wordTranslation: false, phraseTranslation: false, plusAudio: false },
};

export function emptyState(): AppState {
  return {
    version: STATE_VERSION,
    attempts: [],
    questions: {},
    daily: {},
    dailyCutoff: "",
    bookmarks: [],
    notes: {},
    sessions: [],
    draft: null,
    // clone raso: `settings` nunca pode ser o objeto compartilhado DEFAULT_SETTINGS
    settings: { ...DEFAULT_SETTINGS, plus: { ...DEFAULT_SETTINGS.plus } },
  };
}

/** Snapshot idêntico ao 1º render do cliente (C2 — hidratação). */
export const EMPTY_STATE: AppState = emptyState();

// ---- Normalização (campo a campo; inválido → default) ----

const ACCENTS: readonly Accent[] = ["en-AU", "en-US", "en-GB"];

function asBool(raw: unknown, fallback: boolean): boolean {
  return typeof raw === "boolean" ? raw : fallback;
}

function asInt(raw: unknown, min: number, max: number, fallback: number): number {
  if (typeof raw === "number" && Number.isInteger(raw) && raw >= min && raw <= max) {
    return raw;
  }
  return fallback;
}

export function normalizeSettings(raw: unknown): Settings {
  if (!isPlainObject(raw)) return DEFAULT_SETTINGS;
  const accent = ACCENTS.find((a) => a === raw["accent"]) ?? DEFAULT_SETTINGS.accent;
  const modelRate =
    typeof raw["modelRate"] === "number" &&
    Number.isFinite(raw["modelRate"]) &&
    raw["modelRate"] >= 0.7 &&
    raw["modelRate"] <= 1.2
      ? raw["modelRate"]
      : DEFAULT_SETTINGS.modelRate;
  const examDate =
    typeof raw["examDate"] === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw["examDate"])
      ? raw["examDate"]
      : null;
  const lastBackupAt =
    typeof raw["lastBackupAt"] === "number" && Number.isFinite(raw["lastBackupAt"])
      ? raw["lastBackupAt"]
      : null;
  const plus = isPlainObject(raw["plus"]) ? raw["plus"] : undefined;
  return {
    accent,
    modelRate,
    dailyGoal: asInt(raw["dailyGoal"], 0, 200, DEFAULT_SETTINGS.dailyGoal),
    examDate,
    targetScore: asInt(raw["targetScore"], 10, 90, DEFAULT_SETTINGS.targetScore),
    onlyVerified: asBool(raw["onlyVerified"], DEFAULT_SETTINGS.onlyVerified),
    allowReplay: asBool(raw["allowReplay"], DEFAULT_SETTINGS.allowReplay),
    lastBackupAt,
    micNoticeSeen: asBool(raw["micNoticeSeen"], DEFAULT_SETTINGS.micNoticeSeen),
    plus: {
      wordTranslation: plus ? asBool(plus["wordTranslation"], false) : false,
      phraseTranslation: plus ? asBool(plus["phraseTranslation"], false) : false,
      plusAudio: plus ? asBool(plus["plusAudio"], false) : false,
    },
  };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// ---- Validação estrutural (D8) ----

export function isStateShape(raw: unknown): boolean {
  if (!isPlainObject(raw)) return false;
  if (typeof raw["version"] !== "number" || !Number.isInteger(raw["version"])) return false;
  if (!Array.isArray(raw["attempts"])) return false;
  if (!isPlainObject(raw["questions"])) return false;
  if (!isPlainObject(raw["daily"])) return false;
  if (typeof raw["dailyCutoff"] !== "string") return false;
  if (!Array.isArray(raw["bookmarks"])) return false;
  if (!isPlainObject(raw["notes"])) return false;
  if (!Array.isArray(raw["sessions"])) return false;
  if (raw["draft"] !== null && !isPlainObject(raw["draft"])) return false;
  if (!isPlainObject(raw["settings"])) return false;
  return true;
}

// ---- Migração (infraestrutura pronta; vazio na v1) ----

export const MIGRATIONS: Record<number, (state: AppState) => AppState> = {};

// ---- Acesso seguro ao storage ----

function storage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function safeWrite(key: string, value: string): boolean {
  const store = storage();
  if (!store) return false;
  try {
    store.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

// ---- Load / quarentena / versão futura ----

export type LoadStatus = "empty" | "ok" | "quarantined" | "future";

export interface LoadedState {
  state: AppState;
  status: LoadStatus;
  raw: string | null;
}

function bestEffortState(raw: Record<string, unknown>): AppState {
  return {
    version: STATE_VERSION,
    attempts: Array.isArray(raw["attempts"]) ? (raw["attempts"] as Attempt[]) : [],
    questions: isPlainObject(raw["questions"])
      ? (raw["questions"] as Record<string, QuestionSnapshot>)
      : {},
    daily: isPlainObject(raw["daily"]) ? (raw["daily"] as Record<string, DailyAggregate>) : {},
    dailyCutoff: typeof raw["dailyCutoff"] === "string" ? raw["dailyCutoff"] : "",
    bookmarks: Array.isArray(raw["bookmarks"]) ? (raw["bookmarks"] as string[]) : [],
    notes: isPlainObject(raw["notes"]) ? (raw["notes"] as AppState["notes"]) : {},
    sessions: Array.isArray(raw["sessions"]) ? (raw["sessions"] as SessionRecord[]) : [],
    draft: null,
    settings: normalizeSettings(raw["settings"]),
  };
}

function quarantine(raw: string): LoadedState {
  safeWrite(`${QUARANTINE_PREFIX}${Date.now()}`, raw);
  return { state: emptyState(), status: "quarantined", raw };
}

function finalize(state: AppState): AppState {
  return { ...state, settings: normalizeSettings(state.settings) };
}

export function load(): LoadedState {
  const store = storage();
  if (!store) return { state: emptyState(), status: "empty", raw: null };
  let raw: string | null;
  try {
    raw = store.getItem(STORAGE_KEY);
  } catch {
    return { state: emptyState(), status: "empty", raw: null };
  }
  if (raw === null || raw === "") return { state: emptyState(), status: "empty", raw: null };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return quarantine(raw);
  }
  if (!isStateShape(parsed)) return quarantine(raw);
  const record = parsed as Record<string, unknown>;
  const version = record["version"] as number;
  if (version > STATE_VERSION) {
    // Versão futura: modo somente-leitura cabe ao store; payload preservado byte a byte.
    return { state: bestEffortState(record), status: "future", raw };
  }
  if (version < 1) return quarantine(raw);
  let migrated = record as unknown as AppState;
  for (let v = version; v < STATE_VERSION; v += 1) {
    const step = MIGRATIONS[v];
    if (!step) return quarantine(raw);
    migrated = step(migrated);
  }
  return { state: finalize(migrated), status: "ok", raw: null };
}

// ---- Escrita coalescida + quota + falha de persistência ----

let pending: AppState | null = null;
let scheduled = false;
let persistFailed = false;
let quotaWarned = false;
let persistRequested = false;

const persistErrorListeners = new Set<() => void>();
const quotaListeners = new Set<() => void>();

export function estimateStateBytes(state: AppState): number {
  const text = JSON.stringify(state);
  if (typeof TextEncoder !== "undefined") return new TextEncoder().encode(text).length;
  return text.length * 2;
}

export interface QuotaStatus {
  bytes: number;
  warn: boolean;
  limit: number;
}

export function quotaStatus(state: AppState): QuotaStatus {
  const bytes = estimateStateBytes(state);
  return {
    bytes,
    warn: bytes >= QUOTA_WARN * PRACTICAL_QUOTA_BYTES,
    limit: PRACTICAL_QUOTA_BYTES,
  };
}

/** Enfileira o estado para gravação coalescida (usado pelo store). */
export function schedulePersist(state: AppState): void {
  pending = state;
  if (scheduled) return;
  scheduled = true;
  queueMicrotask(flushWrites);
}

/** Esvazia a fila coalescida: 1 `setItem` com o estado mais recente. */
export function flushWrites(): void {
  if (!scheduled) return;
  scheduled = false;
  const state = pending;
  pending = null;
  if (!state) return;
  const status = quotaStatus(state);
  if (status.warn && !quotaWarned) {
    quotaWarned = true;
    for (const listener of quotaListeners) listener();
  }
  if (!safeWrite(STORAGE_KEY, JSON.stringify(state))) {
    persistFailed = true;
    for (const listener of persistErrorListeners) listener();
  }
}

export function isPersistFailed(): boolean {
  return persistFailed;
}

export function isQuotaWarned(): boolean {
  return quotaWarned;
}

export function onPersistError(listener: () => void): () => void {
  persistErrorListeners.add(listener);
  return () => {
    persistErrorListeners.delete(listener);
  };
}

export function onQuotaWarning(listener: () => void): () => void {
  quotaListeners.add(listener);
  return () => {
    quotaListeners.delete(listener);
  };
}

/** Reset do estado de escrita (uso exclusivo de testes). */
export function resetWriteStateForTests(): void {
  pending = null;
  scheduled = false;
  persistFailed = false;
  quotaWarned = false;
  persistRequested = false;
}

/** `navigator.storage.persist()` — solicitado após a 1ª tentativa gravada. */
export async function requestPersistentStorage(): Promise<boolean | null> {
  if (persistRequested || typeof navigator === "undefined") return null;
  const nav = navigator as Navigator & { storage?: { persist?: () => Promise<boolean> } };
  const storageApi = nav.storage;
  if (!storageApi || typeof storageApi.persist !== "function") return null;
  persistRequested = true;
  try {
    return await storageApi.persist();
  } catch {
    return null;
  }
}

// ---- Ids canônicos (§5.3 — aliases.json chega na Fase 2) ----

let qidResolver: (id: string) => string = (id) => id;

export function setQidResolver(resolver: (id: string) => string): void {
  qidResolver = resolver;
}

export function resolveQid(id: string): string {
  return qidResolver(id);
}

// ---- Mutações puras (o store agenda a gravação) ----

/** §7.2: snapshot → agregado diário → log → só então trunca o log. */
export function recordAttempt(state: AppState, attempt: Attempt): AppState {
  const qid = resolveQid(attempt.qid);
  const passScore = PASS_SCORE_BY_TYPE[attempt.type] ?? 75;
  const questions: Record<string, QuestionSnapshot> = { ...state.questions };
  questions[qid] = applyAttemptToSnapshot(questions[qid], { ...attempt, qid }, passScore);

  const key = dayKey(attempt.ts);
  const prevDay = state.daily[key] ?? { n: 0, scored: 0, sum: 0, byType: {} };
  const scoredAdd = attempt.score === null ? 0 : 1;
  const sumAdd = attempt.score === null ? 0 : attempt.score;
  const prevPair = prevDay.byType[attempt.type];
  const daily: Record<string, DailyAggregate> = {
    ...state.daily,
    [key]: {
      n: prevDay.n + 1,
      scored: prevDay.scored + scoredAdd,
      sum: prevDay.sum + sumAdd,
      byType: {
        ...prevDay.byType,
        [attempt.type]: [(prevPair?.[0] ?? 0) + 1, (prevPair?.[1] ?? 0) + sumAdd],
      },
    },
  };

  // Poda além da retenção (D24).
  const cutoff = addDays(key, -(DAILY_RETENTION_DAYS - 1));
  for (const day of Object.keys(daily)) {
    if (daysBetween(cutoff, day) < 0) delete daily[day];
  }
  let dailyCutoff = "";
  for (const day of Object.keys(daily)) {
    if (dailyCutoff === "" || day < dailyCutoff) dailyCutoff = day;
  }

  const attempts = [...state.attempts, attempt];
  const truncated =
    attempts.length > MAX_ATTEMPT_LOG
      ? attempts.slice(attempts.length - MAX_ATTEMPT_LOG)
      : attempts;

  void requestPersistentStorage();

  return {
    ...state,
    questions,
    daily,
    dailyCutoff,
    attempts: truncated,
  };
}

export function toggleBookmark(state: AppState, qid: string): AppState {
  const id = resolveQid(qid);
  const has = state.bookmarks.includes(id);
  return {
    ...state,
    bookmarks: has ? state.bookmarks.filter((b) => b !== id) : [...state.bookmarks, id],
  };
}

export function upsertNote(state: AppState, qid: string, text: string): AppState {
  const id = resolveQid(qid);
  const trimmed = text.trim();
  const notes = { ...state.notes };
  if (trimmed === "") {
    delete notes[id];
  } else {
    notes[id] = { text: trimmed.slice(0, NOTE_MAX), updatedAt: Date.now() };
  }
  return { ...state, notes };
}

export function updateSettings(state: AppState, patch: Partial<Settings>): AppState {
  return { ...state, settings: normalizeSettings({ ...state.settings, ...patch }) };
}

/** Inicia (ou reinicia) uma sessão: fila de ids + cursor em 0. */
export function startSession(
  state: AppState,
  kind: SessionKind,
  ids: readonly string[],
  now: number,
): AppState {
  return {
    ...state,
    draft: {
      kind,
      startedAt: now,
      ids: [...ids],
      cursor: 0,
      results: 0,
      sumScore: 0,
    },
  };
}

/** Descarta o rascunho sem arquivar (banner "Descartar" da sessão). */
export function discardDraft(state: AppState): AppState {
  if (!state.draft) return state;
  return { ...state, draft: null };
}

/**
 * Avança a sessão após a resposta de `qid` (§7.2 — draft salvo a cada
 * resposta). Só avança se `qid` for a questão atual do cursor.
 */
export function advanceSession(state: AppState, qid: string, score: number | null): AppState {
  const draft = state.draft;
  if (!draft) return state;
  const current = draft.ids[draft.cursor];
  if (current === undefined || current !== qid) return state;
  return {
    ...state,
    draft: {
      ...draft,
      cursor: draft.cursor + 1,
      results: draft.results + 1,
      sumScore: draft.sumScore + (score ?? 0),
    },
  };
}

/** Sessão percorrida até o fim? */
export function isSessionComplete(state: AppState): boolean {
  const draft = state.draft;
  if (!draft) return false;
  return draft.cursor >= draft.ids.length;
}

export function saveDraft(state: AppState, draft: SessionDraft): AppState {
  return { ...state, draft };
}

/** Arquiva o rascunho como SessionRecord só se houve ≥ 1 resultado (§7.2). */
export function endSession(state: AppState, now: number, id?: string): AppState {
  const draft = state.draft;
  if (!draft) return state;
  let sessions = state.sessions;
  if (draft.results >= 1) {
    const record: SessionRecord = {
      id: id ?? `sess-${now}`,
      kind: draft.kind,
      startedAt: draft.startedAt,
      endedAt: now,
      n: draft.results,
      sum: draft.sumScore,
    };
    sessions = [...state.sessions, record].slice(-MAX_SESSIONS);
  }
  return { ...state, sessions, draft: null };
}

/** Média por tipo das tentativas de sessão desde `sinceTs` (resumo final). */
export function sessionAveragesByType(
  state: AppState,
  sinceTs: number,
): Partial<Record<TaskType, [n: number, sum: number]>> {
  const out: Partial<Record<TaskType, [number, number]>> = {};
  for (const attempt of state.attempts) {
    if (attempt.mode !== "session" || attempt.ts < sinceTs || attempt.score === null) continue;
    const pair = out[attempt.type];
    out[attempt.type] = [(pair?.[0] ?? 0) + 1, (pair?.[1] ?? 0) + attempt.score];
  }
  return out;
}

// ---- Backup, importação e desfazer (§7.4, D9) ----

export interface BackupEnvelope {
  app: string;
  version: number;
  exportedAt: number;
  state: AppState;
}

/** Exporta o envelope v1 e atualiza `lastBackupAt`. */
export function exportBackup(state: AppState, now: number): { text: string; state: AppState } {
  const next = updateSettings(state, { lastBackupAt: now });
  const envelope: BackupEnvelope = {
    app: BACKUP_APP,
    version: STATE_VERSION,
    exportedAt: now,
    state: next,
  };
  return { text: JSON.stringify(envelope), state: next };
}

export interface BackupPreview {
  valid: boolean;
  reason?: string;
  version: number;
  exportedAt: number;
  attempts: number;
  period: { first: number; last: number } | null;
  bookmarks: number;
  sessions: number;
  questions: number;
  comparison: { currentAttempts: number; currentQuestions: number; currentSessions: number };
}

function maxNullable(a: number | null, b: number | null): number | null {
  if (a === null) return b;
  if (b === null) return a;
  return Math.max(a, b);
}

/** Mescla (§7.4): snapshots por qid, uniões com tetos, `daily` pelo maior `n`. */
export function mergeStates(current: AppState, incoming: AppState): AppState {
  const questions: Record<string, QuestionSnapshot> = { ...current.questions };
  for (const [qid, inc] of Object.entries(incoming.questions)) {
    const cur = questions[qid];
    if (!cur) {
      questions[qid] = inc;
      continue;
    }
    const recent = inc.lastAttemptAt > cur.lastAttemptAt ? inc : cur;
    questions[qid] = {
      attempts: cur.attempts + inc.attempts,
      bestScore: maxNullable(cur.bestScore, inc.bestScore),
      strongAttempts: Math.max(cur.strongAttempts, inc.strongAttempts),
      lastAttemptAt: Math.max(cur.lastAttemptAt, inc.lastAttemptAt),
      lastScore: recent.lastScore,
      box: recent.box,
      dueAt: recent.dueAt,
    };
  }

  const bookmarks = [...new Set([...current.bookmarks, ...incoming.bookmarks])];

  const notes: AppState["notes"] = { ...current.notes };
  for (const [qid, note] of Object.entries(incoming.notes)) {
    const cur = notes[qid];
    if (!cur || note.updatedAt > cur.updatedAt) notes[qid] = note;
  }

  const sessionsById = new Map<string, SessionRecord>();
  for (const session of [...current.sessions, ...incoming.sessions]) {
    sessionsById.set(session.id, session);
  }
  const sessions = [...sessionsById.values()]
    .sort((a, b) => a.endedAt - b.endedAt)
    .slice(-MAX_SESSIONS);

  const attemptsById = new Map<string, Attempt>();
  for (const attempt of [...current.attempts, ...incoming.attempts]) {
    attemptsById.set(attempt.id, attempt);
  }
  const attempts = [...attemptsById.values()].sort((a, b) => a.ts - b.ts).slice(-MAX_ATTEMPT_LOG);

  const daily: Record<string, DailyAggregate> = { ...current.daily };
  for (const [key, inc] of Object.entries(incoming.daily)) {
    const cur = daily[key];
    if (!cur || inc.n > cur.n) daily[key] = inc;
  }
  let dailyCutoff = "";
  for (const day of Object.keys(daily)) {
    if (dailyCutoff === "" || day < dailyCutoff) dailyCutoff = day;
  }

  return {
    version: STATE_VERSION,
    attempts,
    questions,
    daily,
    dailyCutoff,
    bookmarks,
    notes,
    sessions,
    draft: current.draft,
    settings: current.settings,
  };
}

interface ParsedBackup {
  envelope: BackupEnvelope;
}

function parseEnvelope(
  text: string,
): { ok: true; parsed: ParsedBackup } | { ok: false; reason: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, reason: "JSON inválido" };
  }
  if (!isPlainObject(parsed)) return { ok: false, reason: "envelope inválido" };
  if (parsed["app"] !== BACKUP_APP) return { ok: false, reason: "não é um backup deste app" };
  if (typeof parsed["version"] !== "number" || !Number.isInteger(parsed["version"])) {
    return { ok: false, reason: "versão inválida" };
  }
  if (typeof parsed["exportedAt"] !== "number")
    return { ok: false, reason: "data de exportação inválida" };
  if (!isStateShape(parsed["state"])) return { ok: false, reason: "estado inválido" };
  const version = parsed["version"] as number;
  if (version > STATE_VERSION) {
    return { ok: false, reason: "backup de versão mais recente do app" };
  }
  const rawState = parsed["state"] as Record<string, unknown>;
  let migrated = rawState as unknown as AppState;
  for (let v = version; v < STATE_VERSION; v += 1) {
    const step = MIGRATIONS[v];
    if (!step) return { ok: false, reason: `versão ${version} sem migração conhecida` };
    migrated = step(migrated);
  }
  return {
    ok: true,
    parsed: {
      envelope: {
        app: BACKUP_APP,
        version: STATE_VERSION,
        exportedAt: parsed["exportedAt"] as number,
        state: finalize(migrated),
      },
    },
  };
}

/** Valida sem aplicar; devolve prévia para a UI (§7.4 passo 2). */
export function parseBackup(text: string, current: AppState): BackupPreview {
  const parsed = parseEnvelope(text);
  const comparison = {
    currentAttempts: current.attempts.length,
    currentQuestions: Object.keys(current.questions).length,
    currentSessions: current.sessions.length,
  };
  if (!parsed.ok) {
    return {
      valid: false,
      reason: parsed.reason,
      version: 0,
      exportedAt: 0,
      attempts: 0,
      period: null,
      bookmarks: 0,
      sessions: 0,
      questions: 0,
      comparison,
    };
  }
  const state = parsed.parsed.envelope.state;
  let period: BackupPreview["period"] = null;
  if (state.attempts.length > 0) {
    const first = state.attempts[0];
    const last = state.attempts[state.attempts.length - 1];
    if (first && last) period = { first: first.ts, last: last.ts };
  }
  return {
    valid: true,
    version: parsed.parsed.envelope.version,
    exportedAt: parsed.parsed.envelope.exportedAt,
    attempts: state.attempts.length,
    period,
    bookmarks: state.bookmarks.length,
    sessions: state.sessions.length,
    questions: Object.keys(state.questions).length,
    comparison,
  };
}

export interface ApplyBackupResult {
  ok: boolean;
  reason?: string;
  state: AppState | null;
  undoWritten: boolean;
}

/** Passos 3–4 do fluxo: escolher modo → cópia de desfazer → aplicar. */
export function applyBackup(
  text: string,
  mode: "replace" | "merge",
  current: AppState,
): ApplyBackupResult {
  const parsed = parseEnvelope(text);
  if (!parsed.ok) return { ok: false, reason: parsed.reason, state: null, undoWritten: false };
  const undoWritten = safeWrite(UNDO_KEY, JSON.stringify(current));
  if (mode === "replace") {
    return {
      ok: true,
      state: { ...parsed.parsed.envelope.state, draft: current.draft },
      undoWritten,
    };
  }
  return { ok: true, state: mergeStates(current, parsed.parsed.envelope.state), undoWritten };
}

/** Restaura a cópia de desfazer; a cópia fica até a próxima importação/reset. */
export function undo(): AppState | null {
  const store = storage();
  if (!store) return null;
  let raw: string | null;
  try {
    raw = store.getItem(UNDO_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!isStateShape(parsed)) return null;
    return finalize(parsed as unknown as AppState);
  } catch {
    return null;
  }
}

export interface ResetResult {
  state: AppState;
  undoWritten: boolean;
}

/** Zerar progresso preserva Ajustes e cria a cópia de desfazer (§7.4). */
export function resetProgress(current: AppState): ResetResult {
  const undoWritten = safeWrite(UNDO_KEY, JSON.stringify(current));
  return { state: { ...emptyState(), settings: current.settings }, undoWritten };
}
