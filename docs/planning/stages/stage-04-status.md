# Stage 04 — Motores B, C e D (15 tipos) — status do builder

Data: 2026-10-17 · Fase 4 do `.opencode/roadmap-proj1.md` · status: **completa** (gates verdes)

## O que foi feito
- Correção pura com testes em `src/lib/pte/`: `dictation` · `fib` · `hiw` · `mcq` · `reorder` · `summary` · `essay` · `coverage` · `templateDetector` (casos anotados, bordas e armadilhas).
- Motores de prática em `src/components/practice/`: `WfdEngine` · `SwtEngine` · `SstEngine` · `WriteEssayEngine` · `LstFibEngine` · `LstHiwEngine` · `LstSmwEngine` · `LstHcsEngine` · `McqEngine` (4 tipos) · `ReadFibDropdownEngine` · `ReadFibDragEngine` · `ReorderEngine`.
- Dispatcher `PracticeEngine.tsx`: escolhe o motor por tipo, bloqueia reenvio duplicado, registra a tentativa via `recordAttempt` e entrega o resultado ao `ScorePanel`.
- `PracticeShell` ganhou `onTimeUp` (auto-submit por tempo esgotado via ref compartilhada); `practice.tsx` despacha os 15 tipos e mantém `PracticeContent` para os 7 de fala (Fase 5).
- Infra compartilhada: `engine.ts`, `AudioPlayOnce` (áudio 1×), `WordCountZone`, `blankUtils.ts`.

## Bugs corrigidos nesta rodada
1. `PracticeNext` (`practice.tsx`) reescolhia a questão a cada mudança do estado do aluno (`pickNext` dependia de `state.questions`): gravar a tentativa trocava a questão em curso e o painel de resultado nunca aparecia em `?type=`. Correção: `useAppHydrated` (novo hook em `useAppState.ts`) + escolha congelada em efeito; a questão só muda por navegação explícita.
2. O efeito de montagem da rota zerava `autoSubmitRef` após o registro do motor (efeitos de filhos rodam antes dos do pai) — o envio por tempo esgotado nunca disparava. Correção: a zerada foi removida; o registro/cleanup do próprio motor cuida do ref.

## Gates verificados (números reais)
- vitest: 192/192 (16 arquivos)
- tsgo: limpo
- build: OK
- lint: 0 erros (10 warnings pré-existentes de react-refresh)
- Playwright desktop 1280: os 15 tipos — interação mínima + Corrigir, painel "Resultado" visível, console sem erros
- Playwright 390×844: os 15 tipos — mesmo protocolo, console sem erros
- Auto-submit por `page.clock` (read_mcq_single, 125 s): botão some, painel de resultado aparece, tentativa gravada no localStorage
- Detector de templates sem falso-positivo: coberto por testes unitários (`src/test/`)
- Zero deps de runtime novas · nenhum arquivo gerado editado

## Próxima fase
Fase 5 — Motor A: Voz (7 tipos de fala), conforme o roadmap.
