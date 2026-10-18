# Status — Stage P2-00 (Fase 0 do projeto 2: Baseline e infraestrutura de varredura)

**Data:** 2026-10-18 · **Roadmap:** `.opencode/roadmap-proj2.md` (Fase 0) · **PRD:** `.opencode/prd-project2.md`

## Entregue
- **Baseline das 954 questões**: `.opencode/work/sweep/baseline.json` — fingerprint determinístico por chave de dedupe (sha1 da chave normalizada por tipo, prefixo 200, tokens para Jaccard/Dice), via `scripts/sweep/sweep-dedupe.mjs --baseline` (reutiliza `scripts/bank/lib.mjs` — única implementação dos algoritmos).
- **Sanidade do banco**: 0 pares quase-duplicados (≥ 0,85) dentro do banco atual, por tipo. Hash estável entre 2 execuções (diff vazio).
- **Pipeline `scripts/sweep/`**: `sweep-lib.mjs` (paths, tiers, evidência) · `sweep-dedupe.mjs` (baseline + modo `--candidates` para Fase 2+) · `sweep-scout.mjs` (mescla lotes de subagentes em `sources-sweep.json`, marca `status: candidata`) · `sweep-fetch.mjs` (cache sha1 da URL, 1 req/s, UA identificado) · `sweep-normalize.mjs` (schema PRD1 §5 + tier da fonte) · `sweep-validate.mjs` (fonte aprovada + evidência C1–C4 + faixas PRD1 §6.8 → review.json) · `sweep-integrate.mjs` (grava `src/data/pte/*.json`, aliases, build-manifest) · `sweep-report.mjs` (relatório da onda).
- **`sources-sweep.json`**: 10 fontes do projeto 1 importadas com `operatorGroup` (goarno=2, edknot=3 agrupadas) e tiers; corroboration/review/lots/raw dirs criados.

## Gates (números reais)
- vitest **319/319** · tsgo limpo · build OK · lint **0 erros** (9 warnings pré-existentes) · zero deps de runtime novas · nenhum arquivo gerado editado (apenas `build-manifest` roda sob demanda; nenhum dado do app alterado nesta fase)
- Dedupe baseline: **0 duplicatas** em 954 itens · hash estável entre execuções ✓

## Limites honestos
- Scripts de extração por fonte (`sweep-extract-<fonte>`) só nascem na Fase 2, quando houver fontes novas aprovadas — não fazem parte do esqueleto.
- `--candidates` do dedupe está implementado mas ainda não exercitado com candidatos reais (sem onda ainda); será exercitado e corrigido na Fase 2.
