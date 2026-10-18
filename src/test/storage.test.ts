import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Attempt, AppState, QuestionSnapshot } from "@/lib/storage";

// Fase 1 — probes de integridade (PRD §16, Fase 1, aceites 1–8, D2, D8, D9, D24).

const flushAsync = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

function attempt(id: string, ts: number, score: number | null): Attempt {
  return { id, qid: "swt-001", type: "swt", ts, score, mode: "practice" };
}

function baseState(): AppState {
  return {
    version: 1,
    attempts: [],
    questions: {},
    daily: {},
    dailyCutoff: "",
    bookmarks: [],
    notes: {},
    sessions: [],
    draft: null,
    settings: {
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
    },
  };
}

const snapOf = (partial: Partial<QuestionSnapshot>): QuestionSnapshot => ({
  attempts: 0,
  bestScore: null,
  lastScore: null,
  lastAttemptAt: 0,
  strongAttempts: 0,
  box: 0,
  dueAt: 0,
  ...partial,
});

beforeEach(() => {
  window.localStorage.clear();
});

describe("probe 1 — teto do log nunca apaga memória de revisão (D2)", () => {
  it("5.100 tentativas com caixa 3: snapshot permanece e o log fica ≤ 2.000", async () => {
    const { recordAttempt, MAX_ATTEMPT_LOG } = await import("@/lib/storage");
    const state = baseState();
    state.questions["swt-001"] = snapOf({
      attempts: 5100,
      box: 3,
      bestScore: 88,
      lastScore: 82,
      lastAttemptAt: 1000,
      strongAttempts: 3,
      dueAt: 9000,
    });
    state.attempts = Array.from({ length: MAX_ATTEMPT_LOG }, (_, i) => attempt(`a-${i}`, i, null));

    const next = recordAttempt(state, attempt("novo-1", 10_000, null));
    expect(next.questions["swt-001"]?.attempts).toBe(5101);
    expect(next.questions["swt-001"]?.box).toBe(3);
    expect(next.questions["swt-001"]?.bestScore).toBe(88);
    expect(next.attempts.length).toBe(MAX_ATTEMPT_LOG);
    expect(next.attempts[0]?.id).toBe("a-1"); // o mais antigo saiu
    expect(next.attempts[next.attempts.length - 1]?.id).toBe("novo-1");
  });
});

describe("probe 2 — quarentena e versão futura (D8)", () => {
  it("payload corrompido → cópia bruta em quarentena + estado limpo", async () => {
    const { load, QUARANTINE_PREFIX, STORAGE_KEY } = await import("@/lib/storage");
    const raw = "{isto não é json";
    window.localStorage.setItem(STORAGE_KEY, raw);
    const loaded = load();
    expect(loaded.status).toBe("quarantined");
    expect(loaded.state).toEqual((await import("@/lib/storage")).emptyState());
    const quarantineKey = Object.keys(window.localStorage).find((k) =>
      k.startsWith(QUARANTINE_PREFIX),
    );
    expect(quarantineKey).toBeTruthy();
    expect(window.localStorage.getItem(quarantineKey ?? "")).toBe(raw);
    // O original nunca é sobrescrito.
    expect(window.localStorage.getItem(quarantineKey ?? "")).not.toBeNull();
  });

  it("estrutura inválida (não JSON quebrado) também vai para quarentena", async () => {
    const { load, QUARANTINE_PREFIX, STORAGE_KEY } = await import("@/lib/storage");
    const raw = JSON.stringify({ qualquer: "coisa" });
    window.localStorage.setItem(STORAGE_KEY, raw);
    expect(load().status).toBe("quarantined");
    const quarantineKey = Object.keys(window.localStorage).find((k) =>
      k.startsWith(QUARANTINE_PREFIX),
    );
    expect(window.localStorage.getItem(quarantineKey ?? "")).toBe(raw);
  });

  it("versão futura: somente leitura e payload preservado byte a byte", async () => {
    vi.resetModules();
    const storage = await import("@/lib/storage");
    const store = await import("@/lib/useAppState");
    const raw = JSON.stringify({
      version: 2,
      attempts: [],
      questions: {},
      daily: {},
      dailyCutoff: "",
      bookmarks: [],
      notes: {},
      sessions: [],
      draft: null,
      settings: {},
    });
    window.localStorage.setItem(storage.STORAGE_KEY, raw);

    store.hydrateAppState();
    expect(store.getAppStatus()).toBe("future");
    expect(store.isStateReadonly()).toBe(true);

    // Tentativa de mutação é ignorada.
    store.mutateAppState((state) => storage.recordAttempt(state, attempt("a-1", 1, 90)));
    expect(store.getAppState().attempts).toHaveLength(0);
    expect(window.localStorage.getItem(storage.STORAGE_KEY)).toBe(raw); // byte a byte
  });
});

describe("probe 3 — backup: round-trip, mescla e desfazer (D9)", () => {
  it("round-trip export → import (substituir) igual campo a campo", async () => {
    const storage = await import("@/lib/storage");
    let state = baseState();
    state = storage.recordAttempt(state, attempt("a-1", 1_000, 90));
    state = storage.recordAttempt(state, attempt("a-2", 2_000, 60));
    state = storage.recordAttempt(state, {
      ...attempt("a-3", 3_000, null),
      qid: "wfd-001",
      type: "wfd",
    });
    state = storage.toggleBookmark(state, "swt-001");
    state = storage.upsertNote(state, "swt-001", "revisar transições");
    state = storage.updateSettings(state, { targetScore: 79 });

    const exported = storage.exportBackup(state, 5_000);
    expect(exported.state.settings.lastBackupAt).toBe(5_000);

    const preview = storage.parseBackup(exported.text, baseState());
    expect(preview.valid).toBe(true);
    expect(preview.attempts).toBe(3);
    expect(preview.questions).toBe(2);
    expect(preview.bookmarks).toBe(1);
    expect(preview.period).toEqual({ first: 1_000, last: 3_000 });

    const applied = storage.applyBackup(exported.text, "replace", baseState());
    expect(applied.ok).toBe(true);
    expect(applied.state).toEqual(exported.state);
  });

  it("mesclar backup antigo sobre estado novo não perde nada", async () => {
    const storage = await import("@/lib/storage");
    // Estado atual (novo): nota melhor e caixa mais avançada.
    let current = baseState();
    current = storage.recordAttempt(current, attempt("novo-1", 10_000, 95));
    current = storage.toggleBookmark(current, "wfd-001");
    current = storage.upsertNote(current, "swt-001", "nota nova");

    // Backup antigo: nota pior, mas tentativas e favorito próprio.
    const old = baseState();
    old.questions["swt-001"] = snapOf({
      attempts: 4,
      bestScore: 60,
      lastScore: 60,
      lastAttemptAt: 5_000,
      box: 2,
      dueAt: 9_000,
    });
    old.questions["wfd-002"] = snapOf({
      attempts: 2,
      bestScore: 70,
      lastScore: 70,
      lastAttemptAt: 4_000,
      box: 1,
      dueAt: 8_000,
    });
    old.bookmarks.push("swt-001");
    old.notes["wfd-001"] = { text: "nota antiga", updatedAt: 3_000 };
    old.attempts.push(attempt("antigo-1", 4_000, 60));
    const oldText = storage.exportBackup(old, 6_000).text;

    const merged = storage.applyBackup(oldText, "merge", current);
    expect(merged.ok).toBe(true);
    const state = merged.state as AppState;

    const q1 = state.questions["swt-001"];
    expect(q1?.attempts).toBe(5); // soma (1 novo + 4 antigos)
    expect(q1?.bestScore).toBe(95); // máximo
    expect(q1?.box).toBe(1); // do snapshot mais recente (novo)
    expect(q1?.lastScore).toBe(95);
    expect(state.questions["wfd-002"]?.attempts).toBe(2); // preservado do backup
    expect(state.bookmarks).toEqual(expect.arrayContaining(["wfd-001", "swt-001"]));
    expect(state.notes["swt-001"]?.text).toBe("nota nova"); // updatedAt mais novo
    expect(state.notes["wfd-001"]?.text).toBe("nota antiga");
    expect(state.attempts.map((a) => a.id)).toEqual(expect.arrayContaining(["novo-1", "antigo-1"]));
    expect(state.settings.targetScore).toBe(65); // mescla mantém Ajustes atuais
  });

  it("desfazer restaura o estado anterior à importação", async () => {
    const storage = await import("@/lib/storage");
    const current = baseState();
    current.questions["swt-001"] = snapOf({
      attempts: 1,
      bestScore: 50,
      lastScore: 50,
      lastAttemptAt: 1_000,
      box: 1,
      dueAt: 2_000,
    });
    const newText = storage.exportBackup(baseState(), 1).text;

    const applied = storage.applyBackup(newText, "replace", current);
    expect(applied.ok).toBe(true);
    expect(applied.undoWritten).toBe(true);

    const restored = storage.undo();
    expect(restored).not.toBeNull();
    expect(restored?.questions["swt-001"]?.attempts).toBe(1);
  });

  it("import destrutivo com cópia: zerar progresso preserva Ajustes e cria desfazer", async () => {
    const storage = await import("@/lib/storage");
    let current = baseState();
    current = storage.updateSettings(current, { targetScore: 79, accent: "en-GB" });
    current = storage.recordAttempt(current, attempt("a-1", 1_000, 80));

    const result = storage.resetProgress(current);
    expect(result.state.attempts).toHaveLength(0);
    expect(result.state.questions).toEqual({});
    expect(result.state.settings.targetScore).toBe(79);
    expect(result.state.settings.accent).toBe("en-GB");
    expect(result.undoWritten).toBe(true);
    expect(storage.undo()?.attempts).toHaveLength(1);
  });

  it("backup inválido não aplica nada", async () => {
    const storage = await import("@/lib/storage");
    const preview = storage.parseBackup("{}", baseState());
    expect(preview.valid).toBe(false);
    const applied = storage.applyBackup("{}", "replace", baseState());
    expect(applied.ok).toBe(false);
    expect(applied.state).toBeNull();
    expect(storage.undo()).toBeNull();
  });
});

describe("probe 4 — escrita coalescida: N mutações no mesmo tick = 1 setItem", () => {
  it("duas mutações agendadas viram uma única gravação", async () => {
    vi.resetModules();
    const storage = await import("@/lib/storage");
    storage.resetWriteStateForTests();

    const setItem = vi.spyOn(Storage.prototype, "setItem");
    try {
      storage.schedulePersist(baseState());
      storage.schedulePersist({ ...baseState(), dailyCutoff: "2026-10-17" });
      await flushAsync();
      const writes = setItem.mock.calls.filter(([key]) => key === storage.STORAGE_KEY);
      expect(writes).toHaveLength(1);
      expect(JSON.parse(String(writes[0]?.[1])).dailyCutoff).toBe("2026-10-17");
    } finally {
      setItem.mockRestore();
    }
  });

  it("falta de espaço vira falha de persistência sinalizada", async () => {
    vi.resetModules();
    const storage = await import("@/lib/storage");
    storage.resetWriteStateForTests();

    const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("QuotaExceededError", "QuotaExceededError");
    });
    let failed = false;
    storage.onPersistError(() => {
      failed = true;
    });
    try {
      storage.schedulePersist(baseState());
      await flushAsync();
      expect(storage.isPersistFailed()).toBe(true);
      expect(failed).toBe(true);
    } finally {
      setItem.mockRestore();
      storage.resetWriteStateForTests();
    }
  });
});

describe("probe 5 — datas e agregados diários com offset", () => {
  it("agregado diário acumula e poda além da retenção", async () => {
    const storage = await import("@/lib/storage");
    const { addDays, dayKey } = await import("@/lib/pte/dates");
    const today = dayKey(1_700_000_000_000);
    let state = baseState();
    state = storage.recordAttempt(state, attempt("a-1", 1_700_000_000_000, 80));
    state = storage.recordAttempt(state, attempt("a-2", 1_700_006_000_000, 70));
    const day = state.daily[today];
    expect(day?.n).toBe(2);
    expect(day?.scored).toBe(2);
    expect(day?.sum).toBe(150);
    expect(day?.byType["swt"]).toEqual([2, 150]);

    // Dia velho pré-existente é podado.
    const staleKey = addDays(today, -200);
    state.daily[staleKey] = { n: 9, scored: 0, sum: 0, byType: {} };
    state = storage.recordAttempt(state, attempt("a-3", 1_700_012_000_000, null));
    expect(state.daily[staleKey]).toBeUndefined();
    expect(state.dailyCutoff).not.toBe("");
    expect(state.dailyCutoff <= today).toBe(true);
  });

  it("sem score não engorda `scored`/`sum`", async () => {
    const storage = await import("@/lib/storage");
    const { dayKey } = await import("@/lib/pte/dates");
    let state = baseState();
    state = storage.recordAttempt(state, attempt("a-1", 1_700_000_000_000, null));
    const day = state.daily[dayKey(1_700_000_000_000)];
    expect(day?.n).toBe(1);
    expect(day?.scored).toBe(0);
    expect(day?.sum).toBe(0);
  });
});

describe("probe 7 — snapshot de servidor = 1º render do cliente (C2)", () => {
  it("antes da hidratação o snapshot é o estado vazio compartilhado", async () => {
    vi.resetModules();
    const storage = await import("@/lib/storage");
    const store = await import("@/lib/useAppState");
    expect(store.getAppState()).toBe(storage.EMPTY_STATE);
    store.hydrateAppState();
    expect(store.getAppStatus()).toBe("empty"); // localStorage vazio
    expect(store.getAppState()).not.toBe(storage.EMPTY_STATE);
  });
});

describe("probe 8 — aviso de quota ≥ 80%", () => {
  it("estado grande dispara aviso; pequeno não", async () => {
    const storage = await import("@/lib/storage");
    const small = baseState();
    expect(storage.quotaStatus(small).warn).toBe(false);

    const big = baseState();
    big.attempts = [{ ...attempt("grande-1", 1, 90), tags: ["x".repeat(3_600_000)] }];
    const status = storage.quotaStatus(big);
    expect(status.warn).toBe(true);
    expect(status.bytes).toBeGreaterThanOrEqual(storage.QUOTA_WARN * storage.PRACTICAL_QUOTA_BYTES);
  });
});

describe("normalização e sessões", () => {
  it("Settings inválidos voltam ao padrão campo a campo", async () => {
    const storage = await import("@/lib/storage");
    const settings = storage.normalizeSettings({
      accent: "pt-BR",
      modelRate: 5,
      dailyGoal: 999,
      examDate: "ontem",
      targetScore: 3,
      onlyVerified: "sim",
      plus: { wordTranslation: 1 },
    });
    expect(settings).toEqual(storage.DEFAULT_SETTINGS);
  });

  it("endSession só arquiva com ≥ 1 resultado e respeita o teto", async () => {
    const storage = await import("@/lib/storage");
    const { MAX_SESSIONS } = storage;
    let state = baseState();
    state = storage.saveDraft(state, {
      kind: "due",
      startedAt: 0,
      ids: ["a", "b"],
      cursor: 1,
      results: 0,
      sumScore: 0,
    });
    state = storage.endSession(state, 1_000, "sess-vazia");
    expect(state.draft).toBeNull();
    expect(state.sessions).toHaveLength(0);

    state = storage.saveDraft(state, {
      kind: "due",
      startedAt: 2_000,
      ids: ["a"],
      cursor: 1,
      results: 1,
      sumScore: 80,
    });
    state = storage.endSession(state, 3_000, "sess-1");
    expect(state.sessions).toEqual([
      { id: "sess-1", kind: "due", startedAt: 2_000, endedAt: 3_000, n: 1, sum: 80 },
    ]);

    for (let i = 0; i < MAX_SESSIONS + 5; i += 1) {
      state = storage.saveDraft(state, {
        kind: "mixed",
        startedAt: i,
        ids: [],
        cursor: 0,
        results: 1,
        sumScore: 1,
      });
      state = storage.endSession(state, i, `sess-${i}`);
    }
    expect(state.sessions).toHaveLength(MAX_SESSIONS);
    expect(state.sessions[state.sessions.length - 1]?.id).toBe(`sess-${MAX_SESSIONS + 4}`);
  });

  it("notas fazem trim, limitam tamanho e apagam quando vazias", async () => {
    const storage = await import("@/lib/storage");
    let state = baseState();
    state = storage.upsertNote(state, "swt-001", "  olá  ");
    expect(state.notes["swt-001"]?.text).toBe("olá");
    state = storage.upsertNote(state, "swt-001", "x".repeat(storage.NOTE_MAX + 10));
    expect(state.notes["swt-001"]?.text.length).toBe(storage.NOTE_MAX);
    state = storage.upsertNote(state, "swt-001", "   ");
    expect(state.notes["swt-001"]).toBeUndefined();
  });

  it("favoritos alternam por qid canônico", async () => {
    const storage = await import("@/lib/storage");
    let state = baseState();
    state = storage.toggleBookmark(state, "swt-001");
    expect(state.bookmarks).toEqual(["swt-001"]);
    state = storage.toggleBookmark(state, "swt-001");
    expect(state.bookmarks).toEqual([]);
  });
});
