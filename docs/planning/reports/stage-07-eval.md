# Avaliação — Stage 07 (Fase 7 — Simulado fiel) · reavaliação do follow-up de fidelidade

**Data:** 2026-10-17
**Veredito:** concluída
**Confiança da avaliação:** alta

> Nota do monitor: esta é a **segunda avaliação** da Stage 07. A primeira (preservada mais abaixo, veredito "parcial") emitiu 5 recomendações; todas foram endereçadas nesta rodada. Verificações do monitor: **estáticas** (leitura de código, testes, trilha git) + logs de observabilidade. Claims de execução do builder (vitest 277, lint 0, E2E Playwright) ficam registrados como "relatado, não re-executado pelo monitor" — porém **reconciliáveis**: a contagem estática da suíte fecha exatamente em 277 (247 declarações `it/test` + 30 linhas de `it.each` em 4 blocos) e `/tmp/observability/build-errors.log` mostra dois builds "OK" após as edições (20:23:00Z e 20:23:35Z), sem runtime errors.

## Resumo executivo
O follow-up de fidelidade da Fase 7 foi entregue conforme descrito no status da etapa: no simulado, os **12 tipos com enunciado em áudio** agora só armam o prazo de resposta quando a reprodução termina (`EXAM_AUDIO_PROMPTS` + `examPromptWaits` em `src/lib/pte/exam.ts:76–93`; `ExamPromptProvider`/`useExamPromptEnd` em `src/components/practice/ExamPrompt.tsx`; notificantes `AudioPlayOnce.tsx:69,75` e `SgdEngine.tsx:49,83`; `ExamRunner.tsx:39–42,55,71–73,129` — cronômetro "—" e envio bloqueado durante a espera). `read_aloud`, `describe_image` e `rts` permanecem text-first, com a partição dos 22 tipos coberta por teste (`exam.test.ts:70–79`). A saída honesta "Não consigo ouvir o áudio — iniciar o tempo" consome o áudio 1× antes de armar (`ExamRunner.tsx:115–127` + `claimExamAudio`, persistido e testado). As aproximações (gravar antes do fim do áudio; reload no meio da reprodução exige o botão; áudio sintetizado varia por dispositivo) estão registradas no status. Os quatro gaps objetivos do parecer anterior (checklist Pearson ausente, status inexistente, timing do áudio não verificado, fragilidade no auto-submit) foram todos resolvidos. Restam apenas divergências de documento (espelho do roadmap desatualizado), listadas abaixo, sem impacto no código.

## Cobertura de requisitos
**Atendido (evidência no código):**
- **Enunciado em áudio precede o tempo de resposta:** `EXAM_AUDIO_PROMPTS` com os 12 tipos — repeat_sentence, retell_lecture, answer_short, sgd, wfd, sst + os 6 de listening (`exam.ts:76–89`); partição completa dos 22 testada com RA/DI/RTS explicitamente fora (`exam.test.ts:76–78`) e o novo teste "claim não arma o prazo; armar é passo separado" (`exam.test.ts:80–85`).
- **Armar do prazo só pós-reprodução:** `ExamRunner` só chama `armExamItem` quando `waits && promptEnded` (efeito `ExamRunner.tsx:39–42`); notificação no `onend` do speak e ao interromper (`AudioPlayOnce.tsx:67–76`); em `SgdEngine` ao fim da cadeia de turnos e no stop (`SgdEngine.tsx:43–66,78–84`). Na espera: cronômetro "—" com mensagem informativa, submit `disabled={prep || waiting}` (`ExamRunner.tsx:114–134`) e auto-submit por prazo impossível enquanto `deadline` é null (`exam.ts:105–112` zera o deadline por questão; `ExamRunner.tsx:47–51` exige `!deadline`).
- **Pronto:** `docs/planning/stages/stage-07-status.md` agora existe (criado no commit `15e8919`) com seção "Follow-up fidelity", gates reais, aproximados e URLs.
- **Checklist:** Pearson item a item registrado no roadmap da Fase 7 (contagens × tempos × ordem, com "~65 não garantido", ordem vigente SGD→RTS prevalecendo sobre a divergência do relatório, itens confirmados vs. aproximados por tipo, URLs e data no status).
- **Recomendações da avaliação anterior — 5/5 endereçadas:**
  1. `stage-07-status.md` criado (antes inexistente — sem o registro, os gates ficavam sem evidência primária).
  2. Checklist Pearson do blueprint registrado no roadmap da Fase 7 (base da validação da Fase 0 re conferida; limites honestos explicitados).
  3. Limitação de playback do prompt **corrigida por implementação + 2 testes**, não apenas documentada; aproximados restantes registrados no status.
  4. Auto-submit blindado: o efeito em `ExamRunner.tsx:47–51` agora faz early-return quando `!autoSubmitRef.current` e só marca `fired.current = true` quando o envio de fato dispara — se o motor demorar a montar (Suspense), o tick seguinte (250 ms) tenta de novo.
  5. Checkboxes da Fase 7 remarcados no roadmap canônico com números reais (vitest 277/277, tsgo, build OK, lint 0 erros/9 warnings pré-existentes, mini-simulado Playwright).
- **Base da fase, re conferida fisicamente nesta rodada:** fila estratificada sem repetição e omissões (testes 20–51), sem voltar/refazer (submit só do qid atual, `exam.ts:131`), tentativas `mode:"exam"` + tag `exame` alimentando o SRS (`exam.ts:124–151`; teste 86–95), resumo com estimativa por habilidade e resultados fora do log truncável (teste 96–118).

**Parcial / notas de verificação:**
- Claims de execução (vitest 277/277, lint, tsgo, build OK, Playwright mini-simulado: RA prep→resposta, RS espera "—" com envio bloqueado, prazo arma após o áudio ~0:14, describe_image imediato, console limpo) — **relatado, não re-executado pelo monitor**, mas coerente: a reconciliação estática fecha em 277 exatos e o log de build mais recente é OK.
- A verificação Playwright deste follow-up rodou **apenas em desktop 1280**; o mobile 390×844 foi verificado na entrega anterior da fase para os fluxos de execução, mas o comportamento novo (espera "—", botão de escape, armamento pós-áudio) não teve evidência de mobile nesta rodada — lacuna pequena, sem indício de layout quebrado no código (botão usa `min-h-11` e a barra `flex-wrap`).

## Qualidade do código
**Pontos fortes:** coordenação áudio × prazo via contexto React declarativo (`ExamPrompt.tsx` de 15 linhas — nenhum estado global novo; cleanup automático pelo unmount do provider dentro do `Suspense` por questão); funções puras testáveis em `exam.ts` (`examPromptWaits`, `claimExamAudio`) com invariante idempotente de arme (`deadline !== null → return`, sem duplo prazo pós-reload); escape button honesto que não recompensa quem ficou sem som (o claim do 1× persiste e é testado); duplo envio bloqueado por cursor/qid (`exam.ts:131`); comentários explicam o porquê em pt-BR; testes cobrem partição de tipos e a separação claim→arm.

**Pontos de atenção (não críticos):**
1. `SgdEngine.tsx:62` — `utterance.onerror` só reseta o turno visual e **não** chama `notifyPromptEnd`: se um turno falhar no meio, a espera persiste até o stop (que arma) ou o botão de escape. Comportamento seguro (sempre há saída), mas notificar também no erro seria mais limpo (1 linha).
2. Durante a espera o conteúdo fica **interativo** (opções clicáveis; gravação pode ser iniciada) — aproximação declarada no comentário de `ExamRunner.tsx:86–88` e no status; o prazo só começa ao fim do áudio, mas o aluno pode interagir antes do relógio.
3. O áudio não auto-reproduz ao abrir a questão (exige clique em "Ouvir o áudio") — aproximação da prova real (áudio automático), consistente com o formato de prática do app e com a limitação já registrada.
4. `rts` text-first diverge do §4.2 do PRD ("cenário em áudio") — desvio justificado e registrado (áudio sintetizado varia por dispositivo), com comentário explícito no próprio `exam.ts:72–75` e no status. Como o §4.2 já rotulava o tempo de rts como "confirmar", a decisão é defensável; convém mantê-la registrada como aproximação permanente para não reabrir o tema na Fase 10.

## Discrepâncias
1. **Espelho do roadmap desatualizado:** `.opencode/roadmap-proj1.md` (canônico) marca Fase 7 `[x]` com a linha "Fidelidade F7" e os gates 277/277, mas `docs/planning/ROADMAP.md` ainda mostra Fase 7 `[ ]` com a nota "Fase permanece aberta… parecer do monitor ainda não retornou" e a linha de Gates antiga (sem números reais), sem a entrada "Fidelidade F7". É um gap de **sincronização de documentação**, não de implementação — o último commit divergiu os dois arquivos.
2. **`docs/planning/stages/stage-06-status.md` continua ausente** (stages contém 00–05 e 07) — pendência atravessada da avaliação anterior, fora do escopo da entrega atual, mas re relevada por afetar a rastreabilidade por etapa exigida na Fase 10.
3. Screenshots do E2E citados em `/tmp/browser/exam` não sobrevivem no disco (wipe efêmero de ambiente, não omissão do builder) — a evidência de execução sobrevive como texto no status, reconciliada pela contagem de testes e pelo log de build.

## Riscos para as próximas etapas
- **Fase 8 (pack studie-plus):** o padrão `ExamPromptProvider` existe apenas dentro de `/exam`; o pack terá áudio próprio (sotaque/velocidade) e precisará de mecanismo análogo de coordenação áudio × contagem — decidir antes, com o mesmo critério de aproximação registrada.
- Se o padrão "não notificar no erro" (`SgdEngine.onerror`) se repetir em outros motores com áudio multi-turno, o canto silencioso se replica — centralizar a notificação no ponto único (AudioPlayOnce já cobre os tipos do motor C).
- Fase 10 percorre os 22 motores em 390×844 novamente; validar o comportamento novo em mobile antes evita retrabalho dobrado lá.

## Recomendações
1. **(Alta, doc)** Sincronizar `docs/planning/ROADMAP.md` com `.opencode/roadmap-proj1.md` na Fase 7 (checkbox `[x]`, linha "Fidelidade F7", Gates com números reais: vitest 277/277, tsgo limpo, build OK, lint 0 erros/9 warnings, mini-simulado Playwright desktop 1280, console limpo) — um commit de sincronização; re avaliadores futuros não devem ler estado obsoleto.
2. **(Média)** Criar `docs/planning/stages/stage-06-status.md` retroativo (entrega da Fase 6 com gates 266/266 já registrados no roadmap) — fecha a lacuna de rastreabilidade e forma a disciplina exigida na Fase 10.
3. **(Média)** Notificar o fim do prompt em `SgdEngine` também via `utterance.onerror` (1 linha) — fecha o único caminho de espera sem saída passiva; considerar o mesmo contrato ao tocar áudio em `useSpeechSynthesis`.
4. **(Baixa)** Antes da Fase 10, rodar o mini-simulado do follow-up em 390×844 (screenshot + console), completando a prova de responsividade do comportamento novo.
5. **(Baixa)** Após sincronizar o espelho, remover a nota "Fase permanece aberta" do `docs/planning/ROADMAP.md`.

## Evidências consultadas
- **Documentação:** `docs/planning/PRD.md` (§4.2, §4.4, §10.1, §12); `docs/planning/ROADMAP.md` (Fase 7); `.opencode/roadmap-proj1.md` (Fase 7, canônico); `docs/planning/stages/stage-07-status.md` (incl. seção "Follow-up fidelity"); avaliação anterior da Stage 07 (preservada abaixo), cujas 5 recomendações foram endereçadas.
- **Código inspecionado:** `src/lib/pte/exam.ts` (185 linhas; adições F7 em 72–93 e 114–122); `src/components/practice/ExamPrompt.tsx` (15 linhas); `src/components/exam/ExamRunner.tsx` (138 linhas); `src/components/practice/AudioPlayOnce.tsx` (108 linhas); `src/components/practice/SgdEngine.tsx` (linhas 25–90); `src/components/practice/PracticeEngine.tsx` (provider do `mode`).
- **Testes inspecionados:** `src/test/exam.test.ts` (11 testes; os 2 novos em 70–85); contagem estática completa da suíte: 247 declarações `it/test` + 30 linhas de `it.each` (blocos em essay ×2, summary, coverage) = **277** — igual ao relatado.
- **Estado do repo:** `git log`/`git show --stat` (somente leitura). Trilha do follow-up: `193b07b` (ExamPrompt + SgdEngine), `80cc3f4` (ExamRunner + AudioPlayOnce + imports de teste), `bd0714a` (SgdEngine + teste), `e4f295c` (os 2 novos testes), `2681a38`/`87241eb` (ExamPrompt — ajuste de 1 linha), `bcb49ca` (guard do auto-submit), `15e8919` (status + roadmap canônico `[x]`). Nenhum arquivo gerado (`routeTree.gen.ts` etc.) editado; zero dependências de runtime novas.
- **Observabilidade:** `/tmp/observability/build-errors.log` — duas entradas mais recentes "build OK" (20:23:00Z, 20:23:35Z); `/tmp/observability/runtime-errors.log` — vazio.

---

# Avaliação anterior — preservada para histórico (2026-10-17, veredito "parcial")

**Data:** 2026-10-17
**Veredito:** parcial
**Confiança da avaliação:** alta

**Resumo:** A Fase 7 estava funcionalmente implementada — `exam.ts` (fila estratificada, prazos persistidos, áudio 1×, `mode: "exam"` + tag `exame`, resumo por habilidade), `ExamRunner` (cronômetro regressivo, auto-submit por prazo, sem voltar/refazer) e `/exam` (full × parte × mini com rótulos, omissões e resumo comparativo). A suíte da época cobria blueprint 65 sem repetição, mini 22 em ordem de parte, `onlyVerified` com omissões, prazo persistente pós-reload, áudio consumido mesmo com replay habilitado, envio só da questão atual e resumo resistente ao truncamento do log. O veredito "parcial" decorria de quatro gaps objetivos: (1) o gate "blueprint conferido item a item com a Pearson" não estava registrado; (2) `stage-07-status.md` não existia; (3) o cronômetro de resposta não aguardava o fim da reprodução do prompt (limitação declarada pelo builder); (4) o auto-submit podia falhar silenciosamente com `autoSubmitRef` nulo no tick. **Todas as constatações foram endereçadas na reavaliação acima** (ver "Cobertura de requisitos — Recomendações da avaliação anterior").
