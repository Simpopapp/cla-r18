# Stage 05 — Motor A: Voz (7 tipos) — status do builder

Data: 2026-10-17 · Fase 5 do `.opencode/roadmap-proj1.md` · status: **completa** (gates verdes)

## O que foi feito
- Correção de fala pura e anotada em `src/lib/pte/speaking.ts`: alinhamento LCS (hit 1,0 · substituição próxima 0,5 com Levenshtein ≥ 0,75 · moved 0,5), `EXTRA_PENALTY = 0,25`, `REPEAT_PENALTY = 0,1`, piso 0; `fluencyProxy` (pausas longas −15 · repetições −10 · ritmo fora de 120–160 wpm com cap 30); `contentFromKeywords` (< 4 keywords → null, "sem nota"); `answerShortMatch` (sequência normalizada, cobre sinônimos da lista).
- Hooks de browser (suporte derivado em `useEffect`, limpeza no unmount): `useSpeechRecognition` (interinos ao vivo, reinício automático, erros de permissão/rede mapeados), `useSpeechRecorder` (MediaRecorder + AnalyserNode para nível, replay blob local), `useSpeakingAttempt` (glue: wpm, pausas longas ≥ 3 s por nível baixo, stopAndCollect).
- Motores em `src/components/practice/`: `ReadAloudEngine` (layout próprio: texto grande, modelo TTS, comparação colorida), `RepeatSentenceEngine` (áudio 1×, transcript só no resultado), `DescribeImageEngine` (imagem + crédito/licença, facts+keywords), `RetellLectureEngine` (áudio 1×, transcrição só após envio), `AnswerShortEngine` (100/0 + resposta aceita exibida), `SgdEngine` (TTS multi-voz com pitch distinto por falante, transcript só no resultado), `RtsEngine` (situação exibida como texto, como na prova).
- UI compartilhada: `SpeakingControls` (aviso de microfone 1ª vez, gravar/parar com medidor, interinos ao vivo, mensagens de erro, replay), `MicLevelMeter`, `MicNotice` (`micNoticeSeen`), `speakingResult.ts` (painel SEMPRE Conteúdo · Fluência (proxy) · Pronúncia não avaliada + aviso fixo de otimismo do reconhecedor).
- Dispatcher `PracticeEngine.tsx`: os 22 tipos agora têm motor; `PracticeContent` só resta para nada (7 de fala saíram da prévia).

## Decisões registradas
- `scoring.ts` da §6 centralizado em `speaking.ts` (puro) + `speakingResult.ts` (builder do painel) — uma única fonte das constantes.
- Marcação manual do read_aloud (§10.1 "opcional") ficou para depois: não é gate de aceite da fase; registrada aqui como pêndencia de UX.
- Sem STT/permissão → treino sem nota com gravação e replay (D23); "Pronúncia: não avaliada" em todos os painéis (D5).

## Gates verificados (números reais)
- vitest: 213/213 (+21 em `speaking.test.ts`, casos anotados: 75 com substituição, 50 com moved, 83 com extra+repetição, piso 0, fluência/pausas/ritmo/cap, cobertura < 4 → null, answer_short)
- tsgo: limpo · build: OK · lint: 0 erros (10 warnings pré-existentes)
- Playwright com stub determinístico de `SpeechRecognition`: 7 tipos × desktop 1280 × 390×844 = 14/14 OK — painel de resultado com os 3 subscores, zero erro de console; sem permissão de microfone no headless a UI cai no caminho "treino sem nota" com mensagem clara (verificado)
- Zero deps de runtime novas · nenhum arquivo gerado editado

## Próxima fase
Fase 6 — Inteligência: sessões, diagnóstico, estimativa, prontidão, plano, relatório.
