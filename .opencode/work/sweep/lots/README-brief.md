# Brief do subagente — varredura de fontes candidatas (Fase 1, PRD2 §5)

Objetivo: encontrar **fontes candidatas** (páginas/PDFs/repositórios públicos) com questões reais de PTE Academic para os tipos designados, e registrá-las COM EVIDÊNCIA num lote JSON.

## Saída obrigatória
Escreva o lote em: `.opencode/work/sweep/lots/sweep-lot-<NN>.json`
Formato (array JSON; schema validado por `scripts/sweep/sweep-scout.mjs`):

```json
[
  {
    "url": "https://…",
    "types": ["lst_hcs", "answer_short"],
    "apparentVolume": "ex.: ~40 itens de HCS visíveis na página (texto citado)",
    "positiveSignals": ["C2: página diz 'most repeated in real exams' (trecho citado)", "C3: site de preparo com gabarito e explicações"],
    "negativeSignals": ["respostas atrás de cadastro", "conteúdo gerado por IA, sem editor"],
    "quotes": ["trecho literal (≤ 25 palavras) que sustenta o sinal, com trecho do gabarito se visível"]
  }
]
```

Também escreva um log de queries tentadas (inclusive as que falharam): `.opencode/work/sweep/lots/sweep-lot-<NN>-queries.json` como
`[{ "query": "...", "tool": "websearch|fetch", "result": "0 resultados | 3 resultados | bloqueado | ok", "notes": "opcional" }]`

## Tipos válidos (use exatamente esses ids)
read_aloud, repeat_sentence, describe_image, retell_lecture, answer_short, sgd, rts, swt, write_essay, read_fib_dropdown, read_fib_drag, reorder_paragraphs, read_mcq_single, read_mcq_multi, lst_mcq_single, lst_mcq_multi, lst_fib, lst_hcs, lst_smw, lst_hiw, sst, wfd

## Queries de partida (adapte com o vocabulário real encontrado)
- Genéricas: `<tipo> real exam questions with answers` · `PTE <tipo> "most repeated"` · `PTE <tipo> prediction 2025 2026` · `PTE <tipo> memory based questions`
- Vocabulário que costuma render: "prediction file", "most repeated", "memory based", "exam recall", "questions with answers pdf"
- Canais: blogs de preparo (AU/IN/NP/PH), PDFs indexados (`filetype:pdf`), fóruns públicos (Reddit público, fóruns de estudo), repositórios públicos (GitHub — só com licença que permita reuso), páginas "essential questions" linkadas por fontes aprovadas.
- Descoberta em cadeia: links "part 2", índices e séries de páginas aprovadas também são candidatas — registre a origem no campo `positiveSignals` ("cadeia a partir de <url>").

## Critérios de autenticidade (C1–C4, PRD2 §1.4)
- **C1 corroboração:** o item circula em ≥ 2 fontes independentes. Se você vir o MESMO texto em 2 domínios claramente independentes, cite ambos nas evidências.
- **C2 menção de prova:** afirmação verificável de que caiu em exame ("memory-based recall", "most repeated with date/tráfego/reputação").
- **C3 curadoria editorial:** fonte de preparo estabelecida com gabarito + explicações + revisão humana.
- **C4 oficial:** Pearson/licenciado (raro fora de pearsonpte.com).

## Sinais negativos (reprovam)
Cadastro/e-mail obrigatório para ver gabarito · gabarito só via JS/pagamento · PDF sem texto selecionável · bloqueio de agente/403 · lista sem gabarito · re-empacotador de IA (site novo, sem autor, texto genérico) · domínios que copiam entre si do mesmo operador · copyright sem licença clara.

## Fontes JÁ CONHECIDAS (não re-cadastre; use-as só como trampolim de cadeia)
pearsonpte.com · ourworldindata.org · goarno.io (qualquer subpágina) · stormedugo.com · band9pte.com.au · languageacademy.com.au · edknot.com

## Regras de conduta
- 1 req/s ao mesmo host; respeite robots.txt; sem login, e-mail, pagamento ou burlar bloqueio (403/captcha = sinal negativo, anote e siga).
- Mínimo ~15 queries tentadas por tipo designado antes de concluir; esgotamento honesto vale ponto (registre no log de queries).
- Volume aparente: estime itens visíveis por tipo na página; se não der para ver itens (gabarito fechado), é sinal negativo.
- NÃO invente URLs ou conteúdo: só cadastre o que você efetivamente abendeu/leu, com trecho citado.
