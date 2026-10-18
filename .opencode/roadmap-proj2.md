# Roadmap — projeto 2 (Varredura Massiva de Questões Reais do PTE)

Fonte: `.opencode/prd-project2.md` (← `.opencode/project2.md`). Fases em ordem de dependência; só avance com os gates da fase verdes e marque `[x]` com a linha de Gates (números reais). Só reordene com justificativa registrada aqui.
Gates padrão: vitest verde · tsgo limpo · build OK · lint 0 erros · zero deps de runtime novas · nenhum arquivo gerado editado · dedupe ≥ 0,85 provado · evidência C1–C4 por item novo · selos honestos recalculados · monitor notificado ao fim da fase.
Prioridade: P0 = lst_hcs, lst_hiw, lst_smw, lst_mcq_single/multi, answer_short, read_mcq_multi, sgd, rts, describe_image · P1 = swt, retell, essay, read_mcq_single, fib_dropdown, fib_drag, reorder · P2 = lst_fib, sst, read_aloud · P3 = wfd, repeat_sentence.

- [x] Fase 0 (P0) — Baseline e infraestrutura de varredura
  - [x] Fingerprints (hash determinístico por chave normalizada) das 954 questões existentes → `.opencode/work/sweep/baseline.json`
  - [x] Esqueleto `scripts/sweep/*` (scout, fetch, normalize, validate, dedupe, integrate, report) reutilizando `scripts/bank/lib.mjs`
  - [x] `sources-sweep.json` inicial: importa as fontes do projeto 1 + `operatorGroup`; work dirs criados
  - Gates: dedupe em modo baseline = 0 duplicatas em 954 itens (sanidade) · hash estável entre 2 execuções ✓ · vitest 319/319 · tsgo limpo · build OK · lint 0 erros (9 warnings pré-existentes) · zero deps de runtime novas · status: docs/planning/stages/stage-p2-00-status.md

- [x] Fase 1 (P0) — Descoberta adaptativa (scout, tipos P0)
  - [x] Busca por tipo P0 (queries §5.2 + cadeia de links); candidatas em `sources-sweep.json` com evidência, amostra manual e decisão de gate (aprovada/reprovada + motivo) — 31 novas candidatas (0 inválidas, 0 duplicadas → 41 no catálogo); 7 aprovadas + 1 condicional, 17 reprovadas, 6 pendentes (Wikimedia, onda 2)
  - [x] Log de queries tentadas (inclusive sem resultado) → evidência de esgotamento honesta — 178 queries em `queries-wave1.json`; listening P0 + read_mcq_multi com esgotamento parcial registrado (onda 2 antes de declarar esgotamento)
  - Gates: cada tipo P0 com candidatas avaliadas OU esgotamento registrado ✓ · amostra manual ≥ 10% (mín. 10) por fonte aprovada ✓ (correção pós-verificação: ptehelper 11/102, gurully_asq 10/66, ptesprinters 10/49; fontes pequenas = total disponível) · gates padrão ✓ (vitest 319/319 · tsgo limpo · build OK · lint 0 erros/9 warnings · zero deps novas) · status: docs/planning/stages/stage-p2-01-status.md

- [x] Fase 2 (P0) — Integração dos tipos P0 (onda 1)
  - [x] Extrair → normalizar → validar (C1–C4 + faixas PRD1 §6.8) → dedupe contra 954 + intra-onda → integrar — 377 candidatos (ptehelper 190 · gurully_asq 50 · sumlingo 99 · ptesprinters 34 · gurully_rts 4); 377 válidos, 0 rejeitados, 0 fora de faixa; gurully_sgd (11 itens) NÃO integrado — página só tem resumo-modelo, sem turns (PRD2 §1.4, skip honesto)
  - [x] Corroboração inicial (matriz §3) + aliases para matches do banco atual — 15 duplicatas intra-onda entre fontes independentes (evidências fundidas na cópia integrada) → 15 pares em `corroboration.json`; 0 matches contra o banco das 954; aliases.json segue vazio (nenhuma colisão)
  - [x] Banco: 954 → 1.316 (answer_short 10 → 378 · rts 27 → 31); ids `<fonte>-<tipo>-NNN` (cand-22..28); manifesto regenerado; domínios normalizados sem `www.`
  - Gates: 0 duplicatas ≥ 0,85 pós-integração (baseline re-scan 1.316 itens: 0 pares) ✓ · todo item novo com evidência C1–C4 ✓ · bank-integrity estendido ao catálogo da varredura, 10/10 ✓ · selos recalculados (report.json: 1.316) ✓ · chunk ≤ 250 KB (máx. 222 KB manifest) ✓ · vitest 319/319 · tsgo limpo · build OK · lint 0 erros (9 warnings pré-existentes) · zero deps de runtime novas · status: docs/planning/stages/stage-p2-02-status.md

- [x] Fase 3 (P1) — Tipos P1 (mesmo ciclo da Fase 2, prioridade reavaliada pelo déficit)
  - [x] Extrair → validar (C1–C4 + faixas) → dedupe contra 1.316 + intra-onda → integrar — 149 candidatos (goarno retell 50 · goarno dropdown 29 · goarno mcq 50 · edknot dropdown 12 · ptehelper SWT 3 · pteprep reorder 5); 149 válidos, 0 rejeitados; 1 pulado honesto (dropdown goarno com < 3 opções)
  - [x] Corroboração: 94 pares registrados (goarno.io 79 — 50 MCQ e 29 dropdown idênticos ao banco · ptesprinters 14 · sumlingo 1); aliases.json segue vazio
  - [x] Banco: 1.316 → 1.386 (retell_lecture 12→62 · read_fib_dropdown 29→41 · swt 50→53 · reorder_paragraphs 45→50 · read_mcq_single 50→50 por corroboração); manifesto regenerado; selos recalculados
  - Gates: 0 duplicatas ≥ 0,85 pós-integração (re-scan 1.386: 0 pares) ✓ · evidência C1–C4 ✓ · bank-integrity 10/10 ✓ · chunk 229 KB ≤ 250 KB ✓ · vitest 319/319 · tsgo limpo · build OK · lint 0 erros (9 warnings pré-existentes) · zero deps novas · status: docs/planning/stages/stage-p2-03-status.md

- [x] Fase 4 (P1) — Tipos P2/P3 (volume alto; wfd/repeat_sentence só itens 100% novos pós-dedupe)
  - [x] Gates de fonte da onda 3: 34 candidatas (lotes 07–09) → 22 aprovadas (incl. britfort/Pearson C4 → verificada) + 12 reprovadas com motivo (Ap. E em `sources-sweep.json`)
  - [x] Extração → normalizar → validar → dedupe → integrar: 1.716 candidatos · 1.716 válidos · 1.437 integrados · 279 corroborados (+264 pares → 373) · skips honestos (25 truncados OnePTE; SST do prediction gurully sem gabarito)
  - [x] Banco: 1.386 → 2.823 (wfd 48→551 · repeat_sentence 49→682 · read_aloud 50→340 · sst 50→58 · lst_fib 50→53); manifesto regenerado; selos recalculados
  - [x] Chunks: repeat_sentence 261 KB → 2 partes (131+130 KB, loader concatena); allMeta fora do manifesto (all-meta-1/2, 238/216 KB); teste chunk-budget (29 testes) + idempotência do build-manifest (incidente de contagem corrigido)
  - Gates: idênticos à Fase 2 + comprovação de dedupe contra ondas anteriores (banco atual inclui ondas 1–2; re-scan Jaccard 2.823: 0 pares ≥ 0,85) ✓ · chunk ≤ 250 KB ✓ · vitest 348/348 (+29 chunk-budget) ✓ · tsgo limpo ✓ · build OK ✓ · lint 0 erros (9 warnings pré-existentes) ✓ · zero deps novas ✓ · status: docs/planning/stages/stage-p2-04-status.md ✓ · monitor notificado ✓

- [ ] Fase 5 (P0) — Corroboração global e re-avaliação de fontes
  - [ ] Matriz completa incluindo as 7 fontes do projeto 1; recálculo de tiers (promover/rebaixar com motivo); fechamento da pendência de corroboração do projeto 1
  - Gates: nenhuma fonte sem decisão · mudanças de tier justificadas em `sources-sweep.json` · vitest inclui regra "corroborada exige ≥ 2 fontes independentes"

- [ ] Fase 6 (P0, fim) — Fechamento
  - [ ] Relatório final (cobertura × meta antes/depois, corroboração, esgotamentos) · testes de integridade estendidos (§14) · checagem 5 min / 10 tentativas
  - [ ] Monitor: veredito final "remix finalizado (+N da etapa do roadmap que foi efetuada)"
  - Gates: gates globais verdes · relatório copiado para o roadmap · console/preview limpos nas telas afetadas (selos/contagens)

Regras: 100% localStorage; sem IA gerando banco; uso local e pessoal (sem redistribuição); números sempre derivados do manifesto; funções/scripts puros com testes antes de integrar; subagentes read-only em lotes para coleta.
