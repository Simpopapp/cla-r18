# Avaliação — Stage P2-00

**Data:** 2026-10-18
**Veredito:** concluída
**Confiança da avaliação:** alta

## Resumo executivo

A Fase 0 do projeto 2 (baseline e infraestrutura de varredura) entregou exatamente o escopo do roadmap: fingerprints determinísticos das 954 questões, esqueleto completo de `scripts/sweep/*` reutilizando `scripts/bank/lib.mjs`, `sources-sweep.json` inicial com 10 fontes + `operatorGroup`, e o brief pronto para os lotes de subagentes da Fase 1. Todos os gates foram re-executados de forma independente pelo monitor e confirmados (dedupe baseline 0 duplicatas em 954 itens, hash estável entre 2 execuções, vitest 319/319, tsgo limpo, build OK, lint 0 erros / 9 warnings pré-existentes). O modo `--candidates` do dedupe tem um bug latente identificado na análise estática — o builder já o declarou não-exercitado e com correção adiada para a Fase 2, o que é compatível com o escopo da fase (sem bloqueio para a Fase 1, que não usa esse modo).

## Cobertura de requisitos

Atendido:
- **Fingerprints das 954 questões** (roadmap Fase 0, item 1): `.opencode/work/sweep/baseline.json` com 954 itens, `key = sha1(chave normalizada por tipo)`, prefixo 200, tokens para Jaccard/Dice, `provenance`/`source` preservados — alinhado a PRD2 §4.1 e §6.1. Verificado: `TOTAL_ALL_QUESTIONS = 954` no manifesto e a soma do `byType` bate em 954 (demais tipos com 50 itens cada; write_essay 79; escassos herdados do projeto 1: wfd 48 · repeat_sentence 49 · retell_lecture 12 · answer_short 20 · describe_image 20 · sgd 25 · rts 27 · read_fib_dropdown 29 · reorder_paragraphs 45).
- **Sanidade do banco (critério de aceite, reproduzido 2x pelo monitor):** `node scripts/sweep/sweep-dedupe.mjs --baseline` rodado duas vezes — 0 pares quase-duplicados (≥ 0,85) em ambas, `report-baseline.json` idêntico, `baseline.json` byte-a-byte idêntico entre execuções (hash estável provado).
- **Esqueleto do pipeline** (roadmap Fase 0, item 2): os 8 scripts de `scripts/sweep/` existem e os imports confirmam reuso de `scripts/bank/lib.mjs` (normalização/sha1/dedupeKey/tokens/similaridade single-source, decisão PRD2 §15.6): `sweep-lib.mjs` (paths, TIERS 80/65/50, EVIDENCE_KINDS), `sweep-dedupe.mjs` (baseline + `--candidates`), `sweep-scout.mjs`, `sweep-fetch.mjs` (1 req/s, UA identificado, cache por hash), `sweep-normalize.mjs`, `sweep-validate.mjs` (fonte aprovada + C1–C4 + faixas RANGES → review.json), `sweep-integrate.mjs` (grava `src/data/pte/*`, build-manifest derivado), `sweep-report.mjs`.
- **sources-sweep.json inicial** (roadmap Fase 0, item 3): 10 entradas herdadas do projeto 1 com `operatorGroup` declarado — pearson(1) · owid(1) · goarno+goarno-reorder agrupados(2) · stormedugo(1) · band9(1) · langacad(1) · edknot+reorder+retell agrupados(3) — coerente com PRD2 §3.2 (independência para corroboração).
- **Brief de lotes da Fase 1** (`lots/README-brief.md`): contrato de subagente read-only fiel ao Apêndice D (schema, queries de partida §5.2.1, sinais negativos §2.2, log de queries falhadas, chains, regra "não invente URL"). Preparação de Fase futura, não execução de Fase 1 — sem violação do protocolo.
- **Gates padrão:** vitest 33 arquivos / **319/319** ✓ · tsgo limpo ✓ · build OK ✓ · lint **0 erros** (9 warnings, todos `react-refresh/only-export-components` em `src/components/ui/*` shadcn — pré-existentes, coincidem com o status) ✓ · scripts 100% stdlib Node (`node:*`) importando só `../bank/lib.mjs` e `./sweep-lib.mjs` — zero deps novas de runtime ✓ · nenhum arquivo gerado editado (árvore git limpa; `src/routeTree.gen.ts` e dados do app intocados — nenhum dado do banco mudou nesta fase) ✓.

Parcial:
- **"work dirs criados"** (status, linha 9): apenas `lots/` existe no disco, com o README-brief. `raw/` e `extracted/` são criados lazily por `ensureSweepDirs()` na primeira execução de qualquer script; `corroboration.json` e `review.json` são paths criados on demand em `sweep-lib.mjs`. Funcionalmente coberto (lazy-ensure), mas a afirmação do status é imprecisa — são "identificadores criados", não diretórios materializados.

Ausente / não evidenciado:
- Nada que bloqueie o aceite da fase. Os `sweep-extract-<fonte>.mjs` são explicitamente fora do escopo do esqueleto (nascem na Fase 2, limite honesto declarado no status).

## Qualidade do código

Pontos fortes:
- Separação limpa: `sweep-lib.mjs` (consts/paths) vs `bank/lib.mjs` (algoritmos) — sem duplicação de algoritmo, exatamente a decisão PRD2 §15.6.
- Conformidade de método herdada e verificável: threshold `NEAR_THRESHOLD = 0.85`, chaves por tipo via `dedupeKey`, faixas `RANGES` do PRD1 §6.8 usadas pelo validate com fila de revisão (não descarte silencioso, §8.6).
- Guardas de segurança em conformidade com o PRD: validate reprova fonte não aprovada e item sem evidência C1–C4; integrate roda build-manifest sempre derivado (§7.2); fetch identifica UA e limita 1 req/s com cache (§6.4).
- Idempotência real do baseline: re-execução produz saída byte-idêntica; `generatedAt` nem contribui para instabilidade.
- Honestidade do status: limites declarados (extração adiada; `--candidates` não exercitado), números reais nos gates.

Pontos de atenção (registrados com file:line, todos fora do alcance do aceite da Fase 0 — são para Fase 2+):
1. **Bug latente confirmado por análise estática em `sweep-dedupe.mjs --candidates`:** o baseline grava os itens **sem** tokens (`scripts/sweep/sweep-dedupe.mjs:92`, comentário explica que "tokens recomputed on load"), mas no modo candidates os tokens **nunca são recomputados** para os itens do banco — `:133` monta `{ tokens: dedupeTokens(cand.type, ...), ...it }`, onde o spread de `it` (sem campo `tokens`) deixa os tokens do **candidato** no lugar. `similarity(fp, obj)` então compara os tokens do candidato consigo mesmos → sim = 1,0 sempre → todo candidato seria marcado como quase-duplicada do primeiro item do tipo (aliases/corroborados falsos). O status já declara o modo não-exercitado e "será exercitado e corrigido na Fase 2" — a correção já tem causa precisa identificada.
2. **Corroboração sem acúmulo:** `sweep-dedupe.mjs:122,149` carrega `corroboration.json` e grava de volta sem alteração — o modo candidates escreve pares num plan separado (`report-dedupe.json`) e a matriz `§3.1` nunca é alimentada. A corrigir até a Fase 2/5.
3. **Regra PRD2 §2.3 parcialmente não modelada:** `sweep-validate.mjs:47` aceita qualquer evidência C1–C4 de fonte `comunitaria` (inclusive `official`); o PRD exige C1/C2/C3 para fonte comunitária e C4 é domínio Pearson/licenciado. Modelar quando os lotes começarem a entrar.
4. **Risco de colisão de ids:** `sweep-integrate.mjs:37` gera ids com `makeId(source, type, arr.length + 1)`; ondas seguidas com itens aliased/omitidos podem reusar sufixo. `sweep-scout.mjs:45` (`cand-N` por comprimento da lista) tem a mesma fragilidade.
5. **Dead code em `sweep-normalize.mjs` (linha final do loop):** `norm.data.text = normalizeText(norm.data.text) === "" ? norm.data.text : norm.data.text;` — ambos os ramos idênticos (no-op; felizmente, normalizar o texto visível corromperia conteúdo — NFKC+lowercase). Remover ou implementar de verdade.
6. **RANGES sgd herdado vs PRD2 §8.1:** `bank/lib.mjs:73` exige `turns` 4–15 falantes; §8.1 diz "sgd ≥ 2 falantes". O comportamento é seguro (3 falantes → fila de revisão, não descarte), mas o conflito com o PRD deve ser resolvido ou justificado antes da Fase 2 (sgd é tipo P0).
7. Notas menores: `sweep-fetch.mjs` — os fallbacks `|| "index.html"` são código morto (o nome concatenado com o hash nunca é vazio); varredura intra-bank do baseline é O(n²) por tipo — ok para 954, mas as ondas maiores devem filtrar por `prefix`/hash antes do scan completo.

## Discrepâncias

1. Status diz "corroboration/review/lots/raw dirs criados"; no disco real, só `lots/` existe (com README) — `raw/` e `extracted/` surgem lazily na primeira execução, e corroboration/review são arquivos on-demand. Imprecisão menor de redação, sem impacto funcional (código é a verdade; documentado aqui).
2. Nenhuma outra discrepância: todos os números dos gates conferidos diretamente pelo monitor coincidem com o status (954, 0 duplicatas, hash estável, 319/319, tsgo limpo, lint 0/9, build OK).

## Riscos para as próximas etapas

1. **Fase 2 depende do modo `--candidates`** — bug já identificado em alto nível de detalhe (riscos #1 e #2 da seção acima); correção + exercício com candidatos reais é pré-requisito de qualquer integração. Risco baixo: causa é conhecida e o builder já assumiu o compromisso no status.
2. **Colisão de ids em `makeId`** pode corromper `aliases.json` em ondas múltiplas — resolver na Fase 2 (scan de sufixo máximo existente antes de numerar).
3. **sgd é P0 e o RANGES herdado é mais estrito que o PRD2** — itens legítimos com 2–3 falantes iriam para revisão; alinhar RANGES com §8.1 ou registrar decisão contrária no relatório da Fase 2.
4. **Volume crescente e O(n²)** — quando wfd/repeat_sentence (P3, alto volume) chegarem, filtrar por prefix antes do scan de similaridade.
5. **Invasão de sintéticos (§2.2)** — risco de varredura por natureza; mitigação já prevista (gate de Apêndice E + amostra), exigirão disciplina na Fase 1.

## Recomendações

1. (Fase 2 — obrigatório) Corrigir `sweep-dedupe.mjs` modo candidates: recomputar os tokens dos itens do baseline no load (ou persistir `prefix`-screen antes do `similarity`) e integrar de fato os pares na matriz de corroboração; exercitar com candidatos reais antes de qualquer integração.
2. (Fase 2) Adicionar ao validate a regra "comunitaria exige C1/C2/C3" e revisar `makeId` para scan de sufixo máximo.
3. (antes/início Fase 2) Decidir documentamente o RANGES de sgd (min 2 vs 4 falantes) no relatório da fase.
4. (opcional, higiene) Remover o no-op de `sweep-normalize.mjs` e os fallbacks mortos de `sweep-fetch.mjs` quando esses scripts forem tocados.
5. (futuro) Para ondas de alto volume, usar `prefix200` como filtro pré-similarity.

Nada acima bloqueia o avanço para a **Fase 1** (descoberta adaptativa: scout por tipo P0, registro de candidatas com evidência, amostras manuais, log de queries) — pode começar.

## Evidências consultadas

- docs/planning/stages/stage-p2-00-status.md (status do builder)
- .opencode/project2.md · .opencode/prd-project2.md · .opencode/roadmap-proj2.md
- Código/artefatos: scripts/sweep/ (8 scripts, lidos na íntegra), scripts/bank/lib.mjs, scripts/bank/ (esqueleto do projeto 1), .opencode/work/sweep/{baseline.json, report-baseline.json, sources-sweep.json, report.json, lots/README-brief.md}, src/data/pte/manifest.json (TOTAL 954)
- Gates re-executados pelo monitor (2026-10-18):
  - `node scripts/sweep/sweep-dedupe.mjs --baseline` ×2 → 954 itens, 0 pares ≥0,85; baseline.json byte-idêntico entre execuções
  - `bunx vitest run` → 33 arquivos, 319/319 pass
  - `bunx tsgo --project tsconfig.json` → limpo (typecheck; tsc via tsgo)
  - `bun run build` → OK (nitro wrap)
  - `bun run lint` → 0 erros, 9 warnings (react-refresh/ui shadcn, pré-existentes)
  - imports de `scripts/sweep/*.mjs` conferidos por grep (só `node:*` + libs compartilhadas)
  - §16/§19 dos padrões: nenhum segredo em logs/saídas; git read-only (estado limpo, nenhum ficheiro gerado tocado)
