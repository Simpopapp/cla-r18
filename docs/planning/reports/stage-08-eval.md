# Avaliação — Stage 08 (reavaliação pós-correções)

**Data:** 2026-10-17
**Veredito:** concluída
**Confiança da avaliação:** alta

## Resumo executivo

Reavaliação do parecer anterior (veredito parcial). As quatro correções alegadas pelo builder foram **verificadas diretamente no código/dados e reproduzidas neste ambiente**: (1) o vazamento no simulado foi fechado — `SwtEngine` (linha 79), `WriteEssayEngine` (linha 79) e `RtsEngine` (linha 95) agora passam `disabled={mode === "exam"}` ao `PlusText`/`PlusPhraseCard`, com o `disabled` propagando-se até à bolha de palavra (`PlusText.tsx:35-38,51,73`), e o teste de regressão novo em `plus-integration.test.tsx:175-197` cobre os 3 motores checando 0 gatilhos de frase, palavra e fala em `mode="exam"`; (2) a integração estendida a `McqEngine` (passage + question, fase pre, `disabled` em exam — `McqEngine.tsx:118-137`) e `RetellLectureEngine` (transcript na revelação pós-resultado, fase post, `disabled` em exam — `RetellLectureEngine.tsx:106-113`) existe no código; exceções a motores restantes com justificativa registradas no roadmap canônico (`.opencode/roadmap-proj1.md:50`) e espelhadas em `docs/planning/ROADMAP.md:48`; (3) a pendência de `read_mcq_single.passage` foi registrada honestamente e **reproduzida por este monitor com os módulos reais do app** (31 hashes desalinhados confirmados; a contagem de índices fora do banco divergiu — 6 pelo monitor vs 3 alegados, ver Discrepâncias); (4) `docs/planning/ROADMAP.md` está sincronizado com Fase 8 `[x]` e linha de Gates com números reprodutíveis. Todos os gates foram reexecutados verdes: vitest 319/319 (33 arquivos) · `tsgo --noEmit` exit 0 · build OK · lint 0 erros/9 warnings pré-existentes. A etapa está **concluída**, com residuais corretamente endereçados para Fases 9–10.

## Cobertura de requisitos

### Atendido (verificado no código/testes/reprodução)
- **Vazamento no simulado fechado (§12/D17 — item bloqueante anterior):** os 9 motores que renderizam o pack agora respeitam `mode="exam"` — leitura (`McqEngine` ×2), escrita/fala em `ReadAloudEngine.tsx:104`, `RepeatSentence` (grade só fora de exam), `WfdEngine.tsx:105`, `SwtEngine.tsx:79`, `WriteEssayEngine.tsx:79`, `RtsEngine.tsx:95`, `RetellLectureEngine.tsx:112`. O `disabled` suprime **tudo** (frase, palavra, áudio) via política anula em `PlusText.tsx:35-38`. Teste de regressão do simulado presente e específico (3 motores × 3 tipos de gatilho = 9 asserções zero).
- **Integração estendida (anterior "P1 de Reading morto"):** `read_mcq_single`/`read_mcq_multi` têm superfície de tradução de passagem com hash FNV-1a lookup honesto via `lookupPhrase` (null se `h` diverge — nunca tradução errada, `phrases.ts:51-64`).
- **Exceções justificadas registradas nos dois roadmaps:** campos com lacunas (read_fib_dropdown/read_fib_drag/lst_fib, `lst_hiw.shown`) sem gatilho por conflito de interação; `reorder_paragraphs` idem (arraste); sst/lst_hcs/lst_smw/lst_mcq_* com transcrição apenas como áudio nativo 1× (sem superfície de texto — os `POLICY` de `plusAudio.ts:68-91` já marcam esses tipos como `nativeAudio: true`); `answer_short.question`, `rts.scenario` e `read_aloud.text` seguem o mesmo princípio de áudio nativo. Os campos de modelo (sample pós-resultado) e `describe_image.facts` continuam disponíveis para Fase 10 (varredura final) — P3.
- **Pendência honesta de `read_mcq_single.passage`:** reproduzida por este monitor com `hashSentence` + `splitSentences` reais do app sobre os JSONs: **31 frases desalinhadas** (todas em 7 questões de `passage`; ex: qid `goarno-read_mcq_single-101` índices 1–6). Estado honesto confirmado: `lookupPhrase` devolve null → "Tradução não disponível". A garantia "nunca tradução errada" segue válida. Pendência registrada no roadmap canônico (`.opencode/roadmap-proj1.md:50`) e no status.
- **Espelho sincronizado:** `docs/planning/ROADMAP.md:45-49` com Fase 8 `[x]`, correções pós-avaliação e linha de Gates completa (8 combinações · zero fala pt-BR · zero vazamento antes do resultado · balão/card só por toque · pack desligado = regressão zero · pack desligado no simulado · números reais).
- **Gates reproduzidos neste ambiente:** bunx vitest run → **319/319** (33 arquivos) · `bunx tsgo --noEmit` → exit 0 · `bun run build` → OK (nitro complete) · `bun run lint` → 0 erros, 9 warnings pré-existentes · zero deps de runtime novas · nenhum arquivo gerado editado.

### Parcial (não bloqueia — endereçado adiante)
- **Integridade de hash nos 22 tipos no teste padrão:** `plus-integrity.test.ts:46-48` continua valendo apenas write_essay e swt. A perda de cobertura em `read_mcq_single.passage` está agora **registrada** (não mais silenciosa) e o realinhamento é pendência declarada da Fase 10 — aceitável como estado honesto, mas o gate de regressão automática para os outros 19 tipos segue para Fase 10.
- **Escopos P1/P2 sem lista auditável no repo:** os totais P1 1.656 + P2 2.461 = 4.117 continuam não reproduzíveis diretamente dos arquivos (não existe registro do conjunto P1/P2). Selo mantido por coerência com os registros já existentes nos roadmaps.
- **Verificação E2E visual (Playwright 390×844):** alegada no status; consistente com o código e com os testes de integração, mas não re-executada por este monitor nesta rodada (mesmo protocolo da avaliação anterior).

### Ausente / não evidenciado
- Nada de novo — todos os itens "ausente" do parecer anterior foram corrigidos, integrados ou registrados com justificativa.

## Qualidade do código

**Pontos fortes:**
- O gate de exam é centralizado em `disabled` no nível do `PlusText`/`PlusPhraseCard`/`PlusWordText` — o motor declara o modo, o componente decide; nenhuma lógica de exam espalhada.
- O teste de regressão do simulado é preciso: renderiza os 3 motores reais com `mode="exam"`, toggles todos ligados e asserções de 0 gatilhos — exatamente o cenário que vazava antes.
- Estados honestos preservados em toda a matriz (null / "Tradução não disponível" / oculto sem voz) — nenhum caso de tradução errada ou conteúdo vazado.
- Documentação das exceções nos dois roadmaps é explícita, com motivo (conflito de interação / sem superfície de texto / áudio nativo 1×), deixando o pipeline dev-time rastreável para a Fase 10.

**Pontos de atenção:**
- `plus-integrity.test.ts` ainda cobre 2/22 tipos; a ampliação é pendência da Fase 10 (não mais uma falha de registro, mas um item pendente real).
- Sem varredura de hash no teste padrão, qualquer edição do banco que quebre os 19 tipos restantes só será detectada na varredura dev-time da Fase 10 (rastreável hoje pelo roadmap, não por teste).

## Discrepâncias
Entre o status do builder e o código real (o código é a verdade):
1. **Contagem de índices fora do banco diverge:** status/roadmap registram "31 desalinhados + 3 fora do banco"; a checagem deste monitor com `splitSentences` canônico encontrou **31 desalinhados (bate certinho) + 6 fora** (entradas em qids 101, 109, 122, 123, 132, 143 — todas na posição final da passagem, ex.: `goarno-read_mcq_single-101.passage[7]` com 7 frases no banco). A diferença não afeta o estado honesto (todas as entradas fora de índice devolvem null via hash/índice e nunca são renderizadas além do comprimento), mas a pendência da Fase 10 deve carregar o número verificado (31 + 6).
2. O espelho `docs/planning/ROADMAP.md` registra as correções e exceções, mas não a linha do pendência de hash (`31+3/6`) — está no roadmap canônico e no status; uma linha no espelho formal completaria a paridade.
3. O gate de integridade automática segue 2/22 — coerente com o status ("realinhamento como Fase 10"), mas não varrível por checagem única desta etapa.

## Riscos para as próximas etapas
- **Fase 9 (offline):** o "Baixar para offline" incluirá os dados do pack; com a pendência conhecida, o downloader não deve contar com arrays desalinhados de read_mcq_single — o custo existe hoje (31+6 entradas inúteis num chunk) e é rastreável.
- **Fase 10 (a11y/fechamento):** a varredura final precisa cobrir: realinhamento dos 31+6 `read_mcq_single.passage`; ampliação do `plus-integrity.test.ts` aos 22 tipos; superfícies deliberadamente ausentes (sample/`describe_image.facts`) decididas e documentadas.
- **Revisão de banco:** edições em read_mcq_single invalidam hashes dos 19 tipos sem guard automático — mitigada pelo registro (não silêncio) até lá.

## Recomendações
1. **(Fase 10, alta)** Na varredura final: rodar realign sobre os **31 desalinhados + 6 fora de índice** (número do monitor, não 3) e ampliar `plus-integrity.test.ts` aos 22 tipos.
2. **(média, 1 linha)** Incluir no espelho `docs/planning/ROADMAP.md` a pendência de hash (31 desalinhados + índices fora de banco, número verificado) para paridade com o roadmap canônico.
3. **(baixa)** Registrar o conjunto P1/P2 como lista auditável no repo quando a Fase 10 varrer os 22 tipos (facilita auditar os "100%" sem scripts ad hoc).

## Evidências consultadas
- **Planejamento:** `docs/planning/PRD.md` (§5 R5, §12:456, §13:462-468, §17:572) · `docs/planning/ROADMAP.md` (Fases 8–10, linhas 45-49) · `docs/planning/stages/stage-08-status.md` (seção "Correções pós-avaliação") · parecer anterior (`docs/planning/reports/stage-08-eval.md`) · `.opencode/roadmap-proj1.md:45-51` (canonical, Fase 8 + exceções + pendência).
- **Código:** `src/components/practice/{Swt,WriteEssay,Rts,ReadAloud,RepeatSentence,Wfd,Mcq,RetellLecture}Engine.tsx` · `src/components/exam/ExamRunner.tsx` (mode="exam") · `src/components/plus/{PlusText,PlusPhraseCard,PlusWordText,PlusSpeakButton}.tsx` · `src/lib/plus/{phrases,sentences,plusAudio,settings}.ts`.
- **Testes:** `src/test/plus-integration.test.tsx` (11 testes, incl. `mode=exam` × 3 motores, linhas 175-197) · `src/test/plus-integrity.test.ts` (estado atual, 2 tipos).
- **Dados reprodutíveis por este monitor:** scan dev-time com `hashSentence` + `splitSentences` do app sobre os 22 `src/data/plus/phrases/*.json` × `src/data/pte/*.json` → 4.562 entradas, 31 misalign (todas em read_mcq_single.passage) e 6 outOfRange (read_mcq_single.passage), zero em qualquer outro tipo.
- **Gates executados neste ambiente:** `bunx vitest run` → 319/319 (33 arquivos) · `bunx tsgo --noEmit` → exit 0 · `bun run build` → OK · `bun run lint` → 0 erros/9 warnings.
