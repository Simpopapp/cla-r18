# Stage 00 — Fundação e verdade oficial (Fase 0)

Status: completed
Data: 2026-10-17

## O que foi feito
- Scaffold verificado com os 5 gates num app mínimo (rotas /, 4 seções, /settings) com `TopNav` mobile-first e páginas provisórias.
- Tokens de tema claro/escuro AA (âmbar profundo × papel quente / azul-noite; Fraunces + Space Grotesk, corpo ≥ 16 px); `button.tsx` com alvos ≥ 44 px.
- Contratos de dados: `src/lib/pte/types.ts` (§5), `src/lib/pte/skillMatrix.ts` (matriz 22 linhas, tempos, `SKILL_WEIGHTS`, `EXAM_BLUEPRINT`, `EXAM_PARTS`, `HUMAN_REVIEW_TYPES`, escala 10–90), `src/lib/pte/bankTargets.ts` (§6.6).
- Verdade oficial consultada em 2026-10-17 nas fontes da Pearson (URLs + data no comentário de `skillMatrix.ts`):
  22 tipos (20 + sgd + rts, desde 07/08/2025), 3 partes em ordem fixa ~2 h, escala 10–90, revisão humana (RL/SWT/SST/SGD/RTS oficiais; DI/WE por corroboração secundária); contagens por tipo na tabela do relatório oficial (TOTAL 65) → blueprint com min = max = count.
- Aproximados rotulados: tempos por questão e por parte; sgd/rts com fontes divergentes.
- Pastas criadas: `src/data/pte`, `src/data/plus`, `public/di`, `.opencode/work/bank/raw`, `.opencode/work/plus/words`.

## Evidências dos gates
- vitest 11/11 (`skill-matrix.test.ts` + `app-routing.test.tsx`).
- `tsgo --noEmit` limpo; build OK; lint 0 erros (6 warnings pré-existentes em componentes de UI do scaffold).
- Contraste: 22 pares × 2 temas, mínimo 4,58:1 (`scripts/check-contrast.mjs`).
- Preview :8080 (Playwright): 6 rotas, desktop + 390×844, zero overflow horizontal, console sem erros.

## Pendências para a próxima fase
- Fase 1 (Persistência, datas e SRS) e Fase 2 (banco de questões, pode rodar em paralelo).
- Aviso ao monitor: OpenCode reinstalado nesta sessão e servidor ativo (:4096 health OK), mas `opencode run` falha com "Unexpected server error" (modelo `muse-spark-1.3-contributor-free` indisponível). Retentar o aviso da Fase 0 na próxima sessão.
