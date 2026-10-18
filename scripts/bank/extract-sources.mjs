// ===== extract-sources.mjs — stormedugo (read_aloud), band9 + languageacademy (write_essay), edknot (answer_short) =====
// Saída: .opencode/work/bank/extracted/<tipo>.json (acrescenta aos itens do goarno).
// Uso: node scripts/bank/extract-sources.mjs
import { TASK_TYPES, WORK, RAW, writeJson, makeId, readJson } from "./lib.mjs";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

function cleanLines(html) {
  let h = html.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "");
  h = h
    .replace(/<[^>]+>/g, "\n")
    .replace(/&nbsp;/g, " ")
    .replace(/&/g, "&")
    .replace(/"/g, '"')
    .replace(/&#x27;|&#39;|'/g, "'")
    .replace(/&rsquo;/g, "’")
    .replace(/&lsquo;/g, "‘")
    .replace(/&ldquo;|&rdquo;/g, "”")
    .replace(/&mdash;/g, "—")
    .replace(/&hellip;/g, "…")
    .replace(/>/g, ">")
    .replace(/</g, "<");
  return h
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}
function load(f) {
  const p = path.join(RAW, f);
  if (!existsSync(p)) return null;
  return cleanLines(readFileSync(p, "utf8"));
}

const sources = readJson(path.join(WORK, "sources.json"), { sources: [] });

// ---- read_aloud: stormedugo ----
{
  const lines = load(
    "www.stormedugo.com_blog_most-important-read-aloud-passages-for-pte-academic-2025",
  );
  if (lines) {
    const starts = [];
    lines.forEach((l, i) => {
      if (/^\d+\.\s/.test(l)) starts.push(i);
    });
    const items = [];
    for (let s = 0; s < starts.length; s++) {
      const end = s + 1 < starts.length ? starts[s + 1] : lines.length;
      let chunk = lines.slice(starts[s] + 1, end);
      const tipIdx = chunk.findIndex((l) => /💡|Final Tips|Your Views/i.test(l));
      if (tipIdx >= 0) chunk = chunk.slice(0, tipIdx);
      const text = chunk.join(" ").trim();
      if (text.split(/\s+/).filter(Boolean).length < 20) continue;
      items.push({
        id: makeId("stormedugo", "read_aloud", items.length + 1),
        type: "read_aloud",
        topic: lines[starts[s]].replace(/^\d+\.\s*/, ""),
        source: {
          domain: "stormedugo.com",
          url: "https://www.stormedugo.com/blog/most-important-read-aloud-passages-for-pte-academic-2025",
          attribution: "Storm EduGo — Read Aloud passages, acesso 2026-10-17",
        },
        provenance: "comunitaria",
        data: { text },
      });
    }
    writeJson(path.join(WORK, "extracted", "read_aloud.json"), items);
    console.log(`read_aloud (stormedugo): ${items.length}`);
    sources.sources.push({
      id: "stormedugo",
      domain: "stormedugo.com",
      url: "https://www.stormedugo.com/blog/most-important-read-aloud-passages-for-pte-academic-2025",
      name: "Storm EduGo — Read Aloud passages 2025",
      types: ["read_aloud"],
      volume: `${items.length} passagens`,
      evidence:
        "Página pública 200 OK sem login (cache 2026-10-17); 50 itens numerados com texto completo; amostra manual de 12 itens; formato fiel (25–120 palavras em maioria)",
      confidence: 68,
      status: "aprovada",
      provenance: "comunitaria",
      license: "sem licença de reuso declarada; uso local e pessoal",
      notes:
        "Site chama de 'repeated' sem prova; nenhum cruzamento ainda. Alguns itens fora da faixa 25–120 vão para revisão.",
      checkedAt: "2026-10-17",
    });
  }
}

// ---- write_essay: band9pte (com sample) ----
{
  const lines = load("band9pte.com.au_pte-essay-topics.html");
  if (lines) {
    const items = [];
    for (let i = 0; i < lines.length; i++) {
      if (lines[i] !== "Essay Question") continue;
      // prompt: linhas até "📝 Sample Essay"
      let j = i + 1;
      const promptLines = [];
      while (j < lines.length && !/Sample Essay/.test(lines[j])) {
        promptLines.push(lines[j]);
        j++;
      }
      if (!/Sample Essay/.test(lines[j] ?? "")) continue;
      const prompt = promptLines.join(" ").trim();
      if (prompt.split(/\s+/).filter(Boolean).length < 10) continue;
      // sample: linhas até "📖 Vocabulary" | "Why this scores high" | "Essay Question"
      let k = j + 1;
      while (
        k < lines.length &&
        !/Technological|^To |^In |^The |^[A-Z]/.test(lines[k]) &&
        k < j + 6
      )
        k++; // pula cabeçalhos 📖 🎯 🔗
      const sampleLines = [];
      while (
        k < lines.length &&
        lines[k] !== "Why this scores high" &&
        lines[k] !== "Essay Question"
      ) {
        sampleLines.push(lines[k]);
        k++;
      }
      const sample = sampleLines.join("\n\n").trim();
      items.push({
        id: makeId("band9", "write_essay", items.length + 1),
        type: "write_essay",
        source: {
          domain: "band9pte.com.au",
          url: "https://band9pte.com.au/pte-essay-topics.html",
          attribution: "Band9PTE — essay topics, acesso 2026-10-17",
        },
        provenance: "comunitaria",
        data: sample.length > 200 ? { prompt, sample } : { prompt },
      });
    }
    writeJson(path.join(WORK, "extracted", "write_essay.json"), items);
    console.log(
      `write_essay (band9): ${items.length} (com sample: ${items.filter((x) => x.data.sample).length})`,
    );
    sources.sources.push({
      id: "band9",
      domain: "band9pte.com.au",
      url: "https://band9pte.com.au/pte-essay-topics.html",
      name: "Band9PTE — 43 essay topics com Band 9 samples",
      types: ["write_essay"],
      volume: `${items.length} tópicos`,
      evidence:
        "Página pública 200 OK sem login (cache 2026-10-17); cada tópico com redação-modelo completa; amostra manual de 3 redações; formato fiel (prompt 15–120 palavras)",
      confidence: 66,
      status: "aprovada",
      provenance: "comunitaria",
      license: "sem licença de reuso declarada; uso local e pessoal",
      notes:
        "Site promove IA de correção; tópicos alegam 'real exam reports' sem prova independente.",
      checkedAt: "2026-10-17",
    });
  }
}

// ---- write_essay: languageacademy (prompts; 5 samples nomeados) ----
{
  const lines = load(
    "www.languageacademy.com.au_blog_50-most-repeated-questions-with-sample-answers",
  );
  if (lines) {
    const items = [];
    for (const l of lines) {
      if (!l.endsWith("?")) continue;
      if (l.split(/\s+/).length < 10 || l.split(/\s+/).length > 120) continue;
      // filtra linhas de UI
      if (/sign|login|course|coach|score|practice/i.test(l)) continue;
      items.push({
        id: makeId("langacad", "write_essay", items.length + 1),
        type: "write_essay",
        source: {
          domain: "languageacademy.com.au",
          url: "https://www.languageacademy.com.au/blog/50-most-repeated-questions-with-sample-answers/",
          attribution: "Language Academy — 50 essay topics, acesso 2026-10-17",
        },
        provenance: "comunitaria",
        data: { prompt: l },
      });
    }
    // mesclar com band9 (mesmo tipo) — languageacademy entra depois
    const band9Path = path.join(WORK, "extracted", "write_essay.json");
    const band9 = existsSync(band9Path) ? JSON.parse(readFileSync(band9Path, "utf8")) : [];
    // dedupe por prompt normalizado
    const seen = new Set(
      band9.map((q) =>
        q.data.prompt
          .toLowerCase()
          .replace(/[^a-z ]/g, "")
          .replace(/\s+/g, " ")
          .trim(),
      ),
    );
    const extra = items.filter((q) => {
      const k = q.data.prompt
        .toLowerCase()
        .replace(/[^a-z ]/g, "")
        .replace(/\s+/g, " ")
        .trim();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    writeJson(band9Path, [...band9, ...extra]);
    console.log(`write_essay (languageacademy): ${items.length} → +${extra.length} novos`);
    sources.sources.push({
      id: "langacad",
      domain: "languageacademy.com.au",
      url: "https://www.languageacademy.com.au/blog/50-most-repeated-questions-with-sample-answers/",
      name: "Language Academy — 50 essay topics",
      types: ["write_essay"],
      volume: "50 tópicos (5 com redação-modelo)",
      evidence:
        "Página pública 200 OK sem login (cache 2026-10-17); tópicos por categoria; amostra manual de 10; só tópicos completos integrados",
      confidence: 62,
      status: "aprovada",
      provenance: "comunitaria",
      license: "sem licença de reuso declarada; uso local e pessoal",
      notes:
        "Redações-modelo só para 5 tópicos (vinculados por nome, não integrados automaticamente).",
      checkedAt: "2026-10-17",
    });
  }
}

// ---- answer_short: edknot ----
{
  const lines = load("www.edknot.com_pte-practice_answer-short-question");
  if (lines) {
    const items = [];
    for (let i = 0; i < lines.length; i++) {
      if (!/^\d+$/.test(lines[i])) continue;
      const question = lines[i + 1] ?? "";
      const ansIdx = lines.findIndex((l, n) => n > i && /^Answer\s*·/.test(l));
      if (ansIdx < 0 || ansIdx > i + 4) continue;
      const answers = (lines[ansIdx + 1] ?? "")
        .split(/\s*\/\s*/)
        .map((a) => a.trim())
        .filter(Boolean);
      if (!question.endsWith("?") || answers.length === 0) continue;
      items.push({
        id: makeId("edknot", "answer_short", items.length + 1),
        type: "answer_short",
        source: {
          domain: "edknot.com",
          url: "https://www.edknot.com/pte-practice/answer-short-question",
          attribution: "EdKnot — Answer Short Question bank, acesso 2026-10-17",
        },
        provenance: "comunitaria",
        data: { question, answers },
      });
    }
    writeJson(path.join(WORK, "extracted", "answer_short.json"), items);
    console.log(`answer_short (edknot): ${items.length}`);
    sources.sources.push({
      id: "edknot",
      domain: "edknot.com",
      url: "https://www.edknot.com/pte-practice/answer-short-question",
      name: "EdKnot — Answer Short Question (20 itens)",
      types: ["answer_short"],
      volume: `${items.length} itens`,
      evidence:
        "Página pública 200 OK sem login (cache 2026-10-17); respostas no texto; amostra manual de 5; itens curtos e coerentes",
      confidence: 65,
      status: "aprovada",
      provenance: "comunitaria",
      license: "sem licença de reuso declarada; uso local e pessoal",
      notes: "Banco pequeno (mín. 80) — selo 'banco pequeno'.",
      checkedAt: "2026-10-17",
    });
  }
}

writeJson(path.join(WORK, "sources.json"), sources);
console.log("sources.json atualizado");
