# Stage 01 — Persistência, datas e SRS (Fase 1)

Status: completed
Data: 2026-10-17

## O que foi feito
- `src/lib/pte/dates.ts`: `dayKey`, `startOfLocalDay`, `addDays` (via calendário `new Date(y, m, d + n)`, nunca 24 h fixas), `daysBetween` (meio-dia UTC, imune a DST), `computeStreak` (sem tentativas hoje, continua a partir de ontem; teto "até N dias"), `dailyAverages`.
- `src/lib/storage.ts`: estado v1 completo (§7.1) com `QuestionSnapshot`, `DailyAggregate`, `Attempt`, `SessionDraft`/`SessionRecord`, `Settings`; constantes únicas (C7): `MAX_ATTEMPT_LOG=2000`, `MAX_SESSIONS=100`, `DAILY_RETENTION_DAYS=180`, `NOTE_MAX=2000`, `PRACTICAL_QUOTA_BYTES=4 MB`, `QUOTA_WARN=0,8`, `BACKUP_REMINDER_DAYS=14`; normalização de Settings campo a campo; `load()` com quarentena (`pte-hub-quarantine-<ts>`, bruto preservado) e versão futura somente-leitura (payload byte a byte); `MIGRATIONS` (vazio na v1); escrita coalescida (1 `setItem` por tick, flush em `pagehide`/`visibilitychange`); `estimateStateBytes` + `quotaStatus` (aviso ≥ 80%); `recordAttempt` na ordem §7.2 (snapshot → agregado → log → trunca) com poda diária; notas, favoritos, rascunho de sessão e `endSession` (arquiva só com ≥ 1 resultado, teto 100); backup v1: `exportBackup` (atualiza `lastBackupAt`), `parseBackup` (prévia sem aplicar), `applyBackup` (substituir × mesclar + cópia `pte-hub-undo`), `undo`, `resetProgress` (preserva Ajustes); `resolveQid` com gancho para `aliases.json` (Fase 2).
- `src/lib/useAppState.ts`: store global com `useSyncExternalStore`; snapshot de servidor = `EMPTY_STATE` (mesmo objeto do 1º render do cliente); hidratação em efeito; mutações no-op antes da hidratação e no modo somente-leitura; `usePersistFailed`, `useAppStateStatus`.
- `src/lib/pte/srs.ts`: `SRS_INTERVAL_DAYS = [0,1,3,7,14,30]`; `applyAttemptToSnapshot` (§8: promove só vencida, antecipada não promove, lapso −1, sem score só `attempts++`); `PASS_SCORE_BY_TYPE` (85 ditado · 80 fala com texto · 70 conteúdo · 75 seleção — cobre os 22 tipos); `isDue`, `isDominated`, `snapshotState` (nova/vencida/aprendizado/revisão/dominada/fraca).
- `AGENTS.md`: regra do store (useSyncExternalStore + mutações puras).

## Evidências dos gates (números reais)
- vitest 56/56 (5 arquivos; +45 novos: `dates.test.ts` 13, `srs.test.ts` 13, `storage.test.ts` 19).
- Probes verdes: teto do log (5.100 tentativas + log cheio → snapshot intacto, log = 2.000) · corrompido → quarentena com bruto · estrutura inválida → quarentena · versão futura → somente leitura, byte a byte após mutação ignorada · round-trip export→import igual campo a campo · mescla antigo×novo sem perda · desfazer restaura · zerar preserva Ajustes e cria desfazer · coalescência (2 mutações = 1 setItem) · falha de quota sinalizada · agregado diário + poda além de 180 dias · maratona (5 em 5 min → caixa 1) · lapso/antecipada/vencida · dominada inalcançável por maratona · DST por chaves locais · quota ≥ 80% · snapshot de servidor ≡ 1º render.
- `tsgo --noEmit` limpo; build OK; lint 0 erros (6 warnings pré-existentes do scaffold).
- Preview :8080 (Playwright): desktop 1280 + 390×844, console limpo, zero overflow horizontal.

## Pendências para a próxima fase
- Fase 2 (Banco de questões) e Fase 3 (Catálogo, hub e shell) podem seguir; a Fase 2 não bloqueia a Fase 3.
- `aliases.json`/`resolveQid`: gancho pronto; registrar o resolvedor quando o aliases existir.
- Monitor: OpenCode reinstalado e serve ativo (:4096 health OK), mas `opencode run` volta a falhar com "Unexpected server error" (mesmo erro da Fase 0 — modelo `muse-spark-1.3-contributor-free` indisponível). Aviso de Stage 01 enviado por duas tentativas; relatório `stage-01-eval.md` fica pendente até o modelo voltar. Retomar o aviso na próxima sessão.
