# PRD — PTE Master Hub

> Fonte do escopo: `.opencode/project1.md` · Roadmap: `.opencode/roadmap-proj1.md`.
> Este PRD define o COMO: decisões técnicas, contratos, escopo por fase e critérios de aceite. **Nada pré-existe**: o agente cria scaffold (ou adota o
> que o ambiente já trouxer), dados, lógica, UI e testes. Dúvida → decidir e registrar na §20, nunca perguntar ao usuário.
> **DEVE** = obrigatório e testável. "constante X" = valor único, nomeado, ajustável em um só lugar (nunca repetido como literal).

---

## 1. Produto

### 1.1 Objetivo
Hub de treino para o PTE Academic com os 22 task types oficiais vigentes, 100% local (localStorage), offline-first, sem conta. Cada tipo tem uma
prática fiel ao exame (timings, restrições, correção) e o progresso ensina ao aluno **o que revisar, quando e por que errou**, com medição honesta.

### 1.2 Pilares (cada um tem seção própria neste PRD)
| # | Pilar | Seção |
|---|---|---|
| P1 | Banco real, rastreável, sem duplicatas, com selo de proveniência | §5, §6 |
| P2 | Progresso íntegro (nunca perdido/distorcido) + SRS correto | §7, §8 |
| P3 | Correção e medição honestas (estimativa de treino, "não avaliado") | §9 |
| P4 | Práticas fiéis por tipo + shell com notas, atalhos, timers | §10 |
| P5 | Hub, sessões, plano, diagnóstico, simulado fiel | §11, §12 |
| P6 | Pack studie-plus, offline real, governança de números, a11y | §13–§15 |

### 1.3 Vocabulário de escalas (regra de UI)
- **Nota do exercício** (0–100): resultado de UMA tentativa. Rótulo: "nota". Nunca comparada ao alvo.
- **Estimativa de treino** (10–90): agregação por habilidade, sempre com rótulo "estimativa de treino" + confiança. É a única escala comparada ao alvo (10–90).
- Proibido na mesma frase/chip: "%" junto de alvo ou de estimativa. O teste de strings da §15 varre isso.

---

## 2. Restrições permanentes e escopo negativo

| # | Restrição (inalterável) |
|---|---|
| R1 | Sem auth, multiusuário, nuvem, pagamento ou sync. 100% localStorage; IndexedDB só se o tamanho medido exigir (D1). Backup JSON versionado = envelope de dados. |
| R2 | Nenhuma chamada de rede em runtime além do TTS/STT do próprio navegador. Dados são JSON estáticos versionados no repo. |
| R3 | TTS e STT pela Web Speech API. Nenhum serviço/biblioteca de voz. |
| R4 | Zero dependências de runtime além do scaffold. Ferramentas de teste/verificação (Playwright, axe-core) são devDependencies ou externas ao repo. |
| R5 | Pack studie-plus: 100% off por padrão; dados em `src/data/plus/` separados de `src/data/pte/`; áudio do pack fala só o inglês original. |
| R6 | Questões: fonte verificável, acessível sem login, com gabarito/transcrição, **nunca gerada por IA**, dedupe contra o banco e entre fontes (§6). |
| R7 | Sem correção por IA/LLM em runtime; sem prometer nota oficial do PTE; pronúncia/gramática/ortografia = "não avaliadas". |
| R8 | Nenhum número de contagem hardcoded onde exista constante derivada do manifesto (§15). |
| R9 | Lógica pura em `src/lib/**` com testes escritos antes da UI; rotas e componentes só orquestram. |
| R10 | Mobile-first (390×844) e WCAG AA desde a primeira tela; nenhuma interação depende de hover; alvos de toque ≥ 44 px. |
| R11 | Arquivos gerados (ex.: árvore de rotas) nunca são editados à mão. |
| R12 | Nenhum segredo escrito ou ecoado em arquivos, logs ou relatórios. |

**Escopo negativo (N):** N1 contas/nuvem/sync/pagamento · N2 questões geradas por IA · N3 apagar questão sem registro (usa-se `aliases.json`) ·
N4 notificações push/e-mail/calendário externo · N5 bibliotecas de gráfico, estado global, voz, tradução, i18n · N6 tradução em runtime ·
N7 afirmar equivalência com a pontuação oficial · N8 Personal Introduction (não pontuada pela Pearson; registrada como fora do catálogo, com motivo).

---

## 3. Stack, estrutura e convenções

### 3.1 Stack (adotar o scaffold do ambiente; estas são as decisões de referência)
TypeScript estrito · React · roteamento por arquivos com SSR (TanStack Router/Start) · Vite · Tailwind CSS + shadcn/ui (primitivos em `src/components/ui`) ·
Bun (gerenciador/runner) · Vitest + Testing Library + jsdom · `tsgo --noEmit` · ESLint · Playwright e axe-core só para verificação ·
preview de produção pelo runner do scaffold (ex.: `wrangler dev`) · dev/preview na porta **8080**. Gráficos = SVG manual. Sem bibliotecas novas.

### 3.2 Estrutura de pastas
```
src/routes/        __root, index, speaking, writing, reading, listening, practice, session, exam, progress, settings
src/components/    ui/ · practice/ (PracticeShell + motores) · exam/ · plus/ · common/ (TopNav, SectionPage, chips, ScorePanel)
src/lib/           storage.ts · dates.ts · scoring.ts · useSpeechSynthesis.ts · useSpeechRecognition.ts · useAppState.ts
src/lib/pte/       módulos puros (§3.3)            src/lib/plus/   módulos puros do pack (§13)
src/data/pte/      <tipo>.json (um por task type) · manifest.json (gerado) · aliases.json
src/data/plus/     glossary.json · phrases/<tipo>.json
src/test/          *.test.ts(x)                    scripts/        bank/*.mjs · plus/*.mjs · build-manifest.mjs
public/            sw.js · manifest.webmanifest · ícones · di/ (imagens do Describe Image)
.opencode/work/    artefatos dev-time (registro de fontes, relatórios, lotes de tradução) — fora do bundle
```

### 3.3 Módulos puros de `src/lib/pte/` (cada um com `src/test/<nome>.test.ts`)
`types` · `manifest` · `catalog` (loaders por tipo) · `skillMatrix` (matriz, tempos, blueprint, pesos) · `bankTargets` · `provenance` ·
`dictation` · `fib` · `hiw` · `mcq` · `reorder` · `summary` (swt/sst) · `essay` · `speaking` (alinhamento/fluência) · `coverage` (palavras-chave) ·
`templateDetector` · `srs` · `queue` (filas/sessões) · `diagnostics` · `estimate` · `readiness` · `goal` · `studyPlan` · `report` · `exam` · `offline`.

### 3.4 Convenções (C)
| # | Convenção | Por quê |
|---|---|---|
| C1 | Função pura + teste antes da UI. | Regressão barata; UI fina. |
| C2 | SSR/hidratação: nada derivado de `localStorage`, `speechSynthesis`, `Date.now()`, `matchMedia` no primeiro render. `getServerSnapshot` devolve exatamente o que o cliente renderiza no 1º frame (estado vazio) e a hidratação ocorre em efeito. `supported` do TTS/STT é definido em `useEffect`. | Mismatch de hidratação deixa botões "mortos" no cliente. |
| C3 | Listas/navegação usam só `manifest`; conteúdo completo por `import()` dinâmico via mapa explícito de loaders por tipo. | Bundle base leve; bundlers precisam de import estático analisável. |
| C4 | Overlays (balões, menus, tooltips) em portal no `document.body`. | Evita HTML inválido (ex.: `<div>` dentro de `<p>`). |
| C5 | Interações só por clique/tap explícito; nada abre por hover, foco automático ou rolagem. Toda interação de arrastar tem alternativa por toque/teclado. | Mobile; acessibilidade. |
| C6 | Texto visível em pt-BR; conteúdo do exame em inglês; apóstrofo tipográfico normalizado na tokenização. | Consistência. |
| C7 | Constantes nomeadas e únicas (`MAX_ATTEMPT_LOG`, `SRS_INTERVAL_DAYS`, `PASS_SCORE_BY_TYPE`…) exportadas de um só módulo. | Recalibrar sem caçar literais. |
| C8 | Testes que importam bancos grandes usam timeout de 30 s. | Evita falso negativo sob suíte paralela. |
| C9 | Cada fase fecha com gates verdes e o roadmap atualizado (checkbox + linha de Gates com números reais). | Rastreabilidade. |

### 3.5 Tools e skills (tarefas de complexidade média/alta: antes de começar cada tipo de trabalho, listar o que o ambiente oferece e usar o melhor recurso)
| Trabalho | Recurso recomendado |
|---|---|
| Interface, tokens, layout, identidade visual | skill de frontend/design do ambiente (aplicar §11.4) |
| Pesquisa e verificação de fontes (F0, F2) | busca e fetch web; leitura de PDF por skill/ferramenta de PDF; cache bruto em `.opencode/work/bank/raw/` |
| Verificação de UI, mobile, PWA, timers | Playwright (desktop e 390×844; `page.clock`; `set_offline`; stub de `SpeechRecognition`); axe-core injetado |
| Traduções em lote (F8) | subagentes read-only em ondas de até 4; nunca o OpenCode/monitor |
| Dados pesados (dedupe, extração) | scripts Node/Python dev-time resumíveis, com relatório numérico |

---

## 4. Verdade oficial do exame (insumo da Fase 0)

### 4.1 O que DEVE ser confirmado na fonte oficial da Pearson e gravado em `src/lib/pte/skillMatrix.ts` (com URL e data da consulta no comentário)
Fontes-alvo: Score Guide do PTE Academic (Test Taker), páginas oficiais de formato (Speaking & Writing, Reading, Listening) e comunicado oficial do formato
vigente (pearsonpte.com/articles/pte-changes-2025-everything-you-need-to-know/). Fontes secundárias só corroboram; divergência → prevalece a oficial;
o que não for confirmável vira "aproximado" (rotulado) e decisão conservadora, registrada na §20.

Pontos de partida (a reconfirmar, não a assumir): **22 task types pontuados** (os 20 originais + Summarize Group Discussion e Respond to a Situation,
válidos desde 07/08/2025); partes em ordem fixa — **Speaking & Writing → Reading → Listening** (~2 h); Answer Short Question pontua só Listening;
revisão humana de conteúdo para respostas sinalizadas como repetitivas/template (Pearson cita ao menos retell_lecture, swt, sst, sgd, rts; confirmar a
lista completa); escala 10–90 para geral e habilidades; o score geral NÃO é a média das 4 habilidades.

### 4.2 Catálogo × matriz × interação × tempos de partida
Tempos são **aproximados** até a Fase 0 confirmá-los; Reading/Listening têm timer por parte no exame real — o app usa tempo por questão (ponto médio), rotulado "aproximado".
| slug | Nome oficial | Seção | Habilidades | Interação principal | Tempo de partida |
|---|---|---|---|---|---|
| read_aloud | Read Aloud | speaking | S | texto → prep → fala | prep 35 s · fala ≤ 40 s |
| repeat_sentence | Repeat Sentence | speaking | L+S | áudio 1× → repetir | fala ≤ 15 s |
| describe_image | Describe Image | speaking | S | imagem → prep → fala | prep 25 s · fala 40 s |
| retell_lecture | Re-tell Lecture | speaking | L+S | áudio → prep → fala | prep 10 s · fala 40 s |
| answer_short | Answer Short Question | speaking | L | pergunta em áudio → 1–3 palavras | ≤ 10 s |
| sgd | Summarize Group Discussion | speaking | L+S | áudio multi-voz → prep → fala | prep 10 s · fala 120 s (fontes divergem; confirmar) |
| rts | Respond to a Situation | speaking | S | cenário em áudio → prep → fala | prep 10 s · fala 40 s (confirmar) |
| swt | Summarize Written Text | writing | R+W | texto longo → 1 frase (5–75 palavras) | 10 min |
| write_essay | Write Essay | writing | W | prompt → ensaio 200–300 palavras | 20 min |
| read_fib_dropdown | Reading & Writing: FIB (dropdown) | reading | R | lacunas com lista | ≈ 90 s |
| read_mcq_multi | MCQ múltipla (Reading) | reading | R | passagem → várias respostas | ≈ 120 s |
| reorder_paragraphs | Re-order Paragraphs | reading | R | ordenar blocos | ≈ 120 s |
| read_fib_drag | Reading: FIB (drag-and-drop) | reading | R | arrastar palavras às lacunas | ≈ 120 s |
| read_mcq_single | MCQ única (Reading) | reading | R | passagem → 1 resposta | ≈ 120 s |
| sst | Summarize Spoken Text | listening | L+W | áudio → resumo 50–70 palavras | 10 min |
| lst_mcq_multi | MCQ múltipla (Listening) | listening | L | áudio → várias respostas | ≈ 120 s |
| lst_fib | FIB (Listening, digitar) | listening | L | áudio → digitar lacunas | ≈ 90 s |
| lst_hcs | Highlight Correct Summary | listening | L+R | áudio → melhor resumo | ≈ 120 s |
| lst_mcq_single | MCQ única (Listening) | listening | L | áudio → 1 resposta | ≈ 120 s |
| lst_smw | Select Missing Word | listening | L | áudio com bipe final → palavra | ≈ 60 s |
| lst_hiw | Highlight Incorrect Words | listening | L+R | áudio + texto com discrepâncias → clicar | ≈ 120 s |
| wfd | Write From Dictation | listening | L+W | áudio 1× → digitar a frase | ≈ 25 s |

### 4.3 Pesos por habilidade (derivados, rotulados como aproximação)
`SKILL_WEIGHTS[s] = contribuições(s) / total de contribuições`, contando 1 por par (task type, habilidade) da matriz. Com a matriz acima:
Speaking 6 · Listening 12 · Reading 8 · Writing 4 → total 30 → **20 / 40 / 27 / 13 %** (teste exige igualdade com a soma da matriz; se a Fase 0 mudar a
matriz, os números mudam e o teste acompanha). Rótulo na UI: "peso aproximado — a Pearson não publica pesos por tarefa".

### 4.4 Blueprint do simulado completo
`EXAM_BLUEPRINT`: por task type `{ min, max, count, seconds }` com `count` = ponto médio arredondado do intervalo oficial; ordem fixa por parte;
omissões por falta de banco são computadas dinamicamente (`blueprintOmissions`) e exibidas. Detalhes de execução na §12.

---

## 5. Modelo de dados do banco

```ts
export type Section = "speaking" | "writing" | "reading" | "listening";
export type Skill = Section;                       // mesmas 4 etiquetas; papéis distintos (onde treina × o que pontua)
export type TaskType = "read_aloud" | "repeat_sentence" | "describe_image" | "retell_lecture" | "answer_short" | "sgd" | "rts"
  | "swt" | "write_essay" | "read_fib_dropdown" | "read_mcq_multi" | "reorder_paragraphs" | "read_fib_drag" | "read_mcq_single"
  | "sst" | "lst_mcq_multi" | "lst_fib" | "lst_hcs" | "lst_mcq_single" | "lst_smw" | "lst_hiw" | "wfd";
export type Provenance = "verificada" | "comunitaria";           // "ia" não existe: R6/N2
export interface SourceRef { domain: string; url?: string; license?: string; attribution?: string }
export interface QuestionBase { id: string; type: TaskType; topic?: string; source: SourceRef; provenance: Provenance }
export type Question = QuestionBase & { data: QuestionData };   // união discriminada por `type` (campo `data` por tipo, tabela abaixo)
```

### 5.1 `data` por tipo (cada texto é guardado **uma única vez**; o resto é derivado em `catalog.ts`)
| type | campos de `data` | derivados (`catalog.ts`) |
|---|---|---|
| read_aloud | `text` | `displayText`, modelo TTS = `text` |
| repeat_sentence · wfd | `sentence` (wfd) / `transcript` (repeat) | áudio TTS = a própria frase; wfd: `answer = sentence` |
| describe_image | `image` (caminho em `public/di/`), `alt`, `facts: string[]`, `keywords: string[]`, `sample?` | crédito = `source.attribution` |
| retell_lecture · sst | `transcript`, `keywords: string[]`, `sample?` | áudio TTS = `transcript` |
| answer_short | `question`, `answers: string[]` (aceitas + sinônimos) | áudio TTS = `question` |
| sgd | `turns: { speaker: string; text: string }[]`, `keywords`, `sample?` | áudio = turnos com vozes distintas |
| rts | `scenario`, `keywords?`, `sample?` | áudio TTS = `scenario` |
| swt | `text`, `keywords: string[]`, `sample?` | — |
| write_essay | `prompt`, `keywords?`, `sample?` | — |
| read_fib_dropdown | `passage` com marcadores `{{1}}…`, `blanks: { options: string[]; answer: number }[]` | — |
| read_fib_drag | `passage` com `{{n}}`, `bank: string[]`, `answers: number[]` (índice no `bank` por lacuna) | — |
| read_mcq_single / multi | `passage`, `question`, `options: string[]`, `answer: number` / `number[]`, `explanation?`, `traps?: string[]` | — |
| reorder_paragraphs | `paragraphs: string[]` na ordem correta | embaralhamento determinístico por semente = `id` |
| lst_mcq_single / multi | `transcript`, `question`, `options`, `answer`, `explanation?` | áudio = `transcript` |
| lst_fib | `template` com `{{n}}`, `answers: string[]` | `transcript` = template preenchido (áudio) |
| lst_hcs | `transcript`, `options: string[]` (resumos), `answer: number`, `explanation?` | — |
| lst_smw | `transcript` (até o bipe), `options: string[]`, `answer: number` | áudio termina com bipe sintético |
| lst_hiw | `spoken`, `shown` (texto na tela com discrepâncias) | `wrong[]` = diff por tokens `spoken`×`shown` (validado em teste) |

### 5.2 Manifesto e metadados
`scripts/build-manifest.mjs` gera `manifest.json`: por questão `{ id, type, section, domain, provenance, topic?, words? }` + `TYPE_META[type] = { label, section, skills, ready,
reason? }`. `manifest.ts` exporta `allMeta`, `TOTAL_ALL_QUESTIONS` (= `allMeta.length`), `TYPE_COUNT` (= tipos no catálogo), `countByType`, `sectionCounts`,
`ready`/`reason` por tipo, `isSmallBank(type)` (contagem < meta mínima, §6.6). `loaders: Record<TaskType, () => Promise<Question[]>>` importa um JSON por tipo.

### 5.3 Ids e aliases
Id estável e único: `<fonte>-<tipo>-NNN` (ex.: `goarno-swt-012`). `aliases.json` mapeia id descartado por dedupe → id canônico; `resolveQid(id)` é usado por
storage/import/mescla, de modo que progresso e backups nunca apontam para questão inexistente. Ids nunca são reutilizados.

---

## 6. Aquisição do banco de questões (as questões precisam ser encontradas)

### 6.1 Gate de fonte (método adaptativo de confiança)
Toda fonte candidata é avaliada e registrada em `.opencode/work/bank/sources.json` (`url, tipos, volume, evidência, nível, data, status`).
**Eliminatórios (qualquer falha reprova):** G1 acesso (HTTP 200, sem login/e-mail/pagamento/captcha; respeitar robots.txt e termos de uso; sem burlar bloqueios) ·
G2 gabarito/resposta/transcrição explícitos (listening exige transcript para o TTS) · G3 item íntegro (sem truncamento, inglês correto, resposta ∈ opções).
**Pontuação de confiança (0–100):** acessibilidade 15 · gabarito/explicação 20 · fidelidade ao formato 15 (faixas da §6.8) · reputação da marca de preparo 15 ·
corroboração cruzada 20 · amostra manual 15. **≥ 80 → `verificada` · 60–79 → `comunitaria` · < 60 → reprovada.**
- **Corroboração cruzada:** itens que aparecem (por similaridade) em ≥ 2 fontes independentes elevam a confiança de ambas; fonte sem nenhum cruzamento exige amostra maior.
  A pontuação é **recalculada** a cada fonte nova integrada (o banco cresce → a corroboração melhora).
- **Amostra adaptativa:** inspecionar ≥ 10% (mín. 10 itens) antes de aprovar; defeito > 10% na amostra → dobra a amostra; persistindo → reprova a fonte inteira.
- **Sinais de texto sintético (reprovam):** frases genéricas repetidas entre itens, tópicos fora do universo do exame, respostas incoerentes com o enunciado, ausência de marcas editoriais.
- Uma fonte pode ser aprovada para um tipo e reprovada para outro (registrar por tipo).

### 6.2 Proveniência (selo visível em listas e prática)
`verificada` (≥ 80) · `comunitaria` (60–79; ex.: decks comunitários com gabarito). Peso na prontidão: 1,0 / 0,85 (constante `PROVENANCE_WEIGHT`).
Ajustes tem "Só fontes verificadas" (padrão **desligado**): afeta filas SRS/plano/simulado; listas sempre mostram tudo, com selo. Se algum tipo não tiver
item verificado, o filtro ligado o tira das filas — a UI avisa quais tipos ficariam vazios antes de aplicar.

### 6.3 Pipeline (scripts idempotentes e resumíveis em `scripts/bank/`; cache bruto em `.opencode/work/bank/raw/`)
1. **scout** — busca ativa por tipo (prioridade: tipos mais escassos primeiro, §6.6) → candidatas em `sources.json`. 2. **fetch** — 1 req/s, UA identificado, cache.
3. **extract-\<fonte\>** — HTML/PDF/JSON-LD → itens brutos (ferramentas dev-time como `pdftotext` são permitidas; não entram no bundle). 4. **normalize** — para o schema da §5.
5. **validate** — schema + checagens de formato (§6.8) + G3. 6. **dedupe** (§6.4). 7. **integrate** — grava `src/data/pte/<tipo>.json`, `aliases.json`, rodando `build-manifest`.
8. **report** — por tipo e fonte: encontrados · inválidos · duplicatas · integrados → `.opencode/work/bank/report.json` (copiado para o roadmap).

### 6.4 Dedupe (obrigatório antes de integrar; só dentro do mesmo tipo)
Normalização: NFKC, minúsculas, remove pontuação/espaços extras, unifica aspas/apóstrofos. Chave por tipo: frase/transcript (wfd, repeat, read_aloud, retell, sst, listening),
passagem+pergunta (MCQ), passagem (FIB), enunciado (essay/swt/rts/sgd/asq), parágrafos concatenados (reorder), imagem+título (describe_image).
Exata = hash da chave normalizada. Quase = `max(Jaccard de tokens, Dice de trigramas) ≥ 0,85` ou prefixo normalizado de 200 caracteres igual. Contra o banco existente **e** entre fontes
novas; vence o item de maior proveniência (empate: o mais antigo). O descartado vira entrada em `aliases.json`.

### 6.5 Pistas de fontes (candidatas — NADA aqui está pré-aprovado; cada uma passa pelo gate; reconfirmar disponibilidade e termos)
| Alvo | Pistas para buscar |
|---|---|
| Listening (hcs, hiw, smw, mcq, lst_fib, sst) | páginas "Essential Questions"/prediction de goarno.io (≈ 50 itens/tipo com gabarito e transcript) |
| answer_short | goarno.io; PDF de ASQ do pteacademy.in (≈ 100 com chave consolidada) |
| read_mcq_single/multi | goarno.io (single ≈ 48); PDFs do pteacademy.in com "ANSWERS"; edknot.com (parte com chave protegida por JS → reprovar o que não abrir) |
| swt · retell_lecture · rts | goarno.io (≈ 50 cada, com modelo/sample); edknot.com (sgd/rts ≈ 12 cada) |
| read_aloud | stormedugo.com (≈ 47); verificar outras listas abertas (ptenepal.com costuma bloquear o acesso automatizado → reprovar se bloquear) |
| read_fib_dropdown · read_fib_drag · reorder_paragraphs | goarno.io (≈ 50 cada); edknot.com (JSON-LD + HTML); procurar fonte própria para drag-and-drop |
| write_essay | band9pte.com.au (≈ 38 com redação-modelo); 79score.com e languageacademy.com.au (aproveitar só tópicos **com** amostra real) |
| describe_image | Our World in Data (gráficos CC BY 4.0, com atribuição); Test Tips oficiais da Pearson; TypoGrammar exige e-mail (reprovar); PDFs de terceiros só se licença clara e imagens acessíveis |
| sgd · rts | Test Tips/materiais oficiais da Pearson (poucos itens, alta confiança); edknot.com; goarno.io |
| wfd · repeat_sentence · sst · read_aloud (alto volume) | listas abertas de "prediction" de sites de preparo; repositórios públicos com licença que permita reuso; decks comunitários com gabarito. Classificar `comunitaria` quando a curadoria for incerta; **nunca gerar** |
Armadilhas conhecidas (reconfirmar): fontes que exigem cadastro/e-mail, chave de resposta carregada por JS, PDFs com poucas imagens reais, sites que bloqueiam o agente, listas sem gabarito.
Direitos: registrar licença/atribuição quando existir; uso é local e pessoal; não redistribuir o banco como produto; respeitar pedidos de remoção.

### 6.6 Metas por tipo (`src/lib/pte/bankTargets.ts`; metas, não obrigações)
| Tipo | mín. | ideal | | Tipo | mín. | ideal | | Tipo | mín. | ideal |
|---|---|---|---|---|---|---|---|---|---|---|
| wfd | 300 | 900 | | read_aloud | 100 | 200 | | read_fib_dropdown | 40 | 80 |
| repeat_sentence | 200 | 550 | | describe_image | 20 | 60 | | read_fib_drag | 20 | 50 |
| sst | 60 | 120 | | retell_lecture | 40 | 80 | | read_mcq_single | 60 | 110 |
| lst_fib | 60 | 100 | | answer_short | 80 | 140 | | read_mcq_multi | 20 | 50 |
| lst_hcs | 20 | 50 | | sgd | 12 | 40 | | reorder_paragraphs | 40 | 80 |
| lst_smw | 20 | 50 | | rts | 30 | 60 | | swt | 40 | 80 |
| lst_hiw | 20 | 50 | | write_essay | 30 | 60 | | lst_mcq_single / multi | 20 / 20 | 50 / 50 |
Prioridade de busca: P0 = tipos com menor ideal alcançável (lst_hcs, lst_hiw, lst_smw, lst_mcq_*, answer_short, read_mcq_multi, sgd, rts, describe_image) → P1 = swt, retell, essay, read_mcq_single,
fib, reorder → P2 = lst_fib, sst, read_aloud → P3 = wfd, repeat_sentence (só itens 100% novos após dedupe).
**Fallback honesto:** contagem < mínima → selo "banco pequeno" nas listas/plano ("treine, mas não confie na cobertura"); contagem 0 → tipo no catálogo como "em breve" com motivo
(`TYPE_META.reason`, ex.: "sem fonte verificável encontrada"). O catálogo sempre lista os 22 tipos.

### 6.7 Payload enxuto
Texto armazenado uma vez (§5.1); um JSON por tipo; sem campos redundantes; nenhum banco no bundle base; chunk por tipo carregado sob demanda. Medir tamanho dos chunks e registrar no roadmap;
meta: nenhum chunk de dados > 250 KB (bruto) para tipos ≤ 1.000 itens. Se o estado total do aluno estimado ultrapassar 3,5 MB em uso real, reavaliar IndexedDB (D1).

### 6.8 Checagens de formato por tipo (G3 + `validate`)
read_aloud 25–120 palavras · repeat_sentence 4–25 palavras · wfd 3–20 · swt 150–350 · write_essay prompt 15–120 · sst transcript 60–130 s (≈ 150–330 palavras) · retell 80–260 palavras ·
read_mcq passagem 40–400 palavras, 3–5 opções · read_mcq_multi `answer.length ≥ 2` · reorder 4–6 parágrafos · FIB: nº de marcadores = nº de lacunas, resposta ∈ opções/bank ·
lst_fib 1 palavra por lacuna · lst_hcs 3–4 opções · lst_smw 3–4 opções · lst_hiw ≥ 1 palavra errada · answer_short `answers` não vazio · describe_image arquivo existe, `alt` não vazio, licença registrada · sgd ≥ 2 falantes.
Faixas são tolerâncias de plausibilidade (ajustáveis por constante); item fora da faixa vai para revisão manual, não é descartado em silêncio.

### 6.9 Testes de integridade (`src/test/bank-integrity.test.ts`, roda na suíte padrão)
Schema válido por tipo · ids únicos · nenhum par quase-duplicado (≥ 0,85) por tipo · `answer`/`answers` dentro do intervalo · faixas da §6.8 · `provenance` ∈ {verificada, comunitaria} ·
`source.domain` presente em `sources.json` com status aprovado · `aliases.json` resolve para ids existentes · manifesto = soma dos JSONs · `wrong[]` do lst_hiw coerente ·
imagens do describe_image existem com `alt` + licença · `TYPE_META` cobre exatamente os 22 slugs.

### 6.10 Describe Image — `facts` e `alt` determinísticos
Para cada gráfico, o script `scripts/bank/di-facts.mjs` lê o **conjunto de dados do próprio gráfico** (ex.: CSV da fonte) e emite `facts` verificáveis: valor máximo e mínimo (com ano/categoria), início → fim e variação, maior diferença entre séries, ordenação dos
principais itens. `alt` = descrição objetiva (título, eixos, séries, intervalo) montada a partir dos mesmos metadados. Imagem sem dados de origem acessíveis → só entra se a fonte trouxer modelo de resposta; senão fica fora (motivo registrado). Licença e atribuição renderizadas no motor.

---

## 7. Persistência e integridade (`src/lib/storage.ts`, `dates.ts`, `useAppState.ts`)

### 7.1 Estado (versão 1, com infraestrutura de migração pronta para versões futuras)
```ts
interface QuestionSnapshot { attempts: number; bestScore: number | null; lastScore: number | null; lastAttemptAt: number;
  strongAttempts: number; box: number /*0–5*/; dueAt: number }                      // fonte de verdade do SRS, 1 por qid canônico
interface DailyAggregate { n: number; scored: number; sum: number; byType: Partial<Record<TaskType, [n: number, sum: number]>> }
interface Attempt { id: string; qid: string; type: TaskType; ts: number; score: number | null; mode: "practice" | "session" | "exam";
  sub?: { content?: number | null; fluency?: number | null; pronunciation: null }; metrics?: Record<string, number>; tags?: string[]; wpm?: number }
interface AppState { version: 1; attempts: Attempt[] /*log truncável, só auditoria/diagnóstico*/; questions: Record<string, QuestionSnapshot>;
  daily: Record<string, DailyAggregate> /*chave "YYYY-MM-DD" local*/; dailyCutoff: string; bookmarks: string[];
  notes: Record<string, { text: string; updatedAt: number }>; sessions: SessionRecord[]; draft: SessionDraft | null; settings: Settings }
```
Constantes: `MAX_ATTEMPT_LOG = 2000` · `MAX_SESSIONS = 100` · `DAILY_RETENTION_DAYS = 180` · `NOTE_MAX = 2000` · `PRACTICAL_QUOTA_BYTES = 4 MB` · `QUOTA_WARN = 0.8` · `BACKUP_REMINDER_DAYS = 14`.
`Settings` (normalizado campo a campo; inválido → default): `accent` "en-AU"|"en-US"|"en-GB" (padrão en-AU; sotaque do TTS e do reconhecimento) · `modelRate` 0,7–1,2 (1,0) ·
`dailyGoal` 0–200 (20) · `examDate` ISO|null · `targetScore` 10–90 (65) · `onlyVerified` (false) · `allowReplay` (false) · `lastBackupAt` · `micNoticeSeen` ·
`plus: { wordTranslation, phraseTranslation, plusAudio }` (todos false). O mic notice e o "persist" pedem consentimento no primeiro uso relevante, não no load.

### 7.2 Regras de escrita
- `recordAttempt()` atualiza **primeiro** o snapshot (via `srs.applyAttemptToSnapshot`, §8) e o agregado diário; depois anexa ao log e **só então** trunca o log. SRS/estatísticas NUNCA derivam do log.
- Agregados por dia local; `daily` é podado além de `DAILY_RETENTION_DAYS` (`dailyCutoff` registra a data mais antiga retida). A "sequência" é exibida como "até N dias" (N = constante).
- **Escrita coalescida:** várias mutações no mesmo tick = 1 `setItem` (microtask) + flush em `visibilitychange`/`pagehide`.
- **Datas (`dates.ts`):** `dayKey(ts)`, `addDays(key, n)` via `new Date(y, m, d)` (nunca somar 24 h fixas), `daysBetween`, `startOfLocalDay`. `computeStreak` e `dailyAverages` iteram chaves de dia local
  (correto em mudança de horário de verão). Sem tentativas hoje, a sequência continua viva a partir de ontem.
- **Sessão:** `draft` salvo a cada resposta; `endSession` arquiva `SessionRecord` (kind: `mixed|due|plan|errors|exam`) só se houve ≥ 1 resultado; histórico teto `MAX_SESSIONS`.
- **Notas:** `upsertNote(qid, text)` faz trim, limita a `NOTE_MAX`, apaga se vazio. Favoritos em `bookmarks` (conjunto por qid canônico).

### 7.3 Resiliência
- **Quarentena (D8):** `load()` com JSON ilegível ou campo estrutural inválido copia o payload bruto para `pte-hub-quarantine-<ts>`, avisa na UI e começa limpo; **nunca sobrescreve o original**.
- **Versão futura (v > atual):** modo somente-leitura com aviso; nenhuma mutação grava; payload preservado byte a byte.
- **Aviso preventivo de quota:** `estimateStateBytes` antes de gravar; ≥ `QUOTA_WARN × PRACTICAL_QUOTA_BYTES` → banner "armazenamento quase cheio — baixe um backup". `usePersistFailed` cobre falha real de escrita.
- **`navigator.storage.persist()`** solicitado após a primeira tentativa gravada; estado exibido em Ajustes. Lembrete de backup em /progress quando `lastBackupAt` > `BACKUP_REMINDER_DAYS`
  (navegadores podem limpar dados de sites pouco usados, p.ex. Safari/iOS — conhecimento de plataforma a confirmar).
- Hidratação (C2): `useAppState` usa `useSyncExternalStore` com snapshot de servidor = estado vazio idêntico ao 1º render do cliente; hidrata em efeito.

### 7.4 Backup, importação e reset
Envelope `{ app: "pte-master-hub", version, exportedAt, state }`; `exportBackup` atualiza `lastBackupAt`. `parseBackup(text)` valida sem aplicar e devolve **prévia** (tentativas, período, favoritos, sessões,
comparação com o estado atual). Fluxo em /settings: **1)** escolher arquivo → **2)** prévia → **3)** escolher **Substituir** ou **Mesclar** → **4)** cópia de segurança automática em `pte-hub-undo` →
**5)** aplicar → botão **Desfazer** (até a próxima importação/reset). Mescla: snapshots por qid (soma de `attempts`, máximos de `bestScore/strongAttempts/lastAttemptAt`, `box/dueAt/lastScore` do snapshot
mais recente), favoritos em união, notas pelo `updatedAt` mais novo, sessões e log em união por id (com tetos), `daily` pelo registro de maior `n` por dia (aproximação documentada), settings atuais mantidas
(em "Substituir" valem as do arquivo). Ids passam por `resolveQid`. **Zerar progresso** preserva Ajustes e também cria a cópia de desfazer.
Migração: `MIGRATIONS` por versão (vazio na v1) + testes de round-trip `export → import → igual campo a campo`.

---

## 8. SRS (`src/lib/pte/srs.ts`)
- Caixas 0–5, `SRS_INTERVAL_DAYS = [0, 1, 3, 7, 14, 30]`. Só tentativas com `score` numérico alteram o SRS (sem score: só `attempts++`).
- **Vencida** = `attempts > 0 && dueAt ≤ now`. A 1ª tentativa de uma questão conta como "vencida" para fins de promoção.
- `applyAttemptToSnapshot(snap, attempt, passScore)`:
  1. `score ≥ passScore` **e** vencida → `box = min(box + 1, 5)`, `dueAt = ts + INTERVAL[box] dias`, `strongAttempts++`.
  2. `score ≥ passScore` e **antecipada** → registra score/attempts; **não promove**; `dueAt` inalterado.
  3. `score < passScore` (lapso, vencida ou não) → `box = max(box − 1, 0)`, `dueAt = ts + INTERVAL[box] dias`.
  Efeito exigido (probe): 5 acertos em 5 minutos numa questão nova → caixa 1, não 5.
- **`PASS_SCORE_BY_TYPE`** (constante única): ditado (wfd, lst_fib) 85 · read_aloud, repeat_sentence 80 · retenção de conteúdo (sst, retell_lecture, sgd, rts, describe_image, swt, write_essay) 70 ·
  seleção/ordenação (MCQs, FIBs, reorder, hcs, smw, hiw, answer_short) 75.
- **Dominada** = `box === 5 && lastScore ≥ passScore` (inalcançável por maratona: exige ≥ 5 promoções vencidas).
- Estados para filtros: nunca tentada · vencida hoje · em aprendizado (box ≤ 2, não vencida) · em revisão (box 3–4) · dominada · fraca (`lastScore < passScore`).
- `queue.ts` (`buildQueue`; sessão `kind: mixed` = modo `smart`): modos `smart` (vencidas pior-nota-primeiro → fracas → novas, intercalando tipos, proporção 2 : 1 revisão/novas), `due` (só vencidas), `counts` (contagens exatas por tipo, usado pelo
  plano; dentro do tipo: vencidas → fracas → novas → menos recentes), `errors` (últimas notas < passScore). Respeita filtros de seção/tipo, `onlyVerified` e o estoque real; nunca repete qid na fila.
  `countDue`, `countDueByType`, `countDueBySection` alimentam badges. Prática fora de sessão (/practice) alimenta o SRS pelo mesmo `recordAttempt`; o resultado mostra `DueNotice`
  ("Próxima revisão em N dias", "Revisar hoje" ou "Prática antecipada — não avança a caixa").

---

## 9. Correção e medição (puros em `src/lib/pte/*`, `src/lib/scoring.ts`)

### 9.1 Contrato
`GradeResult { score: number | null; sub?: { content?: number | null; fluency?: number | null; pronunciation: null; form?: number | null }; metrics: Record<string, number>; tags: string[]; feedback: Feedback[] }`.
`pronunciation` é **sempre `null`** (a Web Speech API não expõe pronúncia; nada de proxy disfarçado). O painel exibe "Pronúncia: não avaliada".

### 9.2 Famílias determinísticas
| Tipo(s) | Regra |
|---|---|
| wfd | normaliza (caixa/pontuação/apóstrofo), alinhamento por LCS de palavras; **+1 por palavra correta**; score = acertos/total; mapa de acertos/omissões/extras; tags `missed:<palavra>` (≤ 5) |
| lst_fib · read_fib_dropdown · read_fib_drag | acertos por lacuna / total; digitação tolerante a caixa e espaços; Tab navega lacunas; tags `missed:` por lacuna |
| lst_hiw | clique marca suspeita; `max(0, certos − falsos) / nº de erradas`; falsos listados |
| read_mcq_single · lst_mcq_single · lst_hcs · lst_smw | binário 0/100; tag `trap:<índice>` com a armadilha explicada quando houver |
| read_mcq_multi · lst_mcq_multi | `+1` por certa, `−1` por errada, mínimo 0, normalizado ao máximo possível |
| reorder_paragraphs | pares adjacentes corretos / (n − 1) |
| answer_short | resposta reconhecida ∈ `answers` (normalizada, sinônimos) → 100, senão 0; feedback de hesitação |

### 9.3 Fala (`speaking.ts`, `scoring.ts`)
- Reconhecimento: `useSpeechRecognition` (sotaque dos Ajustes; en-AU padrão), resultados interinos ao vivo, tratamento de erro/permissão, parada limpa ao trocar de questão. MediaRecorder em paralelo para **replay da própria voz**.
- Alinhamento (read_aloud, repeat_sentence): LCS com estados `hit | missed | substituted | moved`. Créditos: hit 1,0 · substituição próxima (razão de Levenshtein ≥ 0,75) 0,5 · `moved` 0,5.
  **`score = round(max(0, crédito − EXTRA_PENALTY·extras − REPEAT_PENALTY·repetições) / total · 100)`** com `EXTRA_PENALTY = 0,25` e `REPEAT_PENALTY = 0,1` (constantes nomeadas).
- **Fluência (proxy rotulado):** `fluencyProxy({ wpm, longPauses, repetitions })` = `max(0, 100 − 15·longPauses − 10·repetições − penalidade de ritmo fora de 120–160 wpm)`; exibido como "proxy de fluência".
- Painel de fala SEMPRE mostra: Conteúdo · Fluência (proxy) · "Pronúncia: não avaliada" + aviso fixo "o reconhecedor do navegador pode corrigir palavras para as mais prováveis — a nota tende a ficar otimista".
- Aviso de microfone na 1ª vez (`micNoticeSeen`): o áudio é processado pelo navegador (no Chrome costuma ir a um serviço do próprio navegador); o app não envia nada.
- retell_lecture, sgd, rts, describe_image: **cobertura de conteúdo** (`coverage.ts`): `keywords`/`facts` do banco com `stemLite` (minúsculas, plural/-ed/-ing simples); `content = round(100 · cobertos/total)`, mais fluência proxy; DI usa `facts` (derivados dos dados do próprio gráfico) + `keywords`.
  RL/SGD/RTS/DI sem `keywords` suficientes (< 4) exibem "referência insuficiente — sem nota" em vez de inventar.

### 9.4 Escrita (`summary.ts`, `essay.ts`, `templateDetector.ts`)
- **swt:** validador de frase única (exatamente 1 ponto final terminal), zona 5–75 palavras; `content` = cobertura de `keywords`; forma inválida limita o score a 40 e gera tag `forma`.
- **sst:** cronômetro 10:00, contador em tempo real (zona 50–70); `score = content × fator de forma` (1,0 na zona · 0,8 a ±10 palavras · 0,5 além); análise de vocabulário vs. transcrição.
- **write_essay:** 20:00, zona 200–300; estrutura (≥ 3 parágrafos), cobertura de `keywords` do prompt, ajuste de tamanho: `round(100·(0,5·cobertura + 0,3·estrutura + 0,2·ajuste))`, rotulado "estimativa de forma/conteúdo".
- **Não avaliados (e a UI diz):** gramática, ortografia, coerência, vocabulário avançado, pronúncia.
- **Detector de template (local, sem IA):** `{ likelyTemplate, reasons[] }` por (a) taxa de 4-gramas repetidos na resposta > 0,15, (b) ≥ 3 frases com o mesmo início de 2 palavras,
  (c) sobreposição com lista curta e pública de frases-modelo genéricas (`TEMPLATE_PHRASES`, ≥ 2 acertos). Ativo só com ≥ 40 palavras; **≥ 2 sinais** → aviso "pode ser tratado como resposta-template e ir
  para revisão humana"; **nunca altera o score**. Aplica-se a swt, sst, write_essay e às transcrições de fala de RL/SGD/RTS.

### 9.5 Estimativa 10–90 e prontidão (`estimate.ts`, `readiness.ts`, `skillMatrix.ts`)
- `estimateSkill(pct) = clamp(round(10 + 0,8·pct), 10, 90)` (monotônica; rótulo "estimativa de treino").
- Cada tentativa pontua **todas** as habilidades do seu tipo (matriz), com a mesma nota (limitação declarada). Janela por habilidade: últimas 60 tentativas com score dos últimos 45 dias, peso exponencial por
  recência (meia-vida 14 dias) × `PROVENANCE_WEIGHT`. `confidence`: n < 10 **baixa** · 10–29 **média** · ≥ 30 **alta**. `trend` = média das 10 mais recentes − média das 10 anteriores (null se n < 20).
- **Prontidão** = estimativa da habilidade vs. alvo, na mesma escala: gap ≥ 0 "No alvo" · −5 a 0 "Quase lá" · −15 a −5 "Em progresso" · < −15 "Distante"; confiança baixa → "Dados insuficientes" explícito.
  **Cobertura do banco não entra no índice**; "variedade" (tipos distintos tentados nos últimos 30 dias / tipos da habilidade) é indicador textual secundário.
- `goal.ts`: `daysUntil(examDate, now)` (dias de calendário local; hoje = 0; passado = null), `countdownLabel`, `targetVerdict(estimate, target)` — sempre na escala 10–90.

### 9.6 Plano do dia (`studyPlan.ts`)
`buildDailyPlan(app, now)` distribui `dailyGoal` (mín. 4; < 4 → plano vazio com mensagem; 0 → desligado): **1)** vencidas primeiro (teto 60% da meta), rateadas por prioridade; **2)** novas/fracas pelo restante.
`prioridade(tipo) = média sobre suas habilidades de SKILL_WEIGHTS[h] × (1 + max(0, alvo − estimativa[h]) / 80)` (sem dados → fator 1,5); alocação por maiores restos, teto de 40% da meta por tipo e do estoque disponível.
`planSummary` produz "Hoje: N questões — Speaking X · …". "Iniciar plano" abre `counts` na fila (§8) e sessão `plan`. Meta e alvo só mudam o texto de incentivo.

### 9.7 Diagnóstico e relatório (`diagnostics.ts`, `report.ts`)
Tags: `missed:<palavra>` · `trap:<i>` · `conteudo` (alinhamento < 70) · `fluencia` (wpm fora de 120–160 ou ≥ 2 pausas longas) · `forma` · `template` · `exame`. Funções: `errorBreakdown(app, dias)`,
`topMissedWords(app, n)`, `errorTrend(app)` (média diária das tentativas abaixo do `passScore`), `worstTopics(app, n)`. Baseados no log (últimas `MAX_ATTEMPT_LOG` tentativas — a UI diz isso).
`weeklyReport(app, now)` → `{ period, daysToExam, target, streak, attemptsCount, overallAvg, delta7d, skills: [{ skill, estimate, confidence, trend }], topErrors, dueCount }`;
`renderReportMarkdown` (pt-BR, tabelas) e `renderReportJson` (ISO estável) gerados sob demanda, **fora do backup**; estado vazio claro quando não há tentativas no período.

---

## 10. Motores de prática e shell (`src/components/practice/*`)

### 10.1 Shell comum (`PracticeShell`) — todo tipo herda
Cabeçalho com tipo, selo de proveniência, chip de SRS (`DueNotice`), barra de progresso da sessão ("3/10"), cronômetros por tipo (§4.2), favorito ★, **painel de nota** (tecla `N`, debounce 400 ms, indicador "salva"),
navegação anterior/próxima, `TtsVoiceNote` (nome da voz do sistema realmente usada, lido após a reprodução), aviso de microfone (§9.3), `ScorePanel` (nota + subscores + feedback + `DueNotice`), barras de ação em `<footer>` sem cobrir o texto, título da questão em `<h1>`.
**Atalhos** (ignorados com foco em input/textarea/contenteditable e com modificadores): `←`/`→` (ou `J`/`K`) navegam · `B` favorita · `N` abre/fecha nota · `?` overlay de atalhos · `Esc` fecha overlays · `Enter` inicia/confirma · `Espaço` marca opção em MCQ.
Áudio nativo: **toca 1×** (como na prova); repetir só com `allowReplay` ligado ou após o resultado. Exame: sempre 1×, sem exceção. Fala: `useSpeechSynthesis.speak(text, rate, opts)` com voz escolhida por prefixo de idioma/sotaque (`pickVoice`) e `voiceUsed` exposto.

### 10.2 Motores (mapeamento tipo → comportamento)
| Motor | Tipos | Comportamento essencial |
|---|---|---|
| **A Voz** | read_aloud · repeat_sentence · describe_image · retell_lecture · answer_short · sgd · rts | prep (cronômetro) → gravação com medidor de nível (AnalyserNode) e transcrição interina → resultado (§9.3). read_aloud tem layout próprio (texto grande, modo manual opcional de marcação). sgd: TTS com vozes/pitch distintos por falante. describe_image: imagem com `alt`, crédito e licença visíveis. |
| **B Escrita** | wfd · swt · sst · write_essay | campo de texto com contador em tempo real e zona-alvo; wfd com TTS 1× + correção por palavra; sst/essay com cronômetro regressivo e auto-submit ao zerar |
| **C Áudio interativo** | lst_fib · lst_hiw · lst_smw · lst_hcs · lst_mcq_single · lst_mcq_multi | player de reprodução única com barra de progresso; FIB com inputs inline e Tab; HIW com texto clicável; SMW com bipe final; opções com justificativa e análise de distratores no resultado |
| **D Leitura** | read_mcq_single · read_mcq_multi · read_fib_dropdown · read_fib_drag · reorder_paragraphs | passagem com tipografia ajustável e modo foco; rádio/checkbox; dropdown inline; drag-and-drop **com alternativa por toque** (tocar palavra → tocar lacuna); reorder com arrastar **e** botões subir/descer; painel com evidência textual e armadilhas |
Tipos com banco vazio renderizam `SoonPractice` (motivo visível) em vez de quebrar. O dispatcher de `/practice` escolhe o motor por `TYPE_META`.

---

## 11. Hub, rotas, sessões e UX

### 11.1 Rotas
`/` Home · `/speaking|writing|reading|listening` (SectionPage) · `/practice?q=<qid>` (única forma de abrir uma questão; sem `q` abre a próxima da fila) · `/session` · `/exam` · `/progress` · `/settings`.
`head()` de cada rota (título/descrição/OG) deriva números do manifesto (§15). TopNav: Início · Falar · Escrever · Ler · Ouvir · Sessão · Simulado · Progresso · Ajustes.

### 11.2 Telas
- **Home:** hero com countdown ("Faltam N dias — alvo X"; "A prova é hoje!"), anel da meta diária e sequência; card **Plano de hoje** + "Iniciar plano"; 4 cards de seção (progresso por tipo, "N vencidas hoje", estimativa da habilidade homônima com rótulo);
  link "Fila do dia (N)"; aviso dinâmico dos tipos "em breve" (derivado de `TYPE_META`).
- **SectionPage:** cards por tipo (contagem, tentadas, selos "banco pequeno"/"em breve") e lista com filtros — seção, tipo, status (nunca tentada · vencida · fraca · dominada), selo de fonte, tamanho/palavras, nota, tentativas — busca, paginação de 50 com "Mostrar mais".
- **/session:** configuração (tamanho, tipos/contagens, modo `smart|due|plan|errors`), entradas "Fila do dia (N)" e "Plano de hoje (N)" (desabilitadas com N = 0 / N < 4), banner **Retomar/Descartar** quando há `draft`, resumo final (média por tipo), histórico das últimas 10 sessões.
- **/progress:** (1) estimativa por habilidade com rótulo, confiança e tendência + prontidão vs. alvo; (2) 7 dias × 7 anteriores; (3) gráfico de 14 dias e evolução semanal por tipo (6 semanas) em SVG; (4) padrões de erro (§9.7) com chips que abrem a questão mais recente;
  (5) relatório semanal (preview, copiar com fallback, baixar `.md`/`.json`); (6) tabela dos 22 tipos com nota média; (7) lembrete de backup e aviso de quota.
- **/settings:** Prática (sotaque, velocidade, meta diária, repetir áudio) · Prova (data + alvo 50/58/65/79 + "outro 10–90") · Banco (só fontes verificadas, legenda dos selos) · Dados (exportar, importar com prévia/mesclar/desfazer, zerar) ·
  Offline (§14) · **Studie Plus** (§13) · Privacidade/voz (texto honesto, §15).

### 11.3 Mobile-first e acessibilidade (valem para toda tela)
Layout base 390×844; passagem `text-lg` no mobile; alvos ≥ 44 px (`button.tsx` e chips); safe-area; barras de ação não cobrem conteúdo; zero overflow horizontal; sem hover; `prefers-reduced-motion` respeitado.
Contraste ≥ 4,5:1 por tokens de tema (claro e escuro); landmarks (`header/nav/main/footer`), um `<h1>` por tela, hierarquia de títulos; `aria-pressed` no ★, `aria-live` no cronômetro/contadores (polite), foco visível, ordem de tab lógica, `Esc` fecha diálogos.

### 11.4 Direção visual
Tom acadêmico, calmo e legível (aluno estuda por horas): uma família tipográfica de leitura confortável (corpo ≥ 16 px; passagens maiores), uma cor de acento coerente com estados de sucesso/atenção/erro **que não dependem só de cor** (ícone + texto), cartões de seção consistentes,
densidade média, modo claro e escuro por tokens, movimento mínimo e respeitando `prefers-reduced-motion`. Nada de aparência de template genérico: hierarquia clara entre ação principal (praticar/iniciar plano) e secundárias. Decidir paleta/tipografia na Fase 0 e registrar na §20.
Estados obrigatórios em toda superfície: carregando, vazio, erro, "em breve" com motivo, sem voz inglesa instalada (botões de áudio ocultos + aviso com orientação; práticas de listening mostram "este navegador não tem voz em inglês — instale uma voz do sistema" **sem** revelar a transcrição antes da resposta).

---

## 12. Simulado (`exam.ts`, `ExamRunner`, `/exam`)
- **Modos:** `full` (blueprint oficial, ~2 h, 3 partes em ordem fixa) · `part:<speaking-writing|reading|listening>` (só aquela parte) · `mini` (≈ 1–2 questões por tipo, ≤ 30 min). Rótulos obrigatórios na escolha:
  "Simulado completo" só para o blueprint; os demais se chamam "Parte …" ou "Mini-simulado". A tela mostra tempo estimado e `blueprintOmissions` (tipos fora por falta de banco).
- **Fila:** `buildExamQueue` amostra estratificada do manifesto respeitando estoque, `onlyVerified` e `count` do blueprint; sem repetição.
- **Execução:** uma questão por vez; cronômetro regressivo por questão (`examTiming`); **auto-submit ao zerar**; sem voltar/refazer; áudio 1×; gravação para sozinha; motores recebem `mode="exam"` (força submit, bloqueia retry, esconde dicas).
  Informativo de tempo da parte. Tentativas entram como `mode: "exam"` com tag `exame` e alimentam o SRS; a sessão é arquivada com `kind: "exam"`.
- **Resumo:** estimativa por habilidade (§9.5) e média por tipo, comparadas ao alvo, à prática livre e aos simulados anteriores; "pontos fracos" (tipos/tags) e botão para montar sessão de reforço.

---

## 13. Pack "studie-plus" (extra de estudo — não faz parte da replicação do PTE)

### 13.1 Regras (invioláveis)
1. **Três recursos independentes** (`plus.wordTranslation`, `plus.phraseTranslation`, `plus.plusAudio`), todos `false` por padrão: as 8 combinações são válidas e testadas.
2. **Tradução = significado = texto escrito em pt-BR.** Nenhum controle de áudio dentro de card/balão de tradução; **nenhuma fala em pt-BR em lugar algum** (sem `langOverride` pt, sem detecção de voz pt).
3. **Áudio = pronúncia do inglês original** (sotaque `settings.accent`, velocidade `modelRate`), funciona **com ou sem** tradução ativa; pode ficar ao lado da frase em inglês e no balão da palavra (fala a palavra em inglês, nunca a tradução).
4. Nunca duplica áudio nativo do mesmo campo/granularidade (frase/transcrição completa); áudio por palavra é sempre permitido onde há balão.
5. **Sem vazamento de gabarito:** `plusFieldPolicy(type, field, fase: "pre" | "post")` só habilita recursos para texto visível ao aluno naquela fase e que não seja a chave da resposta antes do envio
   (ex.: o `sentence` do wfd, o `transcript` de repeat_sentence/retell_lecture/sst/lst_* e as `answers` de answer_short só no resultado; passagens, prompts e enunciados já na prática).
6. Dados do pack ficam em `src/data/plus/`, carregados por `import()` dinâmico só se algum recurso estiver ativo; pack desligado = zero mudança visível e zero custo no bundle base.
7. Interação **só por tap/click**: balão da palavra portalado em `document.body`, posicionado dentro do viewport, fecha por toque fora/✕/`Esc`; card de frase expande só por toque; nada abre em hover, foco ou rolagem.
8. /settings tem seção "Studie Plus (extra de estudo)" com os 3 interruptores, texto de descorrelação ("não faz parte do PTE; não entra na nota nem no histórico") e a divisão clara tradução × áudio.

### 13.2 Contratos de dados
- `glossary.json`: `{ [palavra_minúscula]: { literal: string; contextual?: string } }` — `literal` 1–3 palavras pt-BR minúsculas, ≤ 60 chars, sem pontuação final; `contextual` ≤ 80 chars, ≠ `literal`, só quando acrescenta (colocação, falso amigo, uso acadêmico).
  Lookup exato (`lookupWord`: minúsculas, sem pontuação externa, apóstrofo tipográfico → `'`); **sem lematização inventada**; miss → "Tradução não disponível" (estado vazio honesto, nunca tradução errada).
- `phrases/<tipo>.json`: `{ [qid]: { [campo]: { h: string; l: string; c: string }[] } }` — índice = posição da frase em `splitSentences(question[campo])`; `h` = hash curto (8 hex) da frase normalizada de origem (detecta tradução obsoleta);
  `l` literal ≤ 400 chars, `c` sentido geral ≤ 200 chars.
- Módulos puros `src/lib/plus/`: `settings` (`normalizePlusSettings`, `plusEnabled`, `PLUS_TOGGLES` com textos: tradução = significado, áudio = pronúncia do inglês) · `words` (`splitWords`) · `glossary` · `sentences` (`splitSentences`, `sentenceCount`) · `phrases` (`lookupPhrase`) · `plusAudio` (`plusAudioFor`, matriz campo × tipo × fase).
- Componentes: `PlusWordText` (palavras tocáveis quando `wordTranslation || plusAudio`; balão mostra tradução só com `wordTranslation`, 🔊 só com `plusAudio`), `PlusPhraseCard` (modos: só áudio · tradução + áudio · só tradução · nenhum; 🔊 na linha da frase em inglês, fora da expansão), `PlusSpeakButton`
  (compacto 44×44; oculto sem voz inglesa; cancela ao trocar questão/desmontar). O modo manual de marcação do read_aloud tem prioridade sobre o toque de tradução.

### 13.3 Geração dos dados (dev-time, sem API paga de IA; subagentes read-only em lotes)
1. **Glossário:** `scripts/plus/extract-words.mjs` varre os campos de texto do banco final, tokeniza (`^[a-z]+(-[a-z]+)*$`, 2–30 letras), conta frequências e seleciona candidatas por frequência até cobrir **≥ 97% das ocorrências** (teto 8.000);
   fatia em lotes de 200 → `.opencode/work/plus/words/in-NNN.json`.
2. **Frases:** `extract-sentences.mjs` segmenta cada campo elegível (`plusFieldPolicy`) e emite `{ k: "<tipo>|<qid>|<campo>|<i>", s }` em lotes de ~80 → `in-NNN.json`.
3. Subagentes (até 4 em paralelo, um por lote) recebem um brief **autônomo** (papel: tradutor EN → pt-BR para PTE Academic; regras de saída; entrada literal; "não edite arquivos; devolva só o JSON") e devolvem JSON estrito; o agente principal grava `out-NNN.json` e **verifica no disco**.
4. `merge-glossary.mjs` / `merge-phrases.mjs`: determinísticos e resumíveis; validam invariantes (chaves ⊂ lote; minúsculas; `literal` 1–3 palavras sem pontuação final; `contextual` ≤ 80 e ≠ `literal`; tradução ≠ a própria palavra inglesa; todo `k` presente exatamente 1×; `h` bate); nunca sobrescrevem entrada válida;
   ordenam chaves; lote inválido é refeito. Omitir é permitido para nomes próprios/siglas sem tradução segura (**omitir, nunca inventar**).
5. **Cobertura:** glossário ≥ 95% das candidatas; frases por prioridade — P1 passagens/prompts/enunciados de Reading e Writing: 100% · P2 read_aloud e transcrições exibidas no resultado: ≥ 95% · P3 modelos/explicações: melhor esforço; resíduo registrado e coberto por estado vazio.
6. Alterar o texto de uma questão depois disso invalida `h`: `plus-integrity.test.ts` falha e lista os lotes a refazer.

### 13.4 Testes
`plus-settings` (normalização, 8 combinações) · `plus-words`/`plus-sentences`/`plus-phrases` · `plus-audio` (matriz; nunca duplica nativo; nunca vaza gabarito) · `plus-glossary` (invariantes + amostras reais + miss → null + falha se `{}`) · `plus-integrity` (alinhamento + `h`) ·
`plus-integration.test.tsx` (balão portalado; só áudio · só tradução · ambos · nenhum; fala observada via stub de `speechSynthesis` com `lang` nunca pt; varredura de fonte sem `pt-BR`/"ouvir tradução").

---

## 14. Offline / PWA (`public/sw.js`, `offline.ts`)
- SW registrado **só em produção** (dev sem SW). Pré-cache do shell (todas as rotas, `manifest.webmanifest`, ícones); `/assets/*` cache-first; navegação network-first com fallback para `/`.
- **"Baixar para offline"** (Ajustes e páginas de seção; por seção e por tipo, com progresso baixados/total): importa dinamicamente os chunks de dados (e imagens do describe_image, e dados do pack se ativo) para que entrem no cache — decisão: downloader dirigido pelo cliente, porque o build SSR pode não expor a lista de assets de forma estável;
  se o scaffold expuser, o build também injeta a lista (`__PRECACHE__`).
- **Cache versionado** por build (`VERSION` em `sw.js`); limpeza no `activate` migrando `/assets/`; nova versão → aviso "Nova versão disponível — Recarregar" via `SKIP_WAITING` (nunca troca silenciosa).
- `build-manifest.mjs` gera também a `description` do `manifest.webmanifest` a partir do banco (TYPE_COUNT e totais reais).
- Verificação: Playwright em build de produção — SW ativo → baixar um tipo nunca visitado → `context.set_offline(true)` → Home, uma seção e `/practice` desse tipo renderizam do cache, console limpo; teste de nova versão.

---

## 15. Governança de números, SEO e copy honesta
- `manifest.ts` é a fonte única: `TOTAL_ALL_QUESTIONS`, `TYPE_COUNT`, `sectionCounts`, `countByType`, `readyCount`, rótulos pt-BR via `toLocaleString("pt-BR")`. Hero, rodapés, metas (`head()`), `webmanifest` e textos de Ajustes consomem essas constantes; "tipos em breve" é lista derivada de `TYPE_META`.
- `src/test/metrics-sync.test.ts`: (a) `TOTAL_ALL_QUESTIONS === allMeta.length`; (b) soma de `sectionCounts` = total; (c) varre `src/routes` e `src/components` e falha em qualquer literal de contagem junto de "questões|task types|tipos|questions" (regex com exceções explícitas) e em "mais de N";
  (d) falha em "%" no mesmo trecho de "alvo"/"estimativa" (§1.3); (e) falha em "nenhum servidor" perto de reconhecimento de voz.
- **Copy honesta (obrigatória):** voz → "Tudo é salvo neste navegador, sem conta. O reconhecimento de voz pode usar um serviço do próprio navegador (ex.: Chrome)."; estimativa → "estimativa de treino, não é previsão da nota oficial"; pronúncia → "não avaliada"; TTS → mostrar a voz usada.

---

## 16. Escopo por fase (o roadmap espelha estas fases; cada fase fecha com os gates da §17)

### Fase 0 — Fundação e verdade oficial (P0)
**Objetivo:** ambiente verde, contratos de dados e fatos oficiais gravados antes de qualquer feature.
- Scaffold verificado/adotado com os 5 gates rodando num app mínimo; tokens de tema claro/escuro com contraste AA; `button.tsx` com alvo ≥ 44 px; `TopNav` esqueleto mobile-first; pastas e `.opencode/work/`.
- `src/lib/pte/types.ts` (§5), `skillMatrix.ts` (matriz de 22 linhas, tempos, `SKILL_WEIGHTS`, `EXAM_BLUEPRINT` com intervalos oficiais, comentário com URLs + data da consulta), `bankTargets.ts`.
- Registro da verdade oficial no roadmap: o que foi confirmado, o que ficou "aproximado", divergências entre fontes.
**Aceite:** (1) matriz, tempos, intervalos do blueprint, escala e lista de tipos com revisão humana confirmados na fonte oficial (URL + data); (2) `SKILL_WEIGHTS` = soma da matriz (teste); (3) `TaskType` ≡ 22 linhas da matriz (teste de exaustividade);
(4) 5 gates verdes no app mínimo; (5) contraste dos tokens ≥ 4,5:1 medido.

### Fase 1 — Persistência, datas e SRS (P0)
**Objetivo:** o progresso do aluno nunca é perdido, truncado ou sobrescrito; o SRS representa memória, não volume.
- `dates.ts`, `storage.ts` (§7.1–7.4), `useAppState.ts` (C2), `srs.ts` (§8), constantes únicas, `estimateStateBytes`, `parseBackup/applyBackup/undo`, quarentena, versão futura somente-leitura.
**Aceite (probes viram testes verdes):** (1) 5.100 tentativas com caixa 3 numa questão → após mais uma gravação o snapshot permanece e o log ≤ 2.000; (2) payload corrompido → quarentena com o bruto + estado limpo; `version` futura → leitura apenas, preservada byte a byte após mutar settings;
(3) round-trip export → import igual campo a campo; mesclar backup antigo sobre estado novo não perde nada; desfazer restaura; (4) N mutações no mesmo tick = 1 `setItem`; (5) streak/médias corretas com mudança de offset (horário de verão);
(6) SRS: 5 acertos em 5 min → caixa 1; lapso rebaixa 1; atrasada e vencida promove; antecipada não promove; `PASS_SCORE_BY_TYPE` (1 caso por faixa); dominada; (7) snapshot de servidor = 1º render do cliente; (8) aviso de quota ≥ 80%.

### Fase 2 — Banco de questões (P0; pode rodar em paralelo à Fase 1 após a Fase 0)
**Objetivo:** encontrar, verificar e integrar questões reais para os 22 tipos, no pipeline da §6.
- `scripts/bank/*` (fetch, extract por fonte, normalize, validate, dedupe, integrate, report), `build-manifest.mjs`, `provenance.ts`, `.opencode/work/bank/sources.json` (todas as fontes avaliadas — aprovadas e reprovadas — com URL, tipos, volume, evidência, nível, data).
- `src/data/pte/<tipo>.json` ×22 (ou tipo "em breve" com motivo), `aliases.json`, `manifest.json`, imagens de `describe_image` em `public/di/` com `alt`/licença/atribuição, `bank-integrity.test.ts`, `report.json` (encontrados · inválidos · duplicatas · integrados por tipo e fonte).
**Aceite:** (1) `sources.json` completo e coerente com a §6.1 (amostra manual registrada por fonte); (2) por tipo: contagem × meta mínima/ideal registrada; faltou → "banco pequeno" ou "em breve" com motivo, nunca preenchido com conteúdo duvidoso;
(3) zero quase-duplicatas (≥ 0,85) por tipo e entre fontes; (4) integridade (§6.9) verde; (5) nenhum item gerado por IA; (6) chunks medidos (meta ≤ 250 KB brutos), nenhum banco no bundle base; (7) `TYPE_META` cobre exatamente os 22 slugs.

### Fase 3 — Catálogo, hub e shell de prática (P0)
**Objetivo:** navegar, filtrar, abrir qualquer questão e gerir os dados do aluno, com o shell que todo motor herda.
- `manifest.ts`, `catalog.ts` (loaders + derivados da §5.1), rotas `/`, seções, `/practice` (dispatcher + `SoonPractice`), `/settings` (Prática, Prova básica, Banco, Dados com prévia/mesclar/desfazer/zerar, quota, persist, lembrete de backup), `SectionPage` (filtros + paginação + selos), `PracticeShell` (§10.1), `useSpeechSynthesis` (`pickVoice`, `voiceUsed`, `allowReplay`), `TtsVoiceNote`.
**Aceite:** (1) 22 tipos listados com contagens derivadas; (2) filtros por seção/tipo/status/selo/tamanho/nota/tentativas e paginação 50 → "Mostrar mais" (Playwright); (3) importar backup: prévia → mesclar/substituir → desfazer funciona em /settings;
(4) atalhos `← → J K B N ? Esc` com guard de input; nota persiste após reload; (5) console sem erro de hidratação; (6) 390×844 sem overflow; (7) `head()` das rotas derivado do manifesto; (8) tipo vazio abre `SoonPractice` com motivo.

### Fase 4 — Motores B, C e D: texto, seleção, lacunas (P0)
**Objetivo:** os 15 tipos não falados praticáveis de ponta a ponta, com correção pura testada antes da UI.
- Puros: `dictation`, `fib`, `hiw`, `mcq`, `reorder`, `summary`, `essay`, `coverage`, `templateDetector` + testes. UI: `Wfd`, `Swt`, `Sst`, `WriteEssay`, `LstFib`, `LstHiw`, `LstSmw`, `LstHcs`, `LstMcq` (single/multi), `ReadMcq` (single/multi), `ReadFibDropdown`, `ReadFibDrag`, `Reorder`, `ScorePanel`, contadores com zona-alvo.
**Aceite:** (1) casos anotados por regra da §9.2/§9.4 com bordas (vazio, pontuação, apóstrofo, caixa, duplicatas de palavra); (2) validador de frase única do swt e zonas do sst/essay; (3) detector de template: positiva real, negativa real, falsos-positivos comuns, nunca altera nota;
(4) cada um dos 15 tipos abre → responde → corrige → grava tentativa com tags (Playwright por motor, desktop + 390×844); (5) cronômetros auto-submetem (`page.clock`); (6) drag-and-drop e reorder operáveis por toque e teclado; (7) áudio 1× e voz usada exibida; (8) opções com explicação/trap no resultado.

### Fase 5 — Motor A: Voz (P0)
**Objetivo:** os 7 tipos de fala com reconhecimento, alinhamento e subscores honestos.
- `useSpeechRecognition`, MediaRecorder (replay), `MicLevelMeter`, `speaking.ts`, `scoring.ts` (§9.3), `fluencyProxy`, cobertura para RL/SGD/RTS/DI, componentes dos 7 tipos (`ReadAloudPractice` com layout próprio), aviso de microfone, painel de fala, TTS multi-voz do sgd, imagem + crédito do describe_image.
**Aceite:** (1) casos anotados: extras e repetições reduzem a nota de forma explicável, piso 0, constantes nomeadas; (2) painel mostra Conteúdo · Fluência (proxy) · "Pronúncia: não avaliada" + aviso do reconhecedor, legível em 390×844; (3) aviso de microfone só na 1ª vez;
(4) sem suporte/permissão negada → mensagem clara e treino sem nota (gravar e ouvir), nunca erro mudo; (5) referência insuficiente (< 4 keywords) → "sem nota"; (6) 7 tipos percorridos no Playwright com stub determinístico de `SpeechRecognition`; (7) parada/limpeza ao trocar de questão.

### Fase 6 — Inteligência: sessões, diagnóstico, estimativa, prontidão, plano, relatório (P1)
**Objetivo:** o aluno sabe o que revisar, quando e por quê, com medição honesta.
- `queue`, sessões retomáveis + histórico + `/session`, `diagnostics`, `estimate`, `readiness`, `goal`, `studyPlan`, `report`; Home completa (countdown, plano, chips, badges); `/progress` completo (§11.2); seção Prova de /settings.
**Aceite:** (1) testes puros por módulo cobrindo os casos da §8–§9 (filas por modo, plano com goal 0/< 4/estoque, estimate monotônica, confiança baixa com n < 10, pesos, diagnóstico); (2) iniciar sessão, responder 2, recarregar → retomar; concluir arquiva e limpa o draft;
(3) "Fila do dia" só com vencidas; "Iniciar plano" abre exatamente os counts; (4) nenhuma tela mistura escalas (teste de strings); (5) relatório: copiar (clipboard com fallback) e baixar `.md`/`.json` (Playwright); (6) /progress com dados sintéticos de ≥ 2 semanas e com estado vazio; (7) chips de erro abrem a questão certa.

### Fase 7 — Simulado fiel (P1)
**Objetivo:** ensaiar a prova com o blueprint oficial e medir por habilidade.
- `exam.ts`, `ExamRunner`, `mode="exam"` em todos os motores, `/exam`, resumo comparativo, histórico, rótulos, omissões dinâmicas (§12).
**Aceite:** (1) blueprint (contagens, ordem, tempos) conferido item a item com a fonte oficial — checklist no roadmap; (2) rótulos "Simulado completo" × "Parte" × "Mini-simulado"; (3) fila estratificada testada (estoque, sem repetição, `onlyVerified`); (4) auto-submit por cronômetro verificado em ≥ 1 tipo de cada motor;
(5) uma parte completa percorrida ponta a ponta no Playwright (resumo por habilidade/tipo, pontos fracos, histórico); (6) exame não permite voltar/refazer e áudio é 1×.

### Fase 8 — Pack studie-plus (P1)
**Objetivo:** tradução por palavra, tradução por frase e áudio de pronúncia do inglês, independentes e desligados por padrão.
- §13 completo: seção de /settings, módulos `src/lib/plus/*`, componentes, integração nos motores conforme `plusFieldPolicy`, pipelines e dados gerados por subagentes, testes. Áudio por último, depois das superfícies adaptadas ao mobile.
**Aceite:** (1) glossário ≥ 95% das candidatas; frases P1 = 100% e P2 ≥ 95%; invariantes e `h` válidos; (2) as 8 combinações de toggles testadas; (3) nenhuma fala em pt-BR (varredura + stub); (4) nenhum vazamento de gabarito antes do resultado (matriz × fase);
(5) Playwright 390×844: balão com tradução real portalado, fecha por toque fora/✕/`Esc`, não abre ao rolar; card expande só por toque; (6) pack desligado = regressão visual zero.

### Fase 9 — Offline real e governança de métricas (P1)
**Objetivo:** tipo nunca visitado funciona offline; nenhum número fixo reaparece.
- `sw.js`, `offline.ts`, UI "Baixar para offline", cache versionado + aviso de nova versão, descrição do `webmanifest` derivada, `metrics-sync.test.ts`, `head()` e textos de todas as rotas derivados (§14, §15).
**Aceite:** (1) Playwright em build de produção: baixar tipo nunca visitado → offline → Home, seção e `/practice` renderizam do cache, console limpo; (2) nova versão do SW gera aviso; (3) `metrics-sync` verde e com sanidade (inserir um literal de contagem numa rota faz o teste falhar; reverter);
(4) bundle medido e registrado; (5) copy honesta presente (voz, estimativa, pronúncia).

### Fase 10 — Acessibilidade, mobile e fechamento (P0, fim)
**Objetivo:** qualidade transversal comprovada e entrega.
- Auditoria axe nas rotas principais, navegação por teclado em todos os motores, auditoria 390×844 de todas as rotas e dos 22 motores com screenshots, correções, gates globais completos, relatório final, aviso ao monitor, checagem periódica.
**Aceite:** (1) axe sem violações graves (`/`, 4 seções, `/practice`, `/session`, `/exam`, `/progress`, `/settings`); (2) todos os motores operáveis só com teclado; (3) 22 motores em 390×844 sem overflow horizontal nem erro de console; (4) gates globais verdes e critérios globais do planejamento (1–7) verificados;
(5) relatório final (o que foi feito · evidências dos gates · limites conhecidos); (6) monitor avisado com "remix finalizado (+N da etapa do roadmap que foi efetuada)"; (7) checagem de 5 min / 10 tentativas criada para novos arquivos ou fases.

---

## 17. Gates globais e protocolo de verificação
1. `bunx vitest run` — suíte completa verde (a contagem só cresce). 2. `bunx tsgo --noEmit` — zero erros. 3. `bun run build` — zero erros. 4. `bun run lint` — zero erros e nenhum warning novo.
5. Preview :8080 — rotas da fase verificadas por Playwright em desktop **e** 390×844; sem `console.error`/pageerror novo. 6. Nenhuma dependência de runtime nova; nenhum arquivo gerado editado; nenhum segredo escrito.
**Protocolo:** scripts e screenshots de verificação ficam fora do worktree (ex.: `/tmp/browser/<fase>/`); timers com `page.clock`; STT com stub determinístico; PWA/SW só em build de produção; a linha de Gates de cada fase no roadmap traz números reais (testes, tamanhos de chunk, contagens).

## 18. Riscos e mitigações
| Risco | Mitigação |
|---|---|
| Fontes insuficientes para tipos de alto volume (wfd, repeat_sentence, sst) | Metas são metas; selo "banco pequeno"; nunca gerar por IA; busca contínua registrada em `sources.json` |
| Fonte aprovada some/bloqueia depois | Cache bruto + `sources.json` com data; itens já integrados permanecem com `source` rastreável |
| Reconhecedor "corrige" a fala e infla a nota | Copy honesta fixa, penalidades de extras/repetições, "pronúncia não avaliada" |
| Matriz/tempos oficiais divergirem entre fontes | Prevalece a oficial; divergência registrada; tempos "aproximados" rotulados |
| TTS variar por dispositivo | `TtsVoiceNote` mostra a voz usada; `pickVoice` por prefixo com fallback; limitação declarada |
| Quota do localStorage | Snapshot enxuto (~120 B/questão), payload slim, aviso preventivo, backup; IndexedDB só se medido > 3,5 MB (D1) |
| Traduções desalinhadas após edição do banco | `h` por frase + `plus-integrity.test.ts` |
| Escopo enorme | Fases com gates; tipos sem banco entram como "em breve" com motivo — honestidade é aceite, não integração forçada |

## 19. Definição de pronto
Fases 0–10 com gates verdes e linhas de Gates preenchidas · critérios globais 1–7 do planejamento verificados · `sources.json`, `report.json` e a verdade oficial registrados · relatório final entregue · monitor avisado.

## 20. Registro de decisões (vinculantes; novas decisões do agente entram aqui, numeradas em sequência)
| # | Decisão | Por quê |
|---|---|---|
| D1 | Estado em localStorage com snapshot por questão; IndexedDB só se o estado medido passar de 3,5 MB | Simplicidade e offline; medir, não apostar |
| D2 | Log de tentativas truncável (`MAX_ATTEMPT_LOG`); SRS/estatísticas vêm só de snapshots e agregados | Truncar o log nunca pode apagar memória de revisão |
| D3 | Estimativa 10–90 linear (`10 + 0,8·pct`), rotulada; alvo comparado na mesma escala | Uma escala por tela; heurística declarada |
| D4 | Sem IA no banco; proveniência `verificada`/`comunitaria`; "Só fontes verificadas" padrão desligado | Não esvaziar tipos sem item verificado; transparência |
| D5 | Pronúncia = "não avaliada"; fluência = proxy rotulado | A Web Speech API não expõe pronúncia |
| D6 | Describe Image só com imagem acessível e licença clara; `facts` derivados dos dados do próprio gráfico | Sem conteúdo inventado; correção por cobertura |
| D7 | Dedupe no ingest + `aliases.json` (sem `canonicalId` em runtime) | Banco limpo; progresso/backup resolvem ids antigos |
| D8 | Quarentena para estado ilegível; versão futura somente-leitura | Nunca sobrescrever o que não se entende |
| D9 | Import com prévia obrigatória, substituir × mesclar, cópia de segurança e desfazer | Backup antigo não destrói progresso novo |
| D10 | Pesos por habilidade = contribuições da matriz oficial, rotulados "aproximados" | Pesos numéricos da Pearson são proprietários |
| D11 | SRS promove só questão vencida; lapso rebaixa 1 caixa | Caixa = memória, não volume |
| D12 | `PASS_SCORE_BY_TYPE` calibrado por natureza da tarefa | Ditado exige mais que retenção de conteúdo |
| D13 | Detector de template local, aviso rotulado, nunca altera a nota | Pearson envia respostas-template a revisão humana; sem IA |
| D14 | Offline por downloader dirigido pelo cliente + SW versionado com aviso de atualização | Build SSR pode não expor a lista de assets |
| D15 | Simulado: `full` (blueprint oficial) × `part:*` × `mini`, sempre rotulados | Não chamar de "completo" o que é mini |
| D16 | Seção (onde treina) ≠ habilidade (o que pontua); prontidão é por habilidade | Tarefas integradas pontuam mais de uma habilidade |
| D17 | Pack com 3 recursos independentes; áudio só do inglês original; política `pre`/`post` anti-vazamento | Tradução ≠ áudio; gabarito não vaza |
| D18 | Traduções geradas dev-time por subagentes read-only em lotes, merge determinístico, `h` por frase | Sem API paga; detecta obsolescência |
| D19 | Cobertura do banco não entra na prontidão; variedade é indicador secundário | Tamanho do banco não mede habilidade |
| D20 | Catálogo = 22 tipos oficiais (HCS único, FIB drag-and-drop incluído); Personal Introduction fora (N8) | Fidelidade ao formato vigente |
| D21 | Metas por tipo são metas; abaixo da mínima "banco pequeno"; zero "em breve" com motivo | Honestidade sobre o banco |
| D22 | Todo arrastar tem alternativa por toque/teclado | Mobile e acessibilidade |
| D23 | Sem STT no navegador/permissão negada → treino sem nota (gravar e ouvir) | Nunca falhar em silêncio |
| D24 | Sequência/médias diárias limitadas pela retenção `DAILY_RETENTION_DAYS`, exibidas como "até N dias" | Tamanho de estado previsível |
| D25 | Reading/Listening usam tempo por questão aproximado (ponto médio) rotulado | A prova real tem timer por parte |
| D26 | Paleta/tipografia (Fase 0): âmbar profundo sobre papel quente no tema claro / azul-noite no escuro; Fraunces nos títulos, Space Grotesk no corpo (≥ 16 px); contraste AA verificado por `scripts/check-contrast.mjs` | §11.4 — tom acadêmico, calmo, legível |
| D27 | Blueprint adotado do relatório oficial "The Enhanced PTE Academic": contagens fixas por tipo (min = max = count), TOTAL 65; tempos por questão e por parte ficam "aproximados" | Contagens confirmadas na fonte oficial; tempos não expostos oficialmente em HTML |

## 21. Fora de escopo
Tudo o que está em N1–N8 (§2) e: reativar qualquer serviço pago de IA/tradução; lematização, stemming ou fuzzy no glossário; alterar contratos da §5/§13 sem registrar decisão; refactors cosméticos fora do que a fase exige; Personal Introduction.
