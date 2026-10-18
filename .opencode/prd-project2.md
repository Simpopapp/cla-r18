# PRD — Projeto 2: Varredura Massiva de Questões Reais do PTE (Expansão do Banco)

> **Fonte do escopo:** `.opencode/project2.md` (planejamento do projeto 2).
> **Derivado de:** `prd-project1.md` (herda schema, gate de fonte, dedupe, validação e pipeline — citado como "PRD1 §…"). Este documento NÃO copia o planejamento: define o COMO.
> **Data:** 2026-10-18 · **Status:** ativo · **Precedência:** este projeto roda ANTES das Fases 9–10 do projeto 1 (justificativa em §15).
> **Roadmap:** `.opencode/roadmap-proj2.md` · **Monitor:** relato e confirmação de recebimento registrados em 2026-10-18 (sessão OpenCode `ses_eb1642178ffewvRYv6BUkxkG4N`).

---

## 1. Contexto, problema e objetivo

### 1.1 Estado atual do banco (baseline herdado do projeto 1)
- 954 questões · 22 tipos com banco (`manifest.json`, `TOTAL_ALL_QUESTIONS = 954`) · 20 imagens de describe_image (OWID, CC BY 4.0).
- 7 fontes aprovadas (`sources.json`): pearson (95), owid (90), goarno (70), stormedugo (68), band9 (66), edknot (65), edknot-reorder/edknot-retell (65), goarno-reorder (64), langacad (62).
- Selo honesto por tipo: 10 tipos "banco pequeno", 9 "abaixo do ideal", 3 "ok".
- Pendências honestas registradas no `report.json` do projeto 1: corroboração cruzada entre fontes comunitárias **pendente**; sgd com 25 itens; redações-modelo da Language Academy não vinculadas.

### 1.2 Problema
O banco atual é pequeno demais para treino de alta fidelidade em vários tipos (metas mínimas do `bankTargets.ts` não alcançadas) e a autenticidade das questões comunitárias não foi corroborada entre fontes independentes — o maior fator de confiança (20 pontos no gate) está em branco. O projeto 1 demonstrou que busca pontual por "pistas" esgota rápido; o que falta é um **processo massivo, adaptativo e auditável** de varredura.

### 1.3 Objetivo
Expandir o banco com o máximo de questões que tenham **alta probabilidade de serem reais do PTE** — nunca inventadas, nunca de baixa credibilidade — a partir de uma varredura massiva por múltiplas fontes não oficiais, com:
1. validação de autenticidade por evidência explícita (avaliação estruturada, menções de "caiu na prova", corroboração entre fontes);
2. zero duplicação do banco atual (954) e entre ondas novas;
3. estratégia de busca **adaptativa**: cada onda aprende com a anterior (queries, fontes e filtros evoluem);
4. registro de evidência por item/fonte, auditável pelo monitor.

### 1.4 Definição de "questão real" (conceito operacional)
Uma questão entra no banco somente se pelo menos um dos caminhos abaixo se sustentar com evidência registrada:
- **C1 — Corroboração:** o item (ou quase-item ≥ 0,85 de similaridade) aparece em **≥ 2 fontes independentes** (§3). Repetição na web é o indicador mais forte de que a questão circula porque caiu na prova — e o planejamento (`project2.md`) a trata explicitamente como sinal positivo.
- **C2 — Menção explícita de prova:** a fonte (ou discussão vinculada) afirma que o item caiu em exame, com contexto verificável (data aproximada, "memory-based recall", lista "most repeated/prediction" com tráfego e reputação).
- **C3 — Curadoria de marca estabelecida:** fonte de preparo com reputação de mercado e editorial claro (gabarito, explicações, revisão humana), mesmo sem corroboração ainda — entra como `comunitaria` e sobe de tier quando corroborar.
- **C4 — Oficial:** material da Pearson (ou parceiro licenciado) → `verificada` direto.

**Nunca entra:** item sem gabarito verificável; item gerado/sintético (sinais do §2.5); item fora das faixas de formato do PRD1 §6.8 sem revisão manual; fonte reprovada no gate.

### 1.5 Não-objetivos
- Não reescrever motores, UI, SRS, simulado ou pack (projeto 1 já entregue); as mudanças de UI se limitam a selos/contagens derivados do manifesto.
- Não usar IA para gerar, traduzir ou "melhorar" questões (banco 100% colhido).
- Não redistribuir o banco (uso local e pessoal; §9).
- Não alterar as Fases 9–10 do projeto 1 (voltam a valer após este projeto; §15).

### 1.6 Definição de sucesso (fim do projeto)
- Todo tipo com contagem ≥ mínima do `bankTargets.ts` **ou** evidência documentada de esgotamento de fontes legítimas (relatório com tentativas, queries e rejeições por tipo).
- 100% dos itens novos com `evidence[]` preenchido (fonte, tipo de evidência C1–C4, data, similaridade/URL de corroboração quando houver).
- Matriz de corroboração recalculada e fontes re-avaliadas (recalcula a cada integração).
- Gates verdes: vitest estendido · tsgo · build · lint · zero IA no banco · dedupe comprovado (0 duplicatas ≥ 0,85 dentro do tipo).
- Monitor emite veredito por etapa; relatório final consolidado.

---

## 2. Sistema de evidência e autenticidade (núcleo)

### 2.1 Sinais positivos (somam confiança)
| Sinal | Peso | Como coletar |
|---|---|---|
| Corroboração entre fontes independentes (C1) | até 30 | dedupe quase-exato entre fontes distintas; registra par de fontes + similaridade |
| Menção "most repeated / prediction / memory recall" com data (C2) | até 20 | texto da página citado literalmente em `evidence` |
| Gabarito + explicação editorial | até 20 | resposta presente, coerente e com racional escrito por humano |
| Reputação da marca de preparo (tráfego, comunidade ativa, presença desde ≥ 2023) | até 15 | amostra manual + verificação externa |
| Fidelidade ao formato oficial (faixas PRD1 §6.8, vocabulário de enunciado) | até 10 | `validate` + amostra manual |
| Discussão comunitária independente (fóruns, grupos) citando a fonte/item | até 10 | URL da menção em `evidence` |

### 2.2 Sinais negativos (reprovam o item ou a fonte)
- Frases genéricas/tmpl repetidas entre itens de forma anômala; tópicos fora do universo do exame.
- Resposta incoerente com o enunciado; gabarito ausente ou contraditório entre itens da mesma fonte.
- Texto com marcas de síntese (perfeição uniforme, ausência de variação editorial, listas idênticas a bancos abertos de IA).
- Fonte que exige cadastro/e-mail/pagamento/captcha para o conteúdo (sem burlar bloqueios), bloqueia o agente, ou carrega o gabarito por JS não acessível.
- Volume anômalo: fonte publica "5000 questions" sem editorial — suspeita de re-empacotamento de IA; exigir amostra maior (§5.6).

### 2.3 Modelo de confiança da fonte (0–100, adaptado do PRD1 §6.1)
- Eliminatórios mantidos: G1 acesso/termos · G2 gabarito/transcrição · G3 item íntegro.
- Pontuação: corroboração cruzada **30** (era 20) · menção de prova **20** · gabarito+explicação **15** · reputação **15** · fidelidade de formato **10** · menção comunitária **10**.
- **≥ 80 → `verificada` · 65–79 → `corroborada` (novo tier) · 50–64 → `comunitaria` · < 50 → reprovada.**
- Item sem fonte aprovada não entra; item de fonte `comunitaria` **só entra** com C1, C2 ou C3 satisfeito (§1.4).

#### 2.3.1 Exemplo de pontuação (worked example)
Fonte nova "exemplo-prep" com lista de WFD:
- G1–G3: ok (acesso livre, gabarito presente, itens íntegros) → segue para pontuação.
- Corroboração cruzada (30): 12 de 40 itens batem (≥ 0,85) com goarno (operador diferente) → ≥ 25% cruzado = 30; 10–25% = 15; < 10% = 0 → **30**.
- Menção de prova (20): página declara "most repeated WFD in recent exams (Mar 2025)" com data → **20**.
- Gabarito + explicação (15): gabarito presente, sem explicações → **8** (parcial).
- Reputação (15): marca de preparo ativa desde 2022, comunidade ativa → **10**.
- Fidelidade de formato (10): 39/40 itens na faixa 3–20 palavras → **8**.
- Menção comunitária (10): 1 fórum independente cita a lista → **5**.
- **Total 81 → `verificada`**; se a corroboração fosse < 10%, total 51 → `comunitaria` e os itens só entrariam com C1–C3 por item.
O número de cada critério fica registrado na entrada da fonte — auditável pelo monitor.

### 2.4 Tiers de proveniência e efeito no app
- `verificada` (peso 1,0) · `corroborada` (0,95 — novo) · `comunitaria` (0,85) → constante `PROVENANCE_WEIGHT` atualizada em `coverage.ts`/`estimate` conforme uso.
- Selos visíveis nas listas/prática (proveniência por item), sem mudança de layout.
- Filtro "Só fontes verificadas" passa a incluir `verificada` + `corroborada` (label atualizado); comportamento de filas inalterado (PRD1 §6.2).

### 2.5 Evidência por item (`evidence[]`)
Todo item novo carrega: `{ sourceId, url, capturedAt, kind: "corroboration" | "exam-mention" | "editorial" | "official", detail }`. `detail` para corroboração cita a(s) outra(s) fonte(s) e a similaridade medida. É campo opcional no runtime (payload enxuto) e obrigatório no pipeline — versão completa vive em `.opencode/work/sweep/`, versão resumida (`source.domain` + `provenance`) entra em `src/data/pte/<tipo>.json`.

---

## 3. Corroboração cruzada (motor de autenticidade)

### 3.1 Matriz de corroboração
`.opencode/work/sweep/corroboration.json`: para cada par (item novo, item existente/novo) com similaridade ≥ 0,85 **dentro do mesmo tipo**, registrar `{ key, sources: [..], sims: [..], verdict }`. Alimentada pelo mesmo motor de dedupe (Jaccard de tokens, Dice de trigramas, prefixo 200) — **um cálculo, dois usos**: descarte de duplicata e elevação de confiança.

### 3.2 Independência de fontes
Fontes do mesmo operador/negócio/redes compartilhadas contam como **uma** fonte para C1 (critério: domínio, quem administra, texto idêntico entre sites). Registrar o agrupamento em `sources-sweep.json` (`operatorGroup`).

### 3.3 Recálculo incremental
A cada onda integrada: re-calcular similaridade dos itens novos contra (a) banco atual, (b) itens de ondas anteriores, (c) itens da mesma onda. Recalcular a pontuação de **todas** as fontes afetadas (corroboração melhora com o banco crescendo). Nunca rebaixar tier sem registrar motivo.

### 3.4 Pendência herdada
Fechar a pendência do projeto 1: corroboração das 7 fontes comunitárias existentes entra na primeira onda de recálculo (Fase 5 do roadmap), inclusive das fontes "verificadas" que ainda não cruzaram (goarno × stormedugo × edknot × band9 × langacad).

---

## 4. Deduplicação

### 4.1 Regras herdadas (PRD1 §6.4, sem mudança de semântica)
Normalização NFKC, minúsculas, pontuação/espaços/aspas unificadas. Chave por tipo (frase/transcript, passagem+pergunta, passagem, enunciado, parágrafos concatenados, imagem+título). Exata = hash da chave; quase = `max(Jaccard, Dice) ≥ 0,85` ou prefixo de 200 igual.

### 4.2 Dedupe contra o banco atual — obrigatório e primeiro
Todo candidato é comparado **antes de tudo** contra as 954 existentes por tipo. Match → **não integra como novo**; vira `aliases.json` (o descartado aponta para o id vencedor) e, se vier de fonte independente, **alimenta a corroboração do item existente** (eleva o tier dele). Vencedor: maior proveniência; empate → o mais antigo.

### 4.3 Entre fontes novas: repetição é evidência, não perda
Quando 2+ fontes novas trazem o mesmo item: integra **uma** cópia (melhor proveniência + `evidence` de todas as fontes que o trouxeram) e registra corroboração para ambas. Assim "expansão sem duplicar" e "repetição = sinal positivo" coexistem: o número de itens sobe uma vez, o número de **confirmações** sobe N vezes.

### 4.4 Aliases
Mesma mecânica do PRD1 §5.3/§6.4 (`aliases.json` resolve para ids existentes; teste de integridade cobre).

---

## 5. Metodologia de varredura adaptativa

### 5.1 Ciclo por onda (Fase de execução)
1. **Planejar:** escolher tipos alvo (prioridade §5.3), montar queries e canais (busca web, sitemaps, agregadores, PDFs, repositórios, fóruns).
2. **Buscar:** executar queries; logar tudo que foi tentado — inclusive o que falhou (evidência de esgotamento honesta, §1.6).
3. **Avaliar:** gate da fonte (§2.3) + amostra adaptativa.
4. **Adaptar:** refinar queries com o vocabulário real das fontes aprovadas (termos que as fontes usam: "prediction file", "most repeated", "memory based", "exam recall"), descartar famílias de sites ruins, priorizar nichos que renderam.
5. **Extrair → validar → dedupe → integrar → reportar.**

### 5.2 Templates de query por tipo (ponto de partida; a onda evolui)
- Genéricos: `<tipo> real exam questions with answers`, `PTE <tipo> "most repeated"`, `PTE <tipo> prediction <mês/ano>`, `PTE <tipo> memory based questions`.
- Específicos: `answer short question PTE pdf answers`, `write essay topics PTE with sample answer`, `reorder paragraph PTE pdf`, `retell lecture transcript PTE`, `summarize spoken text transcript`, `describe image chart PTE list`.
- Canais: blogs de preparo (AU/IN/NP), PDFs indexados (`filetype:pdf`), fóruns/grupos públicos, repositórios públicos (GitHub etc., só com licença que permita reuso local), páginas "essential questions" que as fontes aprovadas linkam.

### 5.2.1 Queries de partida por tipo (tabela; a onda adapta com o vocabulário real encontrado)
| Tipo | Queries de partida |
|---|---|
| read_aloud | `PTE read aloud "most repeated" passages`, `read aloud prediction file PTE pdf`, `PTE read aloud exam questions with answers` |
| repeat_sentence | `PTE repeat sentence "most repeated" 2024 2025`, `repeat sentence prediction PTE`, `PTE RS questions list pdf` |
| describe_image | `PTE describe image list with answers`, `describe image most repeated charts PTE`, `PTE DI practice charts CC` |
| retell_lecture | `PTE retell lecture transcript + template`, `retell lecture most repeated PTE pdf`, `PTE RL audio transcript list` |
| answer_short | `PTE answer short question pdf with answers`, `ASQ most repeated PTE`, `PTE short questions one word answers list` |
| sgd | `summarize group discussion PTE questions transcript`, `SGD PTE examples with model answer`, `PTE speaking group discussion practice` |
| rts | `re-tell sentence PTE questions`, `PTE RTS practice with answers`, `repeat tell sentence PTE list` |
| swt | `summarize written text PTE passages with answers`, `PTE SWT most repeated`, `summarize written text 300 words PTE pdf` |
| write_essay | `PTE essay topics with sample answers`, `PTE most repeated essay topics`, `write essay 200-300 words PTE list` |
| read_fib_dropdown | `PTE reading fill in the blanks dropdown with answers`, `R FIB dropdown PTE pdf`, `fill in blanks choose word PTE` |
| read_fib_drag | `PTE reading fill blanks drag words pdf`, `R FIB drag and drop PTE with answers`, `box fill blanks PTE list` |
| reorder_paragraphs | `PTE reorder paragraphs pdf with answers`, `re order paragraphs most repeated PTE`, `paragraph jumble PTE academic` |
| read_mcq_single | `PTE reading multiple choice single answer pdf`, `reading MCQ PTE with answers`, `PTE reading single answer most repeated` |
| read_mcq_multi | `PTE reading multiple choice multiple answers pdf answers`, `reading multi MCQ PTE list`, `select multiple answers PTE` |
| lst_mcq_single | `PTE listening MCQ single answer transcript pdf`, `listening multiple choice PTE with audio script` |
| lst_mcq_multi | `PTE listening select multiple answers pdf`, `listening MCQ multiple transcript answers PTE` |
| lst_fib | `PTE listening fill in the blanks transcript pdf`, `listening FIB PTE with answers script` |
| lst_hcs | `PTE highlight correct summary transcript answers`, `HCS PTE pdf`, `listening highlight summary PTE list` |
| lst_smw | `PTE select missing word transcript answers`, `SMW PTE questions pdf`, `beep missing word PTE list` |
| lst_hiw | `PTE highlight incorrect words transcript answers`, `HIW PTE pdf`, `highlight wrong words PTE list` |
| sst | `PTE summarize spoken text transcript + model`, `SST most repeated PTE pdf answers`, `summarize spoken text 70 words list` |
| wfd | `PTE write from dictation most repeated`, `WFD prediction PTE pdf`, `write from dictation list 2025` |

### 5.3 Priorização por escassez (herdada do PRD1 §6.6, reavaliada por onda)
P0 = tipos mais escassos: `lst_hcs, lst_hiw, lst_smw, lst_mcq_single, lst_mcq_multi, answer_short, read_mcq_multi, sgd, rts, describe_image` → P1 = `swt, retell_lecture, write_essay, read_mcq_single, read_fib_dropdown, read_fib_drag, reorder_paragraphs` → P2 = `lst_fib, sst, read_aloud` → P3 = `wfd, repeat_sentence` (só itens 100% novos pós-dedupe).
A ordem **reavalia-se a cada onda** com o déficit atual (contagem × meta), registrada no relatório.

### 5.4 Quotas e ondas
- Onda = unidade de trabalho do roadmap (Fases 2–4): lote de tipos, lote de fontes candidatas, integração completa com gates.
- Limite por fonte: amostra ≥ 10% (mín. 10 itens) antes de aprovar; defeito > 10% → dobra amostra; persistindo → reprova a fonte (herdado).
- Sem meta rígida de volume por onda — meta é déficit fechado com qualidade; volume esperado por tipo está nas metas do §10.

### 5.5 Descoberta em cadeia
Links de páginas aprovadas (relacionados, índices, séries "part 2") viram candidatas na próxima onda, mantendo o gate. O log de varredura registra a cadeia (origem → candidata).

### 5.6 Amostra manual por fonte
Registrar em `sources-sweep.json`: itens inspecionados, defeitos encontrados, trechos citados, decisão. Fontes de volume anômalo (§2.2) exigem amostra ≥ 20 itens.

### 5.7 Armadilhas conhecidas (reconfirmar, herdadas + novas)
Cadastro/e-mail obrigatório · gabarito por JS · PDFs sem texto selecionável · bloqueio de agente · listas sem gabarito · re-empacotadores de IA · sites que copiam entre si **do mesmo operador** (corroboração inválida se não independentes) · conteúdo com copyright sem licença clara (§9).

---

## 6. Pipeline técnico

### 6.1 Estrutura (espelha `scripts/bank/*`; nova pasta `scripts/sweep/`)
- `sweep-scout.mjs` — descoberta (busca + cadeia) → grava candidatas em `.opencode/work/sweep/sources-sweep.json`.
- `sweep-fetch.mjs` — download com cache em `.opencode/work/sweep/raw/` (1 req/s, UA identificado, respeita robots).
- `sweep-extract-<fonte>.mjs` — por fonte aprovada (HTML/PDF → itens brutos em `.opencode/work/sweep/extracted/`).
- `sweep-normalize.mjs` — para o schema do PRD1 §5 (uma vez o texto, resto derivado).
- `sweep-validate.mjs` — schema + faixas PRD1 §6.8 + G3 + regras deste PRD (C1–C4 obrigatório por item).
- `sweep-dedupe.mjs` — contra o banco atual + intra-onda + inter-ondas; emite corroboração (§3.1).
- `sweep-integrate.mjs` — grava `src/data/pte/<tipo>.json`, `aliases.json`, roda `build-manifest`.
- `sweep-report.mjs` — `.opencode/work/sweep/report.json` (por tipo/fonte: encontrados · inválidos · duplicatas · corroborados · integrados · queries tentadas).

### 6.2 Convenções dos scripts
Node ESM `.mjs`, idempotentes e resumíveis (cache por URL/hash), sem deps de runtime novas no app, sem rede no bundle. Reutilizar `scripts/bank/lib.mjs` onde possível (normalização, similaridade) — extrair para módulo compartilhado em vez de duplicar (decisão: `scripts/bank/lib.mjs` permanece; `sweep` importa dele).

### 6.3 Subagentes de coleta
Trabalho de busca/leitura massiva usa subagentes read-only em lotes (padrão do pack, PRD1 §13.3): cada lote recebe tipos + queries + critérios de evidência e devolve candidatas **com evidência**; o builder valida, extrai e integra. Nada entra no banco sem passar pelo pipeline local.

### 6.4 Limites e conformidade
1 req/s · robots.txt · termos de uso · sem login/e-mail/pagamento · sem burlar bloqueio · cache bruto preservado para auditoria.

---

## 7. Modelo de dados e integração no app

### 7.1 Schema
Herdado integralmente do PRD1 §5 (texto uma vez, derivados em `catalog.ts`). Novos campos: `provenance` passa a aceitar `corroborada`; `evidenceSummary` (opcional, 1 linha, ex.: `"confirmado por 3 fontes"`).

### 7.2 Manifesto
`manifest.json` regenerado (`build-manifest.mjs`); `TOTAL_ALL_QUESTIONS` e contagens por tipo derivam dos JSONs — **números sempre derivados, nunca editados à mão**.

### 7.3 Selos honestos
Rótulos recalculados a partir do déficit (≥ mínima = ok; < mínima = "abaixo do ideal"/"banco pequeno"); motivo no relatório quando continuar pequeno.

### 7.4 Payload e chunks
Meta mantida: nenhum chunk de dados > 250 KB bruto para tipos ≤ 1.000 itens; medir a cada integração e registrar no roadmap. Se algum tipo estourar, dividir carregamento por lote antes de aceitar o estouro.

### 7.5 Estado do aluno
Nenhuma migração de storage: itens novos usam ids novos; `aliases.json` garante que tentativas antigas não quebrem. SRS/queue/plano consomem o catálogo sem mudança.

### 7.6 Impacto na UI (limitado e derivado)
- Selos de proveniência por item já renderizados nas listas/prática passam a aceitar o rótulo `corroborada` (cor/ícone do tema; sem novo layout).
- Filtro "Só fontes verificadas" (Ajustes) passa a incluir `corroborada`; label atualizado para "Só fontes verificadas/corroboradas".
- Contagens do catálogo e selos "banco pequeno"/"abaixo do ideal": sempre derivados do manifesto — nenhuma contagem editada à mão.
- Nenhuma tela nova; nenhum fluxo novo; zero mudança nos motores de prática/simulado.

---

## 8. Validação por tipo (herdada + específicas da varredura)

### 8.1 Faixas (PRD1 §6.8, inalteradas)
read_aloud 25–120 · repeat 4–25 · wfd 3–20 · swt 150–350 · essay 15–120 · sst 150–330 palavras · retell 80–260 · mcq passagem 40–400/3–5 opções · mcq_multi ≥ 2 respostas · reorder 4–6 · FIB marcadores=lacunas · lst_fib 1/lacuna · hcs/smw 3–4 opções · hiw ≥ 1 errada · asq `answers` não vazio · di arquivo+alt+licença · sgd ≥ 2 falantes.
Fora da faixa → fila de revisão manual (não descarte silencioso); revisão não inventa conteúdo — só corta lixo ou reclassifica.

### 8.2 Listening exige transcript (G2) — sem transcript, TTS impossível → item reprovado para o tipo.

### 8.3 describe_image — herda PRD1 §6.10 (`facts` determinísticos dos dados do gráfico; sem dados de origem → só entra com modelo real da fonte; licença registrada).

### 8.4 Inglês correto e encoding limpo (G3); itens truncados → reprovados, motivo no relatório.

### 8.5 Notas de extração e armadilha por tipo (guia do extrator)
| Tipo | O que colher | Armadilhas específicas |
|---|---|---|
| read_aloud | passagem 25–120 palavras | quebras de linha dentro de palavras em PDF; blob fora da faixa → cortar (item 50) ou descartar |
| repeat_sentence | frase 4–25 palavras | listas sem separador claro; repetições internas da mesma lista |
| describe_image | gráfico + dados de origem + modelo | imagem sem licença; captura de terceiros; sem `facts` derivável → só com modelo real |
| retell_lecture | transcript 80–260 palavras + modelo | transcript ausente; áudio de terceiros com copyright |
| answer_short | pergunta + answers[] | grafias múltiplas (normalizar); pergunta sem contexto suficiente |
| sgd | cenário + ≥ 2 falantes (transcript) | formato novo (2025) pouco documentado; fontes confundem com retell |
| rts | frase do falante + resposta 10–40 s | nomenclatura confundida com repeat_sentence |
| swt | passagem 150–350 + resposta-modelo | resposta-modelo sintética (sinais §2.2); parágrafo truncado |
| write_essay | prompt 15–120 + modelo | tópico sem prompt completo; modelos 100% template |
| read_fib_* | passagem + lacunas + banco/opções | marcadores ≠ respostas; banco incompleto; blank < 3 opções (dropdown reprova) |
| reorder_paragraphs | 4–6 parágrafos + ordem | ordem em comentário separado; pontuação colada ao parágrafo |
| read_mcq_* | passagem 40–400 + 3–5 opções + resposta | multi com 1 resposta → reprova; gabarito por JS |
| lst_* (mcq/fib/hcs/smw/hiw) | transcript obrigatório + opções/resposta | sem transcript → reprova para o tipo; smw sem palavra faltante identificável |
| wfd | ditado 3–20 palavras | repetições internas das "prediction lists"; pontuação inconsistente |

### 8.6 Fila de revisão manual
Itens fora de faixa ou com conflito (gabarito contraditório entre fontes) vão para `.opencode/work/sweep/review.json` com motivo. A revisão é **não-inventiva**: cortar truncamento, unificar grafia, reclassificar tipo, descartar lixo. Nunca escreve conteúdo novo; o que não puder ser consertado sem criação → descartado com motivo no relatório.

---

## 9. Governança, ética e direitos

- Uso **local e pessoal**; não redistribuir o banco como produto; não publicar itens em URL pública do app.
- Registrar licença/atribuição quando existir (obrigatório para imagens); respeitar pedidos de remoção (procedimento: remover item + registrar em `report.json`).
- Nenhuma questão gerada por IA entra no banco — verificação dupla: sinais §2.2 + amostra manual.
- Sem burla de bloqueios técnicos ou legais; fonte que bloquear → reprovar e registrar.

---

## 10. Metas por tipo

### 10.1 Tabela (herdada de `bankTargets.ts` — metas, não obrigações)
| Tipo | mín. | ideal | | Tipo | mín. | ideal | | Tipo | mín. | ideal |
|---|---|---|---|---|---|---|---|---|---|---|
| wfd | 300 | 900 | | read_aloud | 100 | 200 | | read_fib_dropdown | 40 | 80 |
| repeat_sentence | 200 | 550 | | describe_image | 20 | 60 | | read_fib_drag | 20 | 50 |
| sst | 60 | 120 | | retell_lecture | 40 | 80 | | read_mcq_single | 60 | 110 |
| lst_fib | 60 | 100 | | answer_short | 80 | 140 | | read_mcq_multi | 20 | 50 |
| lst_hcs | 20 | 50 | | sgd | 12 | 40 | | reorder_paragraphs | 40 | 80 |
| lst_smw | 20 | 50 | | rts | 30 | 60 | | swt | 40 | 80 |
| lst_hiw | 20 | 50 | | write_essay | 30 | 60 | | lst_mcq_single / multi | 20 / 20 | 50 / 50 |

### 10.2 Critério de parada honesto
Tipo fecha a onda quando: (a) atinge a mínima, ou (b) duas ondas consecutivas sem nenhuma candidata nova aprovada → registrar esgotamento (queries tentadas, fontes reprovadas, motivo) no relatório e seguir; a checagem de 5 min / 10 tentativas da §14 reabre o tipo se nova evidência aparecer.

### 10.3 Fallback
Contagem < mínima → selo mantido; contagem 0 para tipo novo → não se aplica (os 22 já têm banco). Nenhum tipo sai do catálogo.

---

## 11. Fases — escopo e critérios de aceite (resumo; detalhe e gates no roadmap)

### Fase 0 — Baseline e infraestrutura
Escopo: snapshot/fingerprints das 954 questões; esqueleto `scripts/sweep/*`; `sources-sweep.json` inicial (importa as 7 fontes do projeto 1 com `operatorGroup`); work dirs; corroboration vazio.
Aceite: rodar `sweep-dedupe.mjs` em modo baseline = 0 duplicatas dentro do banco (sanidade) + hash determinístico por item estável entre execuções.

### Fase 1 — Descoberta (onda de scout P0)
Escopo: varredura de fontes para os tipos P0; registro de candidatas com evidência; amostras manuais.
Aceite: ≥ N candidatas registradas por tipo P0 com `evidence` e decisão de gate (números reais no relatório da fase); queries tentadas logadas.

### Fase 2 — Integração dos tipos P0
Escopo: extrair → validar → dedupe → integrar tipos P0; corroboração inicial.
Aceite: itens novos integrados só com C1–C4; dedupe contra 954 provado; `bank-integrity` verde; selos recalculados.

### Fase 3 — Tipos P1 (mesmo ciclo da Fase 2)
Escopo: swt, retell_lecture, write_essay, read_mcq_single, read_fib_dropdown, read_fib_drag, reorder_paragraphs. Prioridade interna reavaliada pelo déficit (um tipo perto da mínima perde lugar para o mais escasso). Mesmos critérios de aceite da Fase 2, com números reais registrados.

### Fase 4 — Tipos P2/P3 (volume alto)
Escopo: lst_fib, sst, read_aloud (P2); wfd, repeat_sentence (P3 — só itens 100% novos pós-dedupe; repetições internas das prediction lists são filtradas antes e contadas à parte no relatório).
Cuidados extras: dedupe também contra ondas anteriores (não só intra-onda); risco de estouro de chunk concentrado em wfd — dividir carregamento por lote se > 250 KB (§7.4).

### Fase 5 — Corroboração global e re-avaliação de fontes
Escopo detalhado:
- Matriz completa: banco atual + todas as ondas; incluir as 7 fontes do projeto 1 (fecha a pendência de corroboração do `report.json` do projeto 1, §3.4).
- Re-pontuação de todas as fontes com o modelo §2.3; promoções/rebaixamentos de tier com motivo registrado em `sources-sweep.json`.
- `PROVENANCE_WEIGHT` atualizado para incluir o tier `corroborada` (0,95) com teste.
- Aliases finais consolidados.
Critérios de aceite:
- Nenhuma fonte aprovada sem decisão de corroboração registrada; mudanças de tier justificadas.
- Teste "item `corroborada` exige ≥ 2 fontes independentes" verde e pega literal inserido à mão (§14.8).

### Fase 6 — Fechamento
Escopo detalhado:
- Relatório final: cobertura × meta antes/depois por tipo; corroboração (itens com ≥ 2 fontes independentes, fontes promovidas); esgotamentos documentados; revisões manuais; chunk máximo medido.
- Selos honestos e textos de UI derivados de contagens atualizados; preview conferido nas telas afetadas (listas, prática, plano).
- Checagem de 5 min / 10 tentativas por novos arquivos/fases; monitor avalia e emite veredito final.
Critérios de aceite:
- Gates globais verdes; relatório copiado para o roadmap; veredito do monitor registrado em `docs/planning/reports/`.

---

## 12. Riscos e mitigações
| Risco | Mitigação |
|---|---|
| Fontes comunitárias copiam umas às outras (corroboração inflada) | `operatorGroup` + checagem de texto idêntico entre "independentes"; independência declarada com evidência |
| Invasão de itens sintéticos de IA | sinais §2.2 + amostra manual obrigatória + reprovação de fonte inteira na dúvida |
| Dedupe errado descarta item novo real | thresholds herdados já testados; conflitos vão para revisão manual, não descarte automático |
| Esgotamento silencioso de um tipo | log de queries tentadas é obrigatório; parada honesta §10.2 |
| Volume estoura chunk 250 KB | dividir carregamento por lote antes de integrar |
| Tempo/massa de trabalho | subagentes em lotes com critérios explícitos; ondas curtas com gates |
| Saída de subagente inviável/alucinada | subagente é read-only e devolve candidatas **com URLs**; o builder re-verifica toda URL antes do gate — nada entra por confiança no subagente |
| Conteúdo protegido capturado sem licença | §9: registro de licença obrigatório; sem licença clara → não integra (imagens e transcripts de áudio, principalmente) |
| Fonte cai entre o gate e a extração | cache bruto preservado (auditoria); falha registrada; re-fetch só se a fonte voltar |
| Deriva de schema entre ondas | validate roda a cada lote; mudança de schema exige atualização do PRD antes, não depois |

---

## 13. Métricas e relatórios
- `.opencode/work/sweep/report.json` por onda: por tipo e fonte — encontrados · inválidos · duplicatas (banco/intra) · corroborados · integrados · revisão manual · queries tentadas · fontes reprovadas com motivo.
- Cobertura: contagem × meta por tipo (derivada do manifesto) antes/depois.
- Corroboração: nº de itens com ≥ 2 fontes independentes; nº de fontes promovidas de tier.
- Copiar os números reais para o roadmap (linha de Gates) e para `docs/planning/stages/stage-NN-status.md`.

---

## 14. Testes de integridade (estendem `bank-integrity.test.ts`)
1. `provenance` ∈ {verificada, corroborada, comunitaria} em todos os itens.
2. Todo item novo (id não presente no baseline Fase 0) tem `source.domain` em `sources-sweep.json` aprovado.
3. Zero par quase-duplicado (≥ 0,85) dentro do tipo — incluindo itens novos.
4. `aliases.json` resolve para ids existentes.
5. Manifesto = soma dos JSONs; `TYPE_META` cobre 22 slugs.
6. Faixas PRD1 §6.8 respeitadas (ou fila de revisão registrada — teste lê o relatório).
7. Nenhum item com provenance `corroborada` sem ≥ 2 fontes independentes na matriz de corroboração.
8. Sanity de regra nova: literal inserido à mão sem evidência **falha** (o teste pega).

---

## 15. Decisões registradas
1. **Precedência do projeto 2** sobre as Fases 9–10 do projeto 1: `project2.md` determina "faça tudo agora ser sobre" a varredura; planejamento > roadmap no escopo (Plan.md). Fases 9–10 voltam após este projeto.
2. **Destino de `roadmap-proj.md` ("null"):** era um placeholder vazio da cópia do workspace, não um arquivo do projeto 1 (que usa `roadmap-proj1.md`). Preenchido com apontador para o roadmap ativo — não é um quarto arquivo de protocolo.
3. **Novo tier `corroborada`** (65–79): reconhece fontes comunitárias com corroboração forte sem atingir o corte de `verificada`; peso 0,95.
4. **Repetição entre fontes = evidência, não descarte cego** (§4.3): resolve a tensão do planejamento entre "expandir sem duplicar" e "repetição na web é bom indicador".
5. **Dedupe primeiro contra o banco atual** (§4.2): protege as 954 questões existentes; match vira alias/corroboração.
6. **Reuso de `scripts/bank/lib.mjs`** para normalização/similaridade — uma só implementação dos algoritmos.
7. **Sem deps de runtime novas no app**; ferramentas dev-time (pdftotext etc.) permitidas no pipeline.

---

## Apêndice A — Exemplos de registros

### A.1 `sources-sweep.json` (entrada de fonte)
```json
{
  "id": "exemplo-prep",
  "url": "https://exemplo-prep.example/pte-wfd-prediction",
  "types": ["wfd"],
  "status": "aprovada",
  "tier": "comunitaria",
  "confidence": 71,
  "operatorGroup": "exemplo-prep",
  "evidence": [
    { "kind": "exam-mention", "detail": "Página declara 'most repeated WFD in recent exams (Mar 2025)'", "capturedAt": "2026-11-02" },
    { "kind": "editorial", "detail": "Gabarito + contagem de palavras por item; revisão humana declarada" }
  ],
  "sample": { "inspected": 15, "defects": 1, "notes": "1 item truncado descartado" },
  "decision": { "at": "2026-11-02", "reason": "G1-G3 ok; confiança 71 (corroboração pendente)" }
}
```

### A.2 Corroboração (entrada da matriz)
```json
{
  "key": "wfd:thelecturetheaterwillholdatalkonthepoliticalimpactofclimatechange",
  "sources": ["goarno", "exemplo-prep"],
  "independent": true,
  "similarity": { "jaccard": 1.0, "dice": 1.0 },
  "verdict": "corroborated",
  "effect": ["item existente #wfd-012 sobe evidência", "fonte exemplo-prep +corroboração"]
}
```

### A.3 Item integrado (campos novos)
```json
{
  "id": "wfd-311",
  "type": "wfd",
  "text": "The lecture theater will hold a talk on the political impact of climate change.",
  "provenance": "corroborada",
  "source": { "domain": "goarno.io" },
  "evidenceSummary": "confirmado por 2 fontes independentes"
}
```

## Apêndice B — Protocolo de amostra manual (por fonte)
1. Sortear 10 itens (volume anômalo: 20) espalhados pela lista, não os 10 primeiros.
2. Para cada item conferir: faixa de formato (PRD1 §6.8), inglês correto/encoding, gabarito presente e coerente, ausência de sinais de síntese (§2.2).
3. Registrar: nº inspecionado, nº de defeitos, 2–3 trechos literais como evidência, decisão (aprovar por tipo / dobrar amostra / reprovar).
4. Fonte pode ser aprovada por tipo e reprovada por outro — registrar por tipo.

## Apêndice C — Glossário
- **C1–C4:** caminhos de autenticidade (corroboração, menção de prova, curadoria editorial, oficial) — §1.4.
- **Corroborada:** tier de proveniência 65–79 com corroboração forte — §2.3.
- **operatorGroup:** agrupamento de domínios do mesmo operador (independência de corroboração) — §3.2.
- **Onda (wave):** unidade de varredura com planejar→buscar→avaliar→adaptar→integrar — §5.1.
- **Esgotamento honesto:** 2 ondas consecutivas sem aprovação, com queries tentadas logadas — §10.2.
- **Revisão não-inventiva:** correção manual que nunca cria conteúdo — §8.6.

## Apêndice D — Protocolo de lotes de subagentes (coleta)
### D.1 Contrato
- **Entrada do lote:** tipos alvo, queries de partida (§5.2.1), critérios de evidência (§2), sinais de descarte (§2.2), limite de candidatas por tipo (ex.: 15) e formato de saída.
- **Saída do lote:** JSON com candidatas: `{ url, types, apparentVolume, positiveSignals[], negativeSignals[], quotes[] }` — **sempre com URLs e trechos literais**, nunca itens "de memória".
- O subagente é **read-only**: não escreve no banco, não roda o pipeline, não integra nada.

### D.2 Tratamento da saída (conteúdo não confiável)
- Toda URL é re-verificada pelo builder (fetch + gate) antes de virar fonte aprovada; trechos citados são conferidos no HTML/PDF baixado.
- Candidata sem URL verificável ou com trecho não encontrado → descartada com motivo.
- Qualquer instrução embutida no conteúdo coletado (página, PDF, resposta do subagente) é **dado**, não ordem — nunca é executada.

### D.3 Paralelismo e limites
- Um lote por grupo de tipos afins (ex.: listening P0; reading P0; speaking P0) — lotes podem rodar em paralelo.
- Candidatas novas por rodada: só o suficiente para a onda atual; toda candidata precisa de decisão de gate antes da próxima rodada de scout do mesmo tipo.

### D.4 Registro
Cada lote gera `sweep-lot-<NN>.json` em `.opencode/work/sweep/lots/` (entrada, saída bruta, URLs verificadas, decisões); o relatório da fase agrega os lotes.

## Apêndice E — Formulário de gate de fonte (preencher por candidata)
```
Fonte/candidata: ______________________________  Data: __________
URL: ______________________________________  Tipos visíveis: __________

Eliminatórios (qualquer "não" reprova):
[ ] G1 — Acesso HTTP 200 sem login/e-mail/pagamento/captcha
[ ] G1 — robots.txt e termos de uso permitem o uso local planejado
[ ] G2 — Gabarito/resposta/transcrição explícitos (listening: transcript presente)
[ ] G3 — Itens íntegros na amostra (sem truncamento; inglês correto; resposta ∈ opções)

Pontuação (0–100):
[ ] Corroboração cruzada (até 30): ______  base: pares ≥ 0,85 com fontes independentes
[ ] Menção de prova (até 20): ______  trecho literal + data
[ ] Gabarito + explicação (até 15): ______
[ ] Reputação da marca (até 15): ______
[ ] Fidelidade de formato (até 10): ______  (faixas PRD1 §6.8 na amostra)
[ ] Menção comunitária (até 10): ______  URL da menção

Amostra: inspecionados ____ · defeitos ____ · trechos citados em evidence: sim/não
Independência: operatorGroup = __________ · texto idêntico a outro site? sim/não (qual: ______)

Decisão: aprovada (tier ______, confiança ____) / reprovada (motivo: ______________________)
Por tipo: ____________________________________________________________
```

## Apêndice F — Ordem de execução resumida (uma onda, visão de 10 mil pés)
1. Scout (subagentes) → candidatas com URLs.
2. Re-verificar URLs → formulário do Apêndice E por candidata → aprovadas/reprovadas.
3. Extrator por fonte aprovada → bruto em cache.
4. Normalize → Validate (faixas + C1–C4) → review.json para conflitos.
5. Dedupe (banco atual → intra-onda → ondas anteriores) → aliases + corroboração.
6. Integrate → build-manifest → selos recalculados.
7. Report da onda + Gates + monitor.
Repetir com a prioridade reavaliada até fechar as fases do roadmap.
