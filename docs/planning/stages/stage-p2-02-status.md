# Stage P2-02 — Fase 2: Integração dos tipos P0 (onda 1)

Data: 2026-10-18 · Status: concluída (aguardando avaliação do monitor)

## O que foi feito

Ciclo completo extrair → normalizar → validar → dedupe → integrar sobre as fontes aprovadas da onda 1.

**Extração** (`scripts/sweep/extract-wave1.mjs`, novo): 377 candidatos.
- ptehelper 190 · gurully_asq 50 · sumlingo 99 · ptesprinters 34 (answer_short) · gurully_rts 4 (rts)
- **gurully_sgd: 11 itens NÃO integrados** — a página traz apenas resumo-modelo, sem os turns da discussão; integrar exigiria inventar conteúdo (PRD2 §1.4). Skip registrado em `skipped.gurully_sgd`.
- rts: filtro por cenário real (parágrafo que termina em pergunta de fala); as 5 dicas de resposta da página foram descartadas, não extraídas como cenários.

**Normalização** (`sweep-normalize.mjs`, agora aceita o wrapper do extrator): 377/377, domínios normalizados sem `www.`, proveniência resolvida pelo catálogo `sources-sweep.json` (ids cand-22..28).

**Validação** (`sweep-validate.mjs`, filtro de status estendido para `aprovada (condicional)`): 377 válidos · 0 rejeitados (todos com evidência C1–C4) · 0 fora de faixa (answer_short 2–40 palavras; rts 20–200).

**Dedupe** (`sweep-dedupe.mjs`, modo `--candidates` completado conforme PRD2 §4):
- match contra o banco real via `loadBank()` (baseline.json não guarda tokens/data — fingerprint completo recalculado); regras: hash de chave igual, prefixo 200 igual ou max(Jaccard, Dice) ≥ 0,85
- **0 matches contra as 954 existentes** (nenhuma sobreposição entre as fontes da onda 1 e o banco do projeto 1)
- **15 duplicatas intra-onda** entre fontes independentes (ptesprinters × sumlingo etc.): 1 cópia integrada com evidências fundidas das 2+ fontes; 15 pares registrados em `corroboration.json` (repetição = evidência, PRD2 §4.3)
- aliases.json permanece vazio (nenhuma colisão exigindo alias)

**Integração** (`sweep-integrate.mjs`, bugfix de path do manifest): banco 954 → **1.316** (answer_short 10 → 378 · rts 27 → 31); ids `cand-NN-<tipo>-NNN`; `build-manifest.mjs` regenerado; `sweep-report.mjs` recalculado.

## Como foi verificado

- `bank-integrity.test.ts`: teste de domínios estendido para também aceitar fontes aprovadas em `sources-sweep.json` (o catálogo do projeto 1 não conhecia os 4 domínios novos) — **10/10 ✓**
- Gate "0 duplicatas pós-integração": `sweep-dedupe.mjs --baseline` re-executado sobre as 1.316 questões → **0 pares ≥ 0,85** ✓
- Gates: vitest **319/319** · tsgo limpo · build OK · lint **0 erros** (9 warnings pré-existentes) · zero deps de runtime novas
- chunk ≤ 250 KB: maior arquivo `manifest.json` 222 KB; `answer_short.json` 153 KB ✓
- Evidência C1–C4 anexada por item (`capturedAt` 2026-10-18, detalhe da alegação da fonte)

## O que falta / pendências honestas

- gurully_sgd: 11 itens sem turns — requer fonte com transcrição real da discussão (onda 2)
- Corroboração incremental e tiers: 15 pares aguardam recálculo de tier (Fase 5); gurully (cand-23/28) mesmo operador — C1 não válido entre páginas do próprio gurully
- ptesprinters: lista preditiva de 2019 — corroboração cruzada com fontes atuais registrada nos pares; avaliação de tier na Fase 5
- sumlingo: licença não explícita (uso local/pessoal — pendência documentada)
- USGS describe_image: páginas aprovadas (cand-32/33), raw pendente de download (onda 2)
