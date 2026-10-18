> ⚠️ OBSERVAÇÃO IMPORTANTE ⚠️
> Esta tarefa exige o máximo potencial agêntico: execute-a de ponta a ponta, sem parar para perguntar ao usuário.
> NÃO use o OpenCode/monitor como executor nem como subagente (ele só monitora): mantenha-o em background e avise-o ao concluir.

# Projeto 1 — PTE Master Hub: plataforma local de preparo para o PTE Academic (22 task types, do zero ao fim)

## Visão
Construir, já em seu estado final, uma plataforma de treino para o PTE Academic que cubra **todos os 22 task types oficiais vigentes**,
rode 100% no navegador do aluno (localStorage, offline-first, sem conta, sem nuvem) e responda a três perguntas:
**O QUÊ revisar** (agenda de repetição espaçada), **QUANDO** (plano do dia) e **POR QUÊ errou** (diagnóstico de erros) — medindo o preparo
com honestidade (estimativa de treino, nunca "nota oficial") e permitindo ensaiar a prova num simulado fiel ao formato oficial.

**Nada existe ainda**: nem código, nem banco de questões, nem traduções, nem a matriz oficial confirmada. As questões precisam ser
**encontradas, verificadas e integradas**; tudo é criado a partir destes três arquivos, do primeiro commit ao último.

## Para quem
Aluno brasileiro em preparação (metas típicas 50/58/65/79). Interface em pt-BR; conteúdo do exame em inglês; voz via Web Speech API.

## Princípios (ordem de prioridade — resolvem qualquer conflito de decisão)
1. **Não perder nem distorcer o progresso.** O estado de repetição espaçada vive em snapshots por questão, independentes do log; estado ilegível
   vai para quarentena (nunca é sobrescrito); importar backup mostra prévia, permite mesclar e desfazer.
2. **Medir com honestidade.** O que é heurística é rotulado "estimativa de treino"; o que o app não mede (pronúncia, gramática, ortografia)
   aparece como "não avaliado", jamais como nota inventada. Uma única escala por tela (exercício 0–100 **ou** estimativa 10–90, nunca misturadas).
3. **Fidelidade à prova real.** 22 tipos, matriz tarefa×habilidade, tempos e blueprint do simulado confirmados na fonte oficial (Pearson).
4. **Dados reais, rastreáveis e sem duplicatas.** Nenhuma questão gerada por IA; só fonte acessível sem login, com gabarito/transcrição,
   classificada por proveniência (selo visível), com dedupe e payload enxuto.
5. **Mobile-first e acessível desde a primeira tela** (390×844, alvos ≥ 44 px, sem hover, WCAG AA, teclado completo).
6. **Offline de verdade**: tipo nunca visitado funciona depois de "Baixar para offline"; nova versão é avisada, não imposta.
7. **Números derivados**: contagens exibidas ou indexadas (UI, SEO, manifest) vêm sempre do manifesto do banco; nunca hardcoded.

## Catálogo oficial — 22 task types (matriz a reconfirmar na Fase 0)
| Seção do app | Task types (slug · habilidades pontuadas) |
|---|---|
| Speaking (7) | read_aloud S · repeat_sentence L+S · describe_image S · retell_lecture L+S · answer_short L · sgd L+S · rts S |
| Writing (2) | swt (Summarize Written Text) R+W · write_essay W |
| Reading (5) | read_fib_dropdown R · read_mcq_multi R · reorder_paragraphs R · read_fib_drag R · read_mcq_single R |
| Listening (8) | sst (Summarize Spoken Text) L+W · lst_mcq_multi L · lst_fib L · lst_hcs L+R · lst_mcq_single L · lst_smw L · lst_hiw L+R · wfd L+W |
`sgd` = Summarize Group Discussion; `rts` = Respond to a Situation. Seção = onde o aluno treina; habilidade = o que o exame pontua (podem diferir).

## O que o produto contém
- **Banco de questões** (§ aquisição): busca ativa de fontes por tipo → gate de fonte → extração → dedupe → proveniência → manifesto + chunks por tipo.
- **Persistência íntegra**: snapshot SRS por questão, agregados diários, log truncável, quarentena, backup v1 com prévia/mesclar/desfazer, aviso de quota.
- **4 motores de prática**: A Voz (7 tipos de fala), B Escrita/Ditado (wfd, swt, sst, write_essay), C Áudio interativo/lacunas (6 de listening),
  D Leitura (5 de reading). Todos com timings oficiais, correção pura testada, painel de resultado com subscores honestos.
- **Camada de inteligência**: SRS correto (só promove se vencida), fila do dia, sessões híbridas retomáveis, diagnóstico de erros, notas e atalhos,
  estimativa 10–90 por habilidade com confiança e tendência, prontidão vs. alvo, plano do dia, relatório semanal compartilhável, meta (data + alvo).
- **Simulado fiel**: blueprint oficial (~2 h, 3 partes) × mini-simulado, cronômetro por questão, resultado por habilidade/tipo vs. alvo e histórico.
- **Pack "studie-plus"** (extra de estudo, fora da replicação do PTE, desligado por padrão, configurável em Ajustes): tradução por palavra
  (literal + contextual), tradução por frase (literal + sentido geral), áudio de pronúncia **do inglês original**. Os 3 recursos são independentes.
- **Offline/PWA real**, SEO e manifest derivados do banco, acessibilidade auditada, voz TTS usada informada ao aluno.

## Restrições permanentes
- Sem auth, multiusuário, nuvem, pagamento ou sync; 100% local; backup JSON versionado é o envelope de dados.
- TTS/STT pela Web Speech API; zero dependências de runtime além do scaffold; sem correção por IA; sem prometer nota oficial.
- Pack studie-plus off por padrão, dado separado do banco nativo; áudio do pack nunca fala a tradução; tradução nunca se mistura ao banco.
- Gates por fase: vitest + tsgo --noEmit + build + lint + preview :8080 (Playwright nas rotas tocadas, desktop e 390×844).

## Escopo negativo
Sem contas/nuvem/pagamento; sem questões geradas por IA; sem apagar questão sem registro; sem notificações push; sem bibliotecas novas de
gráfico/estado/voz/tradução/i18n; sem tradução em runtime; sem alegar equivalência com a pontuação oficial.

## Ordem lógica (fases; detalhes no PRD, progresso no roadmap)
0. **Fundação e verdade oficial** — scaffold, gates, contratos de dados, matriz/tempos/blueprint confirmados na Pearson (tudo depende disso).
1. **Persistência, datas e SRS** — a base de dados do aluno vem antes de qualquer tela que a escreva.
2. **Banco de questões** — busca/gate/dedupe/proveniência dos 22 tipos (pode rodar em paralelo à Fase 1; bloqueia o que precisa de conteúdo real).
3. **Catálogo, hub e shell de prática** — rotas, dashboard, listas, filtros, selos, Ajustes/backup, PracticeShell (notas, atalhos, timers).
4. **Motores de texto e seleção** — B, C e D (15 tipos): correção pura primeiro, UI depois.
5. **Motor de voz** — A (7 tipos), reconhecimento, alinhamento, subscores honestos, detector de template.
6. **Inteligência** — sessões, diagnóstico, estimativa, prontidão, plano, relatório (precisa de motores e dados reais).
7. **Simulado fiel** — depende do blueprint (F0), dos motores (F4–F5) e da estimativa (F6).
8. **Pack studie-plus** — depende do banco final (F2) e das superfícies de UI prontas (F4–F5); áudio por último.
9. **Offline real e governança de métricas** — depende do payload final e das rotas completas.
10. **Acessibilidade, mobile e fechamento** — auditoria transversal, gates globais, relatório.

## Critérios de aceite globais
1. Catálogo mostra os 22 tipos; tipo sem banco suficiente exibe selo "banco pequeno" ou "em breve" com motivo — nunca conteúdo duvidoso.
2. Probes de integridade (teto do log, estado corrompido/versão futura, import destrutivo, SRS inflado) são testes verdes.
3. Nenhuma tela mistura escalas; toda estimativa vem rotulada, com confiança; pronúncia aparece como "não avaliada".
4. Offline: tipo nunca visitado funciona após "Baixar para offline"; nova versão do app é avisada.
5. Nenhum número de contagem hardcoded em rotas/SEO/manifest (teste de sincronização verde).
6. Axe sem violações graves nas rotas principais; 390×844 sem overflow horizontal; console limpo.
7. Pack studie-plus: 8 combinações de toggles válidas; zero fala em pt-BR; zero vazamento de gabarito antes do resultado.

## Limites assumidos (registrar, não esconder)
Mic real, qualidade do TTS por dispositivo e comportamento de Safari/Chrome são conhecimento de plataforma a confirmar em teste manual; pesos numéricos
exatos do score oficial são proprietários (usa-se aproximação rotulada); fontes de questões são secundárias e têm nível de confiança registrado.
