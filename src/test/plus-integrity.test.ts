// Pack studie-plus — integridade dos dados gerados (PRD §13.2/§13.4).
// Os JSONs em src/data/plus/ são gerados por scripts/plus/merge-*.mjs; estes
// testes garantem que apontam para o banco nativo sem tradução órfã ou errada.

import { describe, expect, it } from "vitest";

import { eligibleFields } from "@/lib/plus/plusAudio";
import { hashSentence } from "@/lib/plus/phrases";
import { splitSentences } from "@/lib/plus/sentences";
import { TASK_TYPES, type TaskType } from "@/lib/pte/types";
import manifestJson from "@/data/pte/manifest.json";

import glossaryJson from "@/data/plus/glossary.json";
import writeEssayPhrases from "@/data/plus/phrases/write_essay.json";
import swtPhrases from "@/data/plus/phrases/swt.json";
import answerShortPhrases from "@/data/plus/phrases/answer_short.json";
import writeEssayBank from "@/data/pte/write_essay.json";
import swtBank from "@/data/pte/swt.json";

type PhrasesFile = Record<string, Record<string, { h: string; l: string; c: string }[]>>;
interface BankItem {
  id: string;
  data: Record<string, string | string[]>;
}

const GLOSSARY = glossaryJson as Record<string, { literal?: string; contextual?: string }>;

describe("plus data integrity", () => {
  it("glossário tem entradas reais com chaves válidas", () => {
    const keys = Object.keys(GLOSSARY);
    expect(keys.length).toBeGreaterThanOrEqual(1000);
    for (const [key, entry] of Object.entries(GLOSSARY)) {
      expect(key).toMatch(/^[a-z]+(-[a-z]+)*$/);
      expect(entry.literal).toBeTruthy();
      expect(entry.literal!.length).toBeLessThanOrEqual(120);
      expect(entry.literal!.toLowerCase()).not.toBe(key);
    }
  });

  it("glossário cobre palavras frequentes do banco", () => {
    for (const word of ["ability", "about", "people", "government", "students"]) {
      expect(GLOSSARY[word]).toBeDefined();
    }
  });

  it.each([
    ["write_essay", writeEssayPhrases as PhrasesFile, writeEssayBank as unknown as BankItem[]],
    ["swt", swtPhrases as PhrasesFile, swtBank as unknown as BankItem[]],
  ])("%s: frases apontam para o banco e hashes batem", (type, phrases, bank) => {
    const bankById = new Map(bank.map((q) => [q.id, q]));
    const eligible = new Set(eligibleFields(type as TaskType).map((f) => f.field));
    const qids = Object.keys(phrases);
    expect(qids.length).toBeGreaterThan(0);

    let total = 0;
    for (const [qid, fields] of Object.entries(phrases)) {
      const item = bankById.get(qid);
      expect(item, `qid órfão: ${qid}`).toBeDefined();
      for (const [field, entries] of Object.entries(fields)) {
        // campo elegível na matriz (nunca campo fora do pack)
        expect(eligible.has(field), `campo não elegível: ${type}.${field}`).toBe(true);
        const source = item!.data[field] as string | string[] | undefined;
        expect(source, `campo ausente no banco: ${qid}.${field}`).toBeTruthy();
        const text = typeof source === "string" ? source : (source ?? []).join(" ");
        const sentences = splitSentences(text);

        expect(entries.length).toBeLessThanOrEqual(sentences.length);
        for (const [index, entry] of entries.entries()) {
          expect(sentences[index], `índice fora do banco: ${qid}.${field}[${index}]`).toBeDefined();
          if (entry === null) continue; // frase sem tradução — estado honesto
          expect(entry.h).toBe(hashSentence(sentences[index]!));
          expect(entry.l.length).toBeGreaterThan(0);
          expect(entry.l.length).toBeLessThanOrEqual(400);
          expect(entry.c.length).toBeLessThanOrEqual(200);
          total++;
        }
      }
    }
    expect(total).toBeGreaterThan(0);
  });

  it("nenhum campo com gabarito recebe dados de frase (vazamento impossível)", () => {
    // answer_short answers e wfd sentence são pós-resposta: só entram via
    // policy (post) — e nenhum arquivo de frases deve carregar campo 'answers'
    const answerShort = answerShortPhrases as PhrasesFile;
    for (const fields of Object.values(answerShort)) {
      expect(fields["answers"]).toBeUndefined();
    }

    expect(TASK_TYPES.length).toBe(22);
    // o manifesto não conhece o pack — contagens independentes
    expect(Object.keys(manifestJson as unknown as Record<string, unknown>).length).toBeGreaterThan(
      0,
    );
  });
});
