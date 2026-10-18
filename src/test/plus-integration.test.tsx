// Pack studie-plus — superfícies de UI (PRD §13.1/§13.2).
// Componentes isolados do app real via mock do store global: pack desligado
// renderiza texto puro; recursos ligados revelam bolha/card; exame desabilita.

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mockSettings = vi.hoisted(() => ({
  current: {
    plus: { wordTranslation: false, phraseTranslation: false, plusAudio: false },
    modelRate: 1,
    accent: "en-US",
  },
}));

vi.mock("@/lib/useAppState", () => ({
  useAppState: () => ({ settings: mockSettings.current }),
}));

import { PlusPhraseCard } from "@/components/plus/PlusPhraseCard";
import { PlusSpeakButton } from "@/components/plus/PlusSpeakButton";
import { PlusText } from "@/components/plus/PlusText";
import { PlusWordText } from "@/components/plus/PlusWordText";
import { RtsEngine } from "@/components/practice/RtsEngine";
import { SwtEngine } from "@/components/practice/SwtEngine";
import { WriteEssayEngine } from "@/components/practice/WriteEssayEngine";
import type { Question } from "@/lib/pte/types";

afterEach(() => {
  cleanup();
  mockSettings.current.plus = {
    wordTranslation: false,
    phraseTranslation: false,
    plusAudio: false,
  };
});

describe("plus surfaces", () => {
  it("pack desligado → texto puro, zero mudança visual", () => {
    const { container } = render(
      <PlusWordText text="The ability to learn" type="write_essay" field="sample" phase="post" />,
    );
    expect(container.querySelectorAll("[data-plus-word]")).toHaveLength(0);
    expect(container.textContent).toBe("The ability to learn");
  });

  it("tradução por palavra: toque abre balão com o significado (sem áudio)", async () => {
    mockSettings.current.plus.wordTranslation = true;
    render(<PlusWordText text="The ability" type="write_essay" field="sample" phase="post" />);
    fireEvent.click(screen.getByRole("button", { name: "ability" }));
    expect(await screen.findByText("capacidade")).toBeDefined();
    expect(screen.queryByRole("button", { name: /pronunciar/i })).toBeNull();
  });

  it("balão fecha por toque fora e Esc", async () => {
    mockSettings.current.plus.wordTranslation = true;
    render(<PlusWordText text="The ability" type="write_essay" field="sample" phase="post" />);
    fireEvent.click(screen.getByRole("button", { name: "ability" }));
    await screen.findByRole("dialog");
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole("dialog")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "ability" }));
    await screen.findByRole("dialog");
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("tradução por frase: toque expande o card com a tradução", async () => {
    mockSettings.current.plus.phraseTranslation = true;
    render(
      <PlusPhraseCard
        sentence="In the future, people will work fewer hours than they do today."
        index={0}
        type="write_essay"
        field="prompt"
        phase="pre"
        wordBubbles={false}
        qid="band9-write_essay-001"
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /In the future/ }));
    const card = await screen.findByText(
      "No futuro, as pessoas trabalharão menos horas do que trabalham hoje.",
    );
    expect(card).toBeDefined();
  });

  it("origem mudada → card honesto, sem tradução errada", async () => {
    mockSettings.current.plus.phraseTranslation = true;
    render(
      <PlusPhraseCard
        sentence="This sentence never existed in the bank."
        index={0}
        type="write_essay"
        field="prompt"
        phase="pre"
        wordBubbles={false}
        qid="band9-write_essay-001"
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /This sentence/ }));
    await screen.findByText("Tradução não disponível");
  });

  it("no simulado (disabled) o pack desaparece por completo", () => {
    mockSettings.current.plus.wordTranslation = true;
    mockSettings.current.plus.phraseTranslation = true;
    const { container } = render(
      <PlusText
        text="In the future, people will work fewer hours. Give your opinion."
        type="write_essay"
        field="prompt"
        phase="pre"
        disabled
        qid="band9-write_essay-001"
      />,
    );
    expect(container.querySelectorAll("button")).toHaveLength(0);
    expect(container.querySelectorAll("[data-plus-word]")).toHaveLength(0);
  });

  it("sem voz inglesa o botão de pronúncia fica oculto (nunca voz pt-BR)", () => {
    const { container } = render(<PlusSpeakButton text="ability" label="Pronunciar ability" />);
    expect(container.querySelector("button")).toBeNull();
  });

  it("pack desligado → frase sem gatilho: sem botão e toque não expande card", () => {
    mockSettings.current.plus.wordTranslation = false;
    mockSettings.current.plus.phraseTranslation = false;
    mockSettings.current.plus.plusAudio = false;
    const { container } = render(
      <PlusPhraseCard
        sentence="In the future, people will work fewer hours than they do today."
        index={0}
        type="write_essay"
        field="prompt"
        phase="pre"
        wordBubbles={false}
        qid="band9-write_essay-001"
      />,
    );
    expect(container.querySelectorAll("[data-plus-phrase]")).toHaveLength(0);
    expect(container.textContent).toBe(
      "In the future, people will work fewer hours than they do today.",
    );
    fireEvent.click(container.querySelector("span")!);
    expect(screen.queryByText(/No futuro/)).toBeNull();
  });

  it("phraseTranslation desligado → sem chip de tradução nem expansão, mesmo com campo elegível", () => {
    mockSettings.current.plus.phraseTranslation = false;
    mockSettings.current.plus.plusAudio = false;
    const { container } = render(
      <PlusText
        text="In the future, people will work fewer hours. Give your opinion."
        type="write_essay"
        field="prompt"
        phase="pre"
        qid="band9-write_essay-001"
      />,
    );
    expect(container.querySelectorAll("[data-plus-phrase]")).toHaveLength(0);
    expect(container.querySelectorAll("[data-plus-phrase-card]")).toHaveLength(0);
    expect(container.querySelectorAll("[data-plus-word]")).toHaveLength(0);
    expect(screen.queryByRole("button", { name: "Traduzir a frase" })).toBeNull();
  });

  it("plusAudio desligado → botão de pronúncia do pack oculto", () => {
    mockSettings.current.plus.plusAudio = false;
    const { container } = render(<PlusSpeakButton text="ability" label="Pronunciar ability" />);
    expect(container.querySelector("button")).toBeNull();
  });

  it("no simulado (mode=exam) o pack some por completo nos motores integrados", () => {
    mockSettings.current.plus.wordTranslation = true;
    mockSettings.current.plus.phraseTranslation = true;
    const props = (data: unknown) => ({
      mode: "exam" as const,
      question: { id: "q-exam-1", data } as unknown as Question,
      onSubmit: () => {},
      submitted: false,
      registerAutoSubmit: () => {},
    });
    const engines = [
      [SwtEngine, { text: "In the future, people will work fewer hours than they do today." }],
      [WriteEssayEngine, { prompt: "In the future, people will work fewer hours." }],
      [RtsEngine, { scenario: "In the future, people will work fewer hours." }],
    ] as const;
    for (const [Engine, data] of engines) {
      const { container, unmount } = render(<Engine {...props(data)} />);
      expect(container.querySelectorAll("[data-plus-phrase]")).toHaveLength(0);
      expect(container.querySelectorAll("[data-plus-word]")).toHaveLength(0);
      expect(container.querySelectorAll("[data-plus-speak]")).toHaveLength(0);
      unmount();
    }
  });
});
