import { describe, expect, it } from "vitest";
import { allMeta } from "@/lib/pte/manifest";
import { EXAM_BLUEPRINT, EXAM_PARTS } from "@/lib/pte/skillMatrix";
import {
  armExamItem,
  buildExamQueue,
  claimExamAudio,
  EXAM_AUDIO_PROMPTS,
  examPromptWaits,
  examSummary,
  examTiming,
  finishExam,
  startExam,
  submitExamItem,
} from "@/lib/pte/exam";
import { emptyState, MAX_ATTEMPT_LOG, startSession } from "@/lib/storage";

const NOW = 1_800_000_000_000;
describe("simulado fiel", () => {
  it("full usa o blueprint de 65 questões sem repetição", () => {
    const queue = buildExamQueue(allMeta, "full", false, "a");
    expect(queue.ids).toHaveLength(65);
    expect(new Set(queue.ids).size).toBe(65);
    expect(queue.omissions).toEqual([]);
    for (const [type, row] of Object.entries(EXAM_BLUEPRINT))
      expect(
        queue.ids.filter((id) => allMeta.find((m) => m.id === id)?.type === type),
      ).toHaveLength(row.count);
  });
  it("mini tem uma questão de cada um dos 22 tipos, em ordem de parte", () => {
    const queue = buildExamQueue(allMeta, "mini", false, "a");
    expect(queue.ids).toHaveLength(22);
    expect(queue.ids.map((id) => allMeta.find((m) => m.id === id)?.type)).toEqual(
      EXAM_PARTS.flatMap((p) => p.types),
    );
  });
  it("parte reading contém só os 15 itens de leitura", () => {
    const queue = buildExamQueue(allMeta, "reading", false, "a");
    expect(queue.ids).toHaveLength(15);
    expect(queue.ids.every((id) => allMeta.find((m) => m.id === id)?.section === "reading")).toBe(
      true,
    );
  });
  it("somente verificadas respeita estoque e informa omissões", () => {
    const queue = buildExamQueue(allMeta, "full", true, "a");
    expect(
      queue.ids.every((id) => allMeta.find((m) => m.id === id)?.provenance === "verificada"),
    ).toBe(true);
    expect(queue.omissions.reduce((sum, o) => sum + o.missing, 0) + queue.ids.length).toBe(65);
    expect(queue.omissions.find((o) => o.type === "repeat_sentence")?.missing).toBe(10);
  });
  it("não substitui sessão de estudo em andamento", () => {
    const s = startSession(emptyState(), "mixed", ["old"], NOW);
    expect(startExam(s, ["q"], "mini", NOW)).toBe(s);
  });
  it("prazo persiste após reload e não reinicia", () => {
    const s = armExamItem(startExam(emptyState(), ["q"], "mini", NOW), "q", "read_aloud", NOW);
    expect(s.draft?.exam?.deadline).toBe(NOW + 75_000);
    const reload = JSON.parse(JSON.stringify(s)) as typeof s;
    expect(armExamItem(reload, "q", "read_aloud", NOW + 20_000).draft?.exam?.deadline).toBe(
      NOW + 75_000,
    );
  });
  it("áudio continua consumido após reload mesmo com replay habilitado", () => {
    const s = claimExamAudio(startExam(emptyState(), ["q"], "mini", NOW), "q");
    const reload = JSON.parse(JSON.stringify(s)) as typeof s;
    reload.settings.allowReplay = true;
    expect(claimExamAudio(reload, "q").draft?.exam?.played).toEqual(["q"]);
  });
  it("enunciado em áudio: 12 tipos esperam a reprodução; enunciado em texto não espera", () => {
    expect(EXAM_AUDIO_PROMPTS).toHaveLength(12);
    expect(new Set(EXAM_AUDIO_PROMPTS).size).toBe(EXAM_AUDIO_PROMPTS.length);
    const all = EXAM_PARTS.flatMap((p) => p.types);
    expect(all).toHaveLength(22);
    for (const type of all) expect(examPromptWaits(type)).toBe(EXAM_AUDIO_PROMPTS.includes(type));
    expect(examPromptWaits("read_aloud")).toBe(false);
    expect(examPromptWaits("describe_image")).toBe(false);
    expect(examPromptWaits("rts")).toBe(false);
  });
  it("em tipo de áudio o claim não arma o prazo; armar é passo separado após o fim do áudio", () => {
    const s = claimExamAudio(startExam(emptyState(), ["q"], "mini", NOW), "q");
    expect(s.draft?.exam?.deadline).toBeNull();
    const armed = armExamItem(s, "q", "repeat_sentence", NOW);
    expect(armed.draft?.exam?.deadline).toBe(NOW + examTiming("repeat_sentence").seconds * 1000);
  });
  it("envio é só para questão atual, sem voltar/refazer, e alimenta SRS com tag exame", () => {
    let s = startExam(emptyState(), ["q", "q2"], "mini", NOW);
    const answer = { qid: "q", type: "wfd" as const, score: 90, tags: [] };
    s = submitExamItem(s, answer, NOW, "a");
    expect(s.draft?.cursor).toBe(1);
    expect(s.questions["q"]?.box).toBe(1);
    expect(s.attempts[0]).toMatchObject({ mode: "exam", tags: ["exame"] });
    expect(submitExamItem(s, answer, NOW, "b")).toBe(s);
    expect(finishExam(s, NOW)).toBe(s);
  });
  it("resumo ignora sem nota e mantém resultados fora do log truncável", () => {
    let s = startExam(emptyState(), ["q", "q2"], "mini", NOW);
    s = submitExamItem(s, { qid: "q", type: "wfd", score: 100, tags: [] }, NOW, "a");
    s = submitExamItem(s, { qid: "q2", type: "wfd", score: null, tags: [] }, NOW, "b");
    s = finishExam(s, NOW + 1);
    expect(s.draft).toBeNull();
    s.attempts = Array.from({ length: MAX_ATTEMPT_LOG }, (_, i) => ({
      id: String(i),
      qid: "other",
      type: "wfd",
      score: 0,
      ts: NOW + i,
      mode: "practice",
    }));
    const summary = examSummary(s.sessions[0]?.exam?.scores ?? []);
    expect(summary.skills.find((v) => v.skill === "writing")).toMatchObject({
      estimate: 90,
      n: 1,
      confidence: "baixa",
    });
    expect(summary.unscored).toBe(1);
    expect(summary.types[0]?.average).toBe(100);
  });
});
