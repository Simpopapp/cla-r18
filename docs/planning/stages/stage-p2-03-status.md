# Stage P2-03 — Fase 3: Tipos P1 (onda 2)

Data: 2026-10-18 · Fontes: cand-42 (goarno retell), cand-47 (edknot dropdown), cand-54 (goarno mcq), cand-55 (ptehelper SWT), cand-56 (pteprep reorder)

## Pipeline
- Extração (`scripts/sweep/extract-wave2.mjs`): 149 candidatos (retell 50 · dropdown 41 · mcq 50 · swt 3 · reorder 5) · 1 pulado honesto (goarno dropdown: 21 lacunas com < 3 opções — fidelidade, PRD1 §6.8).
- Normalização: extrator já emite o schema (provenance comunitária conforme tier das fontes aprovadas; domínios sem `www.`).
- Validação (C1–C4 + faixas): 149 válidos · 0 rejeitados · 0 fora de faixa.
- Dedupe contra banco (1.316) + intra-onda: 70 integram · 79 corroboram/descartam · 94 pares registrados em `corroboration.json` (goarno.io 79 — inclui os 50 MCQ idênticos ao banco + 29 dropdown; ptesprinters 14; sumlingo 1).
- Integração: 1.316 → **1.386** (retell_lecture 12→62 · read_fib_dropdown 29→41 · swt 50→53 · reorder_paragraphs 45→50 · read_mcq_single 50→50, 0 novos — os 50 goarno já estavam no banco). Manifesto regenerado; `report.json` 1.386.

## Déficit × meta (antes → depois)
- retell_lecture 12/40 → 62 ✓ · read_fib_dropdown 29/40 → 41 ✓ · swt 50/40 ✓ · reorder_paragraphs 45/40 ✓ · read_mcq_single 50/60 → 50 (parcial, corroboração confirmada pelos mesmos itens)

## Gates
- 0 duplicatas ≥ 0,85 pós-integração (re-scan baseline de 1.386: 0 pares) ✓
- Evidência C1–C4 em todo item novo ✓ (validador)
- bank-integrity 10/10 (na suíte) ✓
- Selos recalculados (`report.json` 1.386) ✓
- Chunk ≤ 250 KB: manifest 229 KB ✓
- vitest 319/319 · tsgo limpo · build OK · lint 0 erros (9 warnings pré-existentes) ✓
- Zero deps de runtime novas · nenhum arquivo gerado editado ✓

## Pendências honestas
- read_mcq_single segue 50/60: as 50 candidatas goarno eram os mesmos itens do banco (dedupe provou) — esgotamento da fonte registrada para a Fase 5.
- Normalizador (`sweep-normalize.mjs`) não rodou nesta onda: o extrator já emite o schema e a validação cobriu; registrado para consistência.
