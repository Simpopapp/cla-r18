# Stage 02 — Banco de questões dos 22 tipos (Fase 2)

Status: completed
Data: 2026-10-17

## O que foi feito
- Pipeline completo em `scripts/bank/`: extração (5 extratores), validação de schema/formato (§6.8), dedupe (exato + Jaccard/Dice 0,85 por tipo), integração e manifesto derivado.
- **954 questões integradas nos 22 tipos oficiais** + 20 imagens OWID (CC BY 4.0) para describe_image com `alt` + `facts` calculados do CSV (§6.10).
- Fontes avaliadas e aprovadas em `.opencode/work/bank/sources.json` (7): Pearson (sgd/rts, oficial, confiança 95), OWID (verificada, 90), GoArno (70), stormedugo (68), band9pte (66), edknot (65 + retell 65 + reorder 65), Language Academy (62). Sem conteúdo gerado por IA no banco; proveniência `verificada` × `comunitaria` registrada por item.
- Filtros de fidelidade aplicados: dropdowns com blank < 3 opções descartados; sentenças fora da faixa oficial descartadas; blobs de extração cortados; perguntas ausentes (páginas multi/listening MCQ do goarno) integradas com `question=""` e marcadas para revisão.
- `src/test/bank-integrity.test.ts` (§6.9): 10 testes — ids únicos, proveniência, domínio aprovado, answer ∈ opções, marcadores = lacunas, discrepâncias reais do hiw, faixas de formato, quase-duplicatas, aliases, manifesto derivado, imagens/licença.
- `report.json` com contagens × meta: 3 tipos "ok", 9 "abaixo do ideal", 10 "banco pequeno" (selo honesto na UI da Fase 3).

## Evidências dos gates
- vitest 66/66 (56 anteriores + 10 do bank-integrity) · tsgo limpo · build OK · lint 0 erros (6 warnings pré-existentes).
- Manifesto: `TOTAL_ALL_QUESTIONS = 954`, `TYPE_META` 22/22, contagens derivadas — teste de sincronização verde.
- Chunks: maior `read_mcq_multi.json` 130 KB, manifesto 165 KB — todos ≤ 250 KB.
- Playwright não aplicado nesta fase (sem rotas novas; Fase 2 é data-only — UI entra na Fase 3).

## Pendências para a próxima fase
- Fase 3: catálogo/hub/shell (`manifest.ts`, `catalog.ts`, rotas, selos "banco pequeno", PracticeShell).
- Corroboração cruzada entre fontes comunitárias (recalcula a cada fonte nova) — registrada como pendência em `report.json`.
- sgd com 25 itens (5 transcripts do PDF oficial não parsearam — quebras de linha diferentes).

## Monitor (OpenCode)
- Monitor online (`/api/health` OK, versão 1.19.3), mas `opencode run` falhou 2× nesta sessão com "Unexpected server error" (mesmo erro da sessão anterior; modelo `muse-spark-1.3-contributor-free` indisponível no lado do servidor — log termina em `loop step=0` sem erro detalhado). Aviso das Fases 0–2 fica pendente de retentativa; os 3 arquivos do protocolo (project1, prd-project1, roadmap-proj1) estão atualizados.
