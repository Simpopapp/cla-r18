# Stage 08 — Pack studie-plus

Status: completed
Date: 2026-10-17

## O que foi entregue
- Seção "Studie Plus" em Ajustes com 3 interruptores independentes (tradução por palavra, tradução por frase, áudio do inglês) e texto de desacoplamento (não faz parte do PTE, não entra em nota/histórico/estimativa).
- Módulos puros em `src/lib/plus/` (settings, words, glossary, sentences, phrases, plusAudio com matriz de política por campo/fase) e componentes `PlusWordText`/`PlusPhraseCard`/`PlusSpeakButton` (bolha em portal, só por toque, alvos 44 px).
- Dados completos: `glossary.json` 7.277/7.434 entradas válidas (97,9% ≥ meta 95%) · `phrases/<tipo>.json` P1 1.656/1.656 + P2 2.461/2.461 = 4.117/4.117 (100%), merges determinísticos verdes.
- **Correção nesta etapa:** `PlusPhraseCard`/`PlusText`/`PlusSpeakButton` consultavam apenas a política estática do tipo (elegibilidade do campo) e ignoravam os interruptores do aluno — com o pack desligado a frase ainda virava gatilho pontilhado e o toque expandia a tradução. Agora política = elegibilidade, interruptor = decisão; +3 testes de regressão (`plus-integration.test.tsx`, 10 testes no arquivo).

## Arquivos / áreas tocadas
- `src/components/plus/PlusPhraseCard.tsx`, `PlusText.tsx`, `PlusSpeakButton.tsx` (gate por `settings.plus.*`)
- `src/test/plus-integration.test.tsx` (+3 testes)
- Roadmaps: `.opencode/roadmap-proj1.md` (Fase 8 fechada), `roadmap.md` (espelho)

## Gates (números reais)
- vitest 318/318 (33 arquivos) · tsgo limpo · build OK · lint 0 erros (9 warnings pré-existentes)
- Playwright 390×844 (touch): pack ligado — bolha abre só por toque e fecha por toque fora/✕/Esc, card de frase abre por chip, 198 palavras tocáveis em swt, sem overflow horizontal, 0 pageerrors; pack desligado — 0 gatilhos plus, texto idêntico ao pré-pack, 0 pageerrors.
- Zero dependências de runtime novas; nenhum arquivo gerado editado.

## Notas para o monitor
- O vazamento do pack desligado foi encontrado pelo gate E2E desta etapa (contagem de gatilhos com toggles off) e corrigido antes do fechamento; ver justificativa no roadmap.
- Pendências honestas herdadas do banco (report.json) permanecem registradas: corroboração cruzada entre fontes comunitárias; redações-modelo da Language Academy não vinculadas.

## Correções pós-avaliação do monitor (2026-10-17, docs/planning/reports/stage-08-eval.md)

Veredito anterior: parcial (confiança alta). Itens corrigidos nesta rodada:

1. **Vazamento no simulado (bloqueante):** `SwtEngine`, `WriteEssayEngine` e `RtsEngine` agora passam `disabled={mode === "exam"}` ao PlusText (ReadAloud/RepeatSentence/Wfd já tratavam). Teste de regressão novo em `plus-integration.test.tsx` ("no simulado (mode=exam) o pack some por completo") cobre os 3 motores.
2. **Integração estendida:** `read_mcq_single`/`read_mcq_multi` (passage + question, fase pre, desligado em exam) e `retell_lecture` (transcript na revelação pós-resultado, fase post). Exceções justificadas registradas no roadmap canônico: campos com lacunas (fib dropdown/drag, lst_fib, lst_hiw.shown) e reorder_paragraphs ficam sem gatilhos por conflito de interação (alvos de toque de lacuna/arraste); sst/lst_hcs/lst_smw/lst_mcq_* exibem transcrição só como áudio nativo 1× — sem superfície de texto, frases desses campos não consomem.
3. **read_mcq_single.passage:** 31 frases com hash desalinhado + 3 índices fora do banco — permanece em estado honesto ("Tradução não disponível" via `lookupPhrase` null); realinhamento dev-time registrado como pendência da Fase 10 (varredura final). Cobertura P1/P2 declarada mantém selo honesto.
4. **Espelho formal sincronizado:** `docs/planning/ROADMAP.md` Fase 8 marcada [x] com linha de Gates real.

Gates reexecutados: vitest 319/319 · tsgo limpo · build OK · lint 0 erros (9 warnings pré-existentes).
