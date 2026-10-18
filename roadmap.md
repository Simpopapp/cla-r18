# Remix — next milestone

## Fase 1 do projeto 2 — Descoberta adaptativa (scout, tipos P0)

Roadmap ativo: `.opencode/roadmap-proj2.md` · PRD: `.opencode/prd-project2.md`

- [x] Monitor (OpenCode) restaurado no ambiente e notificado do remix + Stage P2-00 (avaliação em andamento).
- [x] Brief dos subagentes de coleta escrito (`.opencode/work/sweep/lots/README-brief.md`).
- [x] 3 lotes de busca disparados em paralelo: lot-01 (listening MCQs/HCS/HIW/SMW) · lot-02 (answer_short/read_mcq_multi/sgd/rts) · lot-03 (describe_image, com licença de imagem).
- [x] Mesclar lotes aprovados via `scripts/sweep/sweep-scout.mjs` (valida schema, dedupe por URL, registra candidatas) — 31 novas (0 inválidas, 0 duplicadas → 41 no catálogo).
- [x] Amostra manual ≥ 10% (mín. 10) por fonte aprovada + decisão de gate (aprovada/reprovada + motivo) em `sources-sweep.json` — 7 aprovadas + 1 condicional, 17 reprovadas, 6 pendentes (Wikimedia → onda 2); correção pós-verificação: ptehelper 11/102 · gurully_asq 10/66 · ptesprinters 10/49.
- [x] Log de queries tentadas consolidado (evidência de esgotamento honesta) → `queries-wave1.json` (178 queries; listening P0 + read_mcq_multi: esgotamento parcial, onda 2).
- [x] Status da fase escrito (`docs/planning/stages/stage-p2-01-status.md`) e monitor notificado; avaliação da Fase 0 recebida: "concluída", alta confiança (stage-p2-00-eval.md).
- [x] Gates da fase: cada tipo P0 com candidatas avaliadas OU esgotamento registrado (listening P0 + read_mcq_multi: esgotamento parcial, onda 2 antes de declarar) · amostras ≥ 10%/mín. 10 ✓ · vitest 319/319 · tsgo limpo · build OK · lint 0 erros (9 warnings pré-existentes) · zero deps novas · monitor notificado.


- [x] Confirm planning alignment and notify the independent project monitor.
- [x] Implement Phase 7: exam queue, protected forward-only runner, timing and local history.
- [x] Verify exam rules with tests and complete a full part in the browser.
- [x] Record actual gates, hand off to the monitor and report remaining limits.
- [x] Phase 7 full fidelity: speaking prompt playback now precedes answer timing (audio-wait gate in the exam runner, honest no-audio escape).
- [x] Independent monitor verdict: "concluída" (high confidence) on the re-evaluation; all 5 recommendations addressed — roadmap mirror synced, retroactive stage-06 status written, SgdEngine onerror now ends the audio wait, mobile 390×844 check run.

## Fase 2 — Integração dos tipos P0 (onda 1, PRD2 §6)

- [x] Pipeline completo: extração (377 candidatos) → normalização → validação C1–C4 (377 válidos, 0 rejeitados, 0 fora de faixa) → dedupe contra 954 + intra-onda → integração.
- [x] Dedupe completado (PRD2 §4): 0 matches contra o banco; 15 duplicatas intra-onda com evidências fundidas + 15 pares de corroboração; aliases.json vazio.
- [x] Banco: 954 → 1.316 questões (answer_short 10 → 378 · rts 27 → 31); manifesto e selos recalculados; gurully_sgd skip honesto (sem turns).
- [x] bank-integrity estendido ao catálogo da varredura (10/10); domínios normalizados sem `www.`.
- [x] Gates: 0 duplicatas ≥ 0,85 pós-integração (re-scan 1.316) · chunk ≤ 250 KB (máx. 222 KB) · vitest 319/319 · tsgo limpo · build OK · lint 0 erros (9 warnings) · zero deps novas · status: stage-p2-02-status.md · monitor notificado.



## Fase 3 — Tipos P1 (onda 2, PRD2 §6)

- [x] Pipeline completo: extração (149 candidatos: goarno retell 50 · dropdown 29 · mcq 50 · edknot dropdown 12 · ptehelper SWT 3 · pteprep reorder 5; 1 pulado honesto por fidelidade) → validação C1–C4 (149 válidos, 0 rejeitados) → dedupe → integração.
- [x] Dedupe: 70 integrados · 79 corroborados · 94 pares em `corroboration.json` (goarno 79 — MCQ/dropdown idênticos ao banco · ptesprinters 14 · sumlingo 1).
- [x] Banco: 1.316 → 1.386 (retell 12→62 · dropdown 29→41 · swt 50→53 · reorder 45→50; read_mcq_single 50/60 por corroboração). Manifesto e selos recalculados.
- [x] Gates: re-scan 0 duplicatas ≥ 0,85 (1.386) · bank-integrity 10/10 · chunk 229 KB ≤ 250 KB · vitest 319/319 · tsgo limpo · build OK · lint 0 erros (9 warnings) · zero deps novas · status: stage-p2-03-status.md · monitor notificado (avaliação em andamento).

## Fase 4 — Tipos P2/P3 (onda 3, PRD2 §11 Fase 4)

- [x] Gates de fonte: 34 candidatas (lotes 07–09) → 22 aprovadas (22 gates por tipo em sources-sweep.json; britfort/Pearson C4 → verificada) + 12 reprovadas com motivo (pteschool paywall, pteacademy sem transcript, ptesprinters fetch 2×, etc.).
- [x] Pipeline: extração (1.716: wfd 526 · RS 809 · RA 359 · sst 19 · lst_fib 3) → validação C1–C4 (1.716 válidos, 0 rejeitados) → dedupe contra banco 1.386 + intra-onda (1.437 integrados · 279 corroborados · 373 pares totais) → integração.
- [x] Banco: 1.386 → 2.823 (wfd 48→551 · repeat_sentence 49→682 · read_aloud 50→340 · sst 50→58 · lst_fib 50→53). Manifesto e selos recalculados (wfd/read_aloud saem do selo "banco pequeno").
- [x] Chunks (PRD2 §7.4): repeat_sentence 261 KB → 2 partes (131+130 KB) com loader concatenando; allMeta movido para all-meta-1/2.json (238/216 KB); teste chunk-budget.test.ts (29 testes) cobrindo ≤ 250 KB, consistência de partes e soma do allMeta; incidente de contagem do build-manifest corrigido (idempotente).
- [x] Gates: 0 duplicatas ≥ 0,85 (re-scan 2.823 via Jaccard no bank-integrity) · evidência C1–C4 ✓ · bank-integrity 10/10 · vitest 348/348 (+29) · tsgo limpo · build OK · lint 0 erros (9 warnings) · zero deps novas · status: stage-p2-04-status.md · monitor notificado.

## Fase 4 — Tipos P2/P3 (onda 3, PRD2 §11 Fase 4)

- [ ] Monitor (OpenCode) notificado do remix reativado + confirmação de recebimento (estado: Fases 0–3 [x], próxima = Fase 4).
- [ ] Déficit registrado: lst_fib 50/60 · sst 50/60 · read_aloud 50/100 · wfd 48/300 · repeat_sentence 49/200 (wfd/RS = volume alto, só itens 100% novos pós-dedupe).
- [ ] 3 lotes de scout disparados em paralelo: lot-07 (lst_fib/sst, transcript obrigatório) · lot-08 (read_aloud) · lot-09 (wfd/repeat_sentence, prediction lists).
- [ ] Mesclar lotes via `scripts/sweep/sweep-scout.mjs` + amostra manual + gate de fonte (Ap. E) em `sources-sweep.json`.
- [ ] Extrator onda 3 (`scripts/sweep/extract-wave3.mjs`) → validar C1–C4 + faixas → dedupe contra 1.386 + ondas anteriores + intra-onda → integrar.
- [ ] Chunk check (risco wfd > 250 KB: dividir carregamento por lote antes de integrar) + selos recalculados.
- [ ] Gates: idênticos à Fase 2 + dedupe contra ondas anteriores comprovado · vitest · tsgo · build · lint · zero deps novas · status: stage-p2-04-status.md · monitor notificado.

## Fase 8 — Pack studie-plus (PRD §13)







- [x] Pure modules `src/lib/plus/`: settings, words, glossary, sentences, phrases, plusAudio (field policy matrix).
- [x] Components: PlusWordText, PlusPhraseCard, PlusSpeakButton (tap-only, portal bubble, 44px targets).
- [x] /settings section "Studie Plus" with 3 independent toggles + decoupling copy.
- [x] Engine integration via plusFieldPolicy (translation surfaces; audio last).
- [x] Pipelines: scripts/plus/extract-words.mjs, extract-sentences.mjs, merge-glossary.mjs, merge-phrases.mjs.
- [x] Data wave 5 merged: glossary 5.833/7.373 words (79%, batches 31–38 pending) · phrases P1 765/765 done; P2 (in-013+) not started.
- [x] Data wave 6 — glossário concluído (2026-10-17): 7.277/7.434 entradas válidas (97,9% ≥ meta 95%); 157 rejeitos = cognatas idênticas ao inglês (correção manual aplicada aos 64 rejeitos corrigíveis); merge determinístico verde.
- [x] Data waves de frases concluídas (2026-10-17): P1 1.656/1.656 (100% ✓) · P2 2.461/2.461 (100% ✓) — 4.117/4.117 frases traduzidas (out-w011..w047b); merge determinístico verde.

- [x] Data via subagent batches: glossary.json 7.277/7.434 (97,9% ≥ 95%) ✓ · phrases/<tipo>.json P1 100% ✓, P2 100% (≥95%) ✓; cobertura registrada nesta fase.
- [x] Tests: plus-settings, plus-words, plus-sentences, plus-phrases, plus-audio, plus-glossary, plus-integrity, plus-integration — suite completa 315/315 verde (2026-10-17).
- [x] Gates: vitest 319/319 (+4 regression tests) · tsgo clean · build OK · lint 0 errors (9 pre-existing warnings) · Playwright 390×844: bubble opens tap-only, closes on outside/✕/Esc, no overflow · pack off = zero regression (0 plus triggers, 0 pageerrors). Fixed pack-off leak: PlusPhraseCard/PlusText/PlusSpeakButton now honor the user toggles (type policy = eligibility, user switch = decision). Fixed exam leak (post-monitor eval): swt/write_essay/rts now pass disabled={mode === "exam"} + regression test; integration extended to read_mcq_single/multi (passage/question) and retell_lecture (transcript, post); justified exceptions registered (blank/drag fields stay trigger-free).
