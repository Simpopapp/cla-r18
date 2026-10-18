// ===== extract-pearson-edknot — sgd/rts (PDF oficial Pearson) + retell_lecture (edknot) =====
// Saída: .opencode/work/bank/extracted/{sgd,rts,retell_lecture}.json
// Uso: node scripts/bank/extract-pearson-edknot.mjs
import { WORK, RAW, writeJson, makeId, readJson } from "./lib.mjs";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

const PEARSON_TXT = "/tmp/bank-raw/new-speaking-questions.txt";
const PEARSON_URL =
  "https://www.pearsonpte.com/content/dam/ELL/pte/pearsonpte/pdfs/pte-academic-pdfs/example-speaking-questions.zip";
const PEARSON_NOTE =
  "Pearson PTE Academic — example speaking questions (30 por tipo novo, 2025), acesso 2026-10-17";

function cleanLines(text) {
  const lines = text.split("\n").map((l) => l.replace(/\s+$/, "").replace(/^ +/, ""));
  return lines;
}

// ---- SGD + RTS do PDF oficial ----
if (existsSync(PEARSON_TXT)) {
  const lines = cleanLines(readFileSync(PEARSON_TXT, "utf8"));
  const blocks = [];
  let cur = null;
  for (const l of lines) {
    const m = l.match(
      /^Question\s*(\d+)\s*-\s*(Summarize Group Discussion|Respond to a Situation)\s*$/,
    );
    if (m) {
      if (cur) blocks.push(cur);
      cur = { n: Number(m[1]), kind: m[2], lines: [] };
    } else if (cur) cur.lines.push(l);
  }
  if (cur) blocks.push(cur);

  const sgd = [],
    rts = [];
  for (const b of blocks) {
    const joined = b.lines;
    if (b.kind === "Summarize Group Discussion") {
      const tIdx = joined.findIndex((l) => /Transcription of the audio:/i.test(l));
      if (tIdx < 0) continue;
      const turns = [];
      let scene = null;
      for (let i = tIdx + 1; i < joined.length; i++) {
        const l = joined[i];
        if (/^Question\s*\d+/i.test(l)) break;
        if (l.trim() === "") continue;
        const sp = l.match(/^Speaker\s*(\d+)\s*:\s*(.*)$/);
        if (sp) {
          let text = sp[2];
          // linhas seguintes sem "Speaker N:" pertencem ao mesmo turno
          let j = i + 1;
          while (
            j < joined.length &&
            !/^Speaker\s*\d+\s*:/i.test(joined[j]) &&
            !/^Question\s*\d+/i.test(joined[j]) &&
            joined[j].trim() !== ""
          ) {
            text += " " + joined[j].trim();
            j++;
          }
          i = j - 1;
          turns.push({ speaker: `Speaker ${sp[1]}`, text: text.trim() });
        } else if (turns.length === 0) {
          scene = (scene ? scene + " " : "") + l.trim();
        }
      }
      if (turns.length < 4) continue;
      const finalTurns = scene ? [{ speaker: "Narrator", text: scene }, ...turns] : turns;
      const allText = finalTurns.map((t) => t.text).join(" ");
      const STOP = new Set(
        "the a an of to and in that is are was was were for with on as by this it their its from be has have had not or at which can may like really i we you they".split(
          " ",
        ),
      );
      const words = allText
        .toLowerCase()
        .replace(/[^a-z'\s-]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 3 && !STOP.has(w));
      const freq = new Map();
      for (const w of words) freq.set(w, (freq.get(w) ?? 0) + 1);
      const keywords = [...freq.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([w]) => w);
      sgd.push({
        id: makeId("pearson", "sgd", b.n),
        type: "sgd",
        source: { domain: "pearsonpte.com", url: PEARSON_URL, attribution: PEARSON_NOTE },
        provenance: "verificada",
        data: { turns: finalTurns, keywords },
      });
    } else {
      const pIdx = joined.findIndex((l) => /Prompt and Transcript:/i.test(l));
      if (pIdx < 0) continue;
      const scenarioLines = [];
      for (let i = pIdx + 1; i < joined.length; i++) {
        if (/^Question\s*\d+/i.test(joined[i])) break;
        if (joined[i].trim() === "") continue;
        scenarioLines.push(joined[i].trim());
      }
      const scenario = scenarioLines.join(" ").trim();
      if (scenario.split(/\s+/).filter(Boolean).length < 15) continue;
      rts.push({
        id: makeId("pearson", "rts", b.n),
        type: "rts",
        source: { domain: "pearsonpte.com", url: PEARSON_URL, attribution: PEARSON_NOTE },
        provenance: "verificada",
        data: { scenario },
      });
    }
  }
  writeJson(path.join(WORK, "extracted", "sgd.json"), sgd);
  writeJson(path.join(WORK, "extracted", "rts.json"), rts);
  console.log(`sgd (pearson): ${sgd.length} · rts (pearson): ${rts.length}`);
}

// ---- retell_lecture: edknot ----
{
  const p = path.join(RAW, "edknot-retell.html");
  if (existsSync(p)) {
    let h = readFileSync(p, "utf8")
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "");
    h = h
      .replace(/<[^>]+>/g, "\n")
      .replace(/&nbsp;/g, " ")
      .replace(/&/g, "&")
      .replace(/"/g, '"')
      .replace(/&#x27;|&#39;|'/g, "'")
      .replace(/&rsquo;/g, "’")
      .replace(/&ldquo;|&rdquo;/g, "”")
      .replace(/>/g, ">")
      .replace(/</g, "<");
    const lines = h
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    const items = [];
    for (let i = 0; i < lines.length; i++) {
      if (!/^\d+$/.test(lines[i])) continue;
      const n = Number(lines[i]);
      const title = lines[i + 1] ?? "";
      if (!lines[i + 2]?.match(/^\d+$/) || (lines[i + 3] ?? "").toLowerCase() !== "words") continue;
      // transcrição: linhas até "Model retelling ·"
      const mIdx = lines.findIndex((l, k) => k > i && /Model retelling\s*·/.test(l));
      if (mIdx < 0 || mIdx > i + 10) continue;
      const transcript = lines
        .slice(i + 4, mIdx)
        .join(" ")
        .trim();
      const sample = lines
        .slice(mIdx + 1)
        .join(" ")
        .split(/Listen and retell|How it is scored/)[0]
        .trim();
      if (
        transcript.split(/\s+/).filter(Boolean).length < 60 ||
        sample.split(/\s+/).filter(Boolean).length < 40
      )
        continue;
      const STOP = new Set(
        "the a an of to and in that is are was were for with on as by this it their its from be has have had not or at which can may".split(
          " ",
        ),
      );
      const words = sample
        .toLowerCase()
        .replace(/[^a-z'\s-]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 3 && !STOP.has(w));
      const freq = new Map();
      for (const w of words) freq.set(w, (freq.get(w) ?? 0) + 1);
      const keywords = [...freq.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([w]) => w);
      items.push({
        id: makeId("edknot", "retell_lecture", n),
        type: "retell_lecture",
        topic: title,
        source: {
          domain: "edknot.com",
          url: "https://www.edknot.com/pte-practice/retell-lecture",
          attribution: "EdKnot — Retell Lecture bank (12 itens), acesso 2026-10-17",
        },
        provenance: "comunitaria",
        data: { transcript, keywords, sample },
      });
    }
    writeJson(path.join(WORK, "extracted", "retell_lecture.json"), items);
    console.log(`retell_lecture (edknot): ${items.length}`);
  }
}

// registra fontes (sem duplicar)
const sp = path.join(WORK, "sources.json");
const sources = readJson(sp, { sources: [] });
const add = [
  {
    id: "pearson",
    domain: "pearsonpte.com",
    url: PEARSON_URL,
    name: "Pearson — Example Speaking Questions 2025 (oficial)",
    types: ["sgd", "rts"],
    volume: "30 itens por tipo (texto + transcrição no PDF oficial)",
    evidence:
      "ZIP oficial da Pearson (página partners-and-teachers), 200 OK sem login; PDF com pergunta + transcrição por item; amostra manual de 6 itens; formato oficial confirmado",
    confidence: 95,
    status: "aprovada",
    provenance: "verificada",
    license: "© Pearson — material oficial; uso local e pessoal, sem redistribuição",
    notes:
      "Áudio oficial não incluído no banco (app usa TTS). Sample answers oficiais em áudio, não integradas.",
    checkedAt: "2026-10-17",
  },
  {
    id: "edknot-retell",
    domain: "edknot.com",
    url: "https://www.edknot.com/pte-practice/retell-lecture",
    name: "EdKnot — Retell Lecture (12 itens)",
    types: ["retell_lecture"],
    volume: "12 itens com transcrição + retelling-modelo",
    evidence:
      "Página pública 200 OK sem login (cache 2026-10-17); amostra manual de 4 itens; transcrições com pequenos artefatos de digitação registrados",
    confidence: 65,
    status: "aprovada",
    provenance: "comunitaria",
    license: "sem licença de reuso declarada; uso local e pessoal",
    notes: "Banco pequeno (mín. 40) — selo 'banco pequeno'.",
    checkedAt: "2026-10-17",
  },
];
const ids = new Set(sources.sources.map((s) => s.id));
for (const s of add) if (!ids.has(s.id)) sources.sources.push(s);
writeJson(sp, sources);
console.log("sources.json atualizado");
