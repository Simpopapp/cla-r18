# Stage 03 — status

**Data:** 2026-10-17
**Fase:** 3 (P0) — Catálogo, hub e shell de prática
**Veredito do builder:** concluída

## O que foi entregue

- **`src/lib/pte/manifest.ts`** — fonte única dos números (§5.2/§15): `TOTAL_ALL_QUESTIONS`, `TYPE_COUNT`, `countByType`, `sectionCounts`, `TYPE_META`, `isSmallBank` (deriva de `BANK_TARGETS`), `notReadyReason`, `typesBySection`, `typeOfQuestion`/`wordsOf` (mapa por id) e `loaders` com import dinâmico ×22 (chunk sob demanda). Aliases de dedupe religados via `setQidResolver`.
- **`src/lib/pte/catalog.ts`** — caches por tipo/seção, `loadQuestion` por id, query options (TanStack Query), `pickNext` (vencida → nunca tentada → menos recente), `neighborsOf`, `seededShuffle` (mulberry32, semente = id — SSR estável) e `questionSearchText` que só indexa campos visíveis (nunca gabarito).
- **Rotas** — home com números derivados do manifesto; 4 `SectionPage` (cards por tipo com contagem/tentadas/vencidas/selos + lista com busca, filtros de status SRS e proveniência, paginação 50 "Mostrar mais"); `/practice` com `?q=` (abre por id) e `?type=` (abre a próxima da fila do tipo), TypeChooser quando sem parâmetros; `/settings` completo (Prática, Prova, Banco, Dados/backup, Offline+Plus "em breve", Privacidade/voz com copy honesta da §15).
- **Shell de prática** — `PracticeShell` (proveniência, `DueNotice`, status SRS, cronômetro prep→resposta com aria-live enxuto, ★ com aria-pressed, notas com debounce 400 ms e indicador "salva", navegação fixa em footer, atalhos ←/→/J/K/B/N/?/Esc ignorados em campos de texto), `ScorePanel` base (nota 0–100 + subscores "não avaliado"), `PracticeContent` (prévia por tipo que oculta transcrições/respostas — os motores das Fases 4–5 preenchem interação e correção), `useSpeechSynthesis` (suporte derivado em efeito; `pickVoice` por sotaque; `voiceUsed`), `TtsVoiceNote` (mostra a voz usada; avisa quando não há voz em inglês).
- **Testes** — `src/test/catalog.test.ts` (11 testes: manifesto fecha entre si, selo segue meta mínima, ordem da fila, shuffle determinístico/permutação, busca sem gabarito).

## Gates (números reais)

- vitest **77/77** (66 + 11 novos) · tsgo limpo · build OK · lint **0 erros** (7 warnings pré-existentes)
- Playwright :8080 — 22 tipos listados (seções + TypeChooser); import com prévia/mesclar/substituir/desfazer (export → import → aplicar → desfazer → zerar, todos verificados); atalhos e notas persistem após reload (localStorage conferido); console limpo, sem erro de hidratação; 390×844 sem overflow em /, /speaking, /practice?type=wfd, /settings; zero deps de runtime novas.
- Chunk do manifesto: 168 KB (≤ 250 KB do gate da Fase 2).

## Decisões registradas (PRD §20)

1. **Prévia em vez de motores vazios** (Fase 3): `/practice` renderiza o conteúdo pré-resposta (prompt, opções, imagem, passagem com lacunas, reorder embaralhado) e oculta todo gabarito; banner honesto "Prévia de estudo — responder e corrigir chegam com os motores". O dispatcher escolhe o conteúdo por tipo; os motores A–D se encaixam dentro do mesmo shell nas Fases 4–5.
2. **`/practice` sem parâmetros** abre TypeChooser (a fila global do dia chega na Fase 6 com a camada de sessões).
3. **`notReadyTypes` vazio hoje** — nenhum tipo sem banco; a superfície "em breve" existe e é testável por dados (`TYPE_META.ready`).
4. **`isSmallBank` deriva de `BANK_TARGETS`** (fonte única), não do campo `small` do manifesto JSON (evita duas fontes de verdade).
5. tsconfig ganhou `resolveJsonModule: true` (imports do banco/manifesto em SSR e testes).

## Pendências honestas

- Prévia sem interação: responder/corrigir/auto-submit são das Fases 4–5 (por design).
- `onlyVerified` (Ajustes) não filtra ainda a lista da `SectionPage` — o filtro da lista usa proveniência manual; conectar o toggle à lista na Fase 4 junto com os motores.
- Cronômetro não faz auto-submit (motores decidem; Fase 4).
