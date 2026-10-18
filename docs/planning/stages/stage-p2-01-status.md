# Status — Stage P2-01 (Fase 1: Descoberta adaptativa, tipos P0)

**Data:** 2026-10-18 · **Fase:** 1 do projeto 2 (PRD2 §5, roadmap-proj2.md) · **Estado:** concluída, aguardando monitor

## Escopo executado

1. **Busca adaptativa por tipo P0** (lst_hcs, lst_hiw, lst_smw, lst_mcq_single/multi, answer_short, read_mcq_multi, sgd, rts, describe_image):
   - 3 subagentes read-only (modelo `capable`), brief compartilhado em `.opencode/work/sweep/lots/README-brief.md` (contrato do Apêndice D: schema, queries de partida §5.2.1, sinais negativos §2.2, chains, "não invente URL").
   - **178 queries logadas** (inclusive sem resultado) em `.opencode/work/sweep/queries-wave1.json` — 15 por tipo P0 + 43 gerais; evidência de esgotamento honesta por tipo.
   - **31 candidatas novas** registradas por `scripts/sweep/sweep-scout.mjs` (0 inválidas, 0 duplicadas → **41 no catálogo**, incl. 10 herdadas do projeto 1).
2. **Verificação direta das 8 fontes mais promissoras** (`sweep-fetch.mjs`, 1 req/s, UA identificado, cache em `raw/`): sumlingo (100 pares Q/A), gurully ASQ (66 + MP3), ptehelper (102 itens, página vietnamita, conteúdo em inglês), ptesprinters (49), gurully SGD (11), gurully RTS (5), pteexampreparation (1 item), pteking (índice apenas).
3. **Amostras manuais** em `.opencode/work/sweep/review/manual-samples-wave1.json` — leitura humana de pares Q/A reais no cache, não do resumo do subagente.
4. **Decisões de gate** por fonte em `sources-sweep.json` (campos `status`/`gate` + `gateLog`), data 2026-10-18.

## Correção pós-verificação (antes do fechamento)

Auditoria própria contra o gate da fase ("amostra ≥ 10%, mín. 10 por fonte aprovada") encontrou 3 aprovadas abaixo do mínimo: ptehelper 6/102, gurully_asq 7/66, ptesprinters 6/49. **Corrigido nesta fase:** 4–5 pares adicionais por fonte foram lidos manualmente no cache já baixado (nada re-fetchado) e anexados à amostra → ptehelper 11/102, gurully_asq 10/66, ptesprinters 10/49; campos `gate.sample` atualizados. Fontes pequenas mantêm amostra = total disponível (decisão honesta registrada nos gates).

## Decisões de gate (31 novas candidatas)

- **Aprovadas (7):** ptehelper (answer_short) · gurully ASQ (answer_short) · sumlingo (answer_short) · ptesprinters (answer_short) · gurully SGD (sgd) · USGS ×2 (describe_image; mesmo tema, contar 1 item só).
- **Aprovada condicional (1):** gurully RTS (rts) — defeito registrado: instrução usa 20 s (Core) vs 10 s (Academic); a usar na Fase 2 só com correção.
- **Reprovadas (17):** realpte ×3 (403), pteking (índice sem gabarito), ptebank ×2 (pagamento/copyright), britfort (© Pearson 2011 sem licença), alfapte ×2, leapscholar, aliensbrain, bandladder (gravações originais, não recall), radiusenglish, pteexampreparation (volume ≤ 2), gurully rts duplicata, read_mcq_multi 403 — motivos por fonte em `gate.motivo`.
- **Pendentes (6):** Wikimedia Commons ×6 — licenças CC0/CC BY 4.0 declaradas, texto 403 no site; onda 2 valida a imagem via `upload.wikimedia.org` antes de aprovar.

## Cobertura por tipo P0 (honesto)

- answer_short: **4 fontes aprovadas** (melhor cobertura da onda).
- sgd: 1 aprovada; rts: 1 condicional; describe_image: 2 aprovadas + 6 pendentes.
- Listening P0 (hcs/hiw/smw/mcq_single/multi) e read_mcq_multi: **todas as candidatas reprovadas** — esgotamento parcial registrado; onda 2 re-tenta com paginação/login-free alternativas antes de declarar esgotamento (regra: 2 ondas sem aprovação).

## Pendências honestas

- Corroboração C1 entre fontes aprovadas não rodada ainda (matriz §3 — Fase 2/5).
- Dedupe intra-onda e contra as 954 fica para a Fase 2 (`sweep-dedupe --candidates` — correção do bug do modo candidates apontada pelo monitor em stage-p2-00-eval.md é pré-requisito).
- Wikimedia (6) pendente de validação via upload.wikimedia.org.

## Gates da fase

- Cada tipo P0 com candidatas avaliadas ✓ (listening/read_mcq_multi com esgotamento parcial registrado + plano de onda 2)
- Amostra manual ≥ 10% (mín. 10) por fonte aprovada ✓ (após correção pós-verificação; fontes pequenas = total disponível)
- vitest **319/319** ✓ · tsgo limpo ✓ · build OK ✓ · lint 0 erros (9 warnings pré-existentes) ✓ · zero deps de runtime novas ✓ · nenhum arquivo gerado editado ✓
