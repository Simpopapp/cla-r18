# Stage P2-04 — Fase 4: Tipos P2/P3 (onda 3)

Data: 2026-10-18 · Pipeline: extract-wave3.mjs → sweep-validate → sweep-dedupe → sweep-integrate → build-manifest

## Candidatas e gates de fonte (onda 3, lotes 07–09)
- 35 URLs candidatas (lst_fib/sst · read_aloud · wfd/RS); 34 registradas (1 skip: stormedugo RA já é fonte do projeto 1 — cand-72 marcada aprovada-sem-extração).
- Decisões por tipo (Ap. E) em `sources-sweep.json`:
  - **22 aprovadas**: stormedugo WFD/RS (144/100 itens), ptehelper RS (788→284 pós-dedupe intra), oneppte RS PDF (92, 25 truncados pulados), gurully RS (30), gurully prediction PDF (RA pp. 5–54 + RS pp. 55–74 + WFD p. 714+; extensão de gate registrada para wfd), ptebank RA ×4 (jan/feb/jul/sep: 29 itens), ptehelper RA ×2 (20+6), oneppte RA ×2 (50+52), pteexampreparation RA ×2 (3+3), ptestudent (9), ptebank SST feb/mar (7+10), pteexampreparation lst_fib (3), britfort PDF (cand-21, Pearson oficial C4 → verificada; 2 SST; lst_fib sem template recuperável → sem extração).
  - **12 reprovadas**: pteschool (paywall), pteacademy ×2 (sem transcript inline), 79score (volume não confirmável), webberz (volume ínfimo), ambitionabroad (sem itens inline), ptesprinters (fetch falhou 2×), pteexampreparation SST ×5 (1 item/página, material 2017–2018).

## Extração → validação → dedupe → integração
- Extração: **1.716 candidatos** (wfd 526 · repeat_sentence 809 · read_aloud 359 · sst 19 · lst_fib 3). Skips honestos: 25 linhas truncadas no PDF OnePTE; seção SST do prediction gurully sem resposta-modelo → não extraída.
- Validação: 1.716 válidos, 0 rejeitados, 0 fora de faixa (C1–C4 + faixas PRD1 §6.8).
- Dedupe (contra banco 1.386 + intra-onda; ondas 1–2 já fazem parte do banco): **1.437 integrados · 279 corroborados/descartados · 373 pares de corroboração totais (+264)**. aliases.json segue vazio.
- Banco: **1.386 → 2.823** (wfd 48→551 · repeat_sentence 49→682 · read_aloud 50→340 · sst 50→58 · lst_fib 50→53). Manifesto regenerado; selos recalculados (wfd/read_aloud deixam o selo "banco pequeno").

## Chunks (PRD2 §7.4)
- repeat_sentence 261 KB > 250 KB → dividido em 2 partes (131+130 KB), loader concatena.
- manifest.json deixou de embutir allMeta: novo `all-meta-1.json` (238 KB) + `all-meta-2.json` (216 KB) concatenados em manifest.ts.
- Novo teste `src/test/chunk-budget.test.ts` (29 testes): nenhum arquivo de dados > 250 KB; consistência de `-b` com `chunkSplitTypes`; all-meta 1+2 = TOTAL_ALL_QUESTIONS.
- Incidente corrigido: 1ª execução do build-manifest dividiu repeat_sentence antes de computar contagens → contagem errada (2.482). Corrigido para pipeline idempotente (concat A+B antes de medir); banco restaurado (682) e verificado.

## Testes ajustados (regras, não números fixos)
- catalog.test: selo "banco pequeno" agora deriva de `isSmallBank(t) === count < min` para todos os tipos (regra); exemplo concreto: sst 58 < 60 pequeno · wfd 551 ≥ 300 não-pequeno.
- bank-integrity: `bank()` concatena parte `-b` (espelha o loader); timeout do scan Jaccard elevado para 60 s (banco cresceu, asserção inalterada).

## Gates da fase
- Dedupe: 0 duplicatas ≥ 0,85 pós-integração (re-scan 2.823 itens — bank-integrity Jaccard verde) ✓
- Evidência C1–C4 por item novo ✓ · bank-integrity 10/10 ✓
- chunk ≤ 250 KB (máx. 238 KB all-meta-1) ✓ · vitest **348/348** ✓ · tsgo limpo ✓ · build OK ✓ · lint 0 erros (9 warnings pré-existentes) ✓ · zero deps de runtime novas ✓
- Monitor notificado ✓ (3 tentativas em 2026-10-18; runtime OpenCode saudável (health 200), mas o endpoint do modelo retornou "Upstream request failed: Endpoint is unavailable" — avaliação da fase pendente de re-run quando o upstream voltar)

## Pendências para ondas seguintes
- Wikimedia describe_image (cand-34..39) segue pendente (onda de DI).
- lst_fib precisa de +7 itens (53/60): fontes com transcript+gabarito inline são raras; britfort não forneceu template. Esgotamento parcial registrado.
- sst 58/60 (−2): cobertura do ptebank jan/feb/mar 2023 parcial (transcripts fora de faixa pulados honestamente).
- Corroboração global e re-avaliação de tiers: Fase 5.
