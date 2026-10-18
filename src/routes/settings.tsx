import { useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Download, RotateCcw, Upload } from "lucide-react";

import { TopNav } from "@/components/common/TopNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  applyBackup,
  BACKUP_APP,
  exportBackup,
  parseBackup,
  resetProgress,
  undo,
  updateSettings,
  type Accent,
} from "@/lib/storage";
import { dayKey, daysBetween } from "@/lib/pte/dates";
import { PLUS_TOGGLES } from "@/lib/plus/settings";
import { mutateAppState, useAppState } from "@/lib/useAppState";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Ajustes — PTE Master Hub" },
      {
        name: "description",
        content:
          "Ajustes do PTE Master Hub: sotaque, meta diária, data da prova, backup exportável e dados — tudo local.",
      },
      { property: "og:title", content: "Ajustes — PTE Master Hub" },
      {
        property: "og:description",
        content: "Ajustes do PTE Master Hub: prática, prova, banco e backup — 100% local.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SettingsPage,
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card p-4 sm:p-6" aria-label={title}>
      <h2 className="font-serif text-xl font-semibold text-foreground">{title}</h2>
      <div className="mt-4 space-y-5">{children}</div>
    </section>
  );
}

function downloadText(filename: string, text: string): void {
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

const TARGET_PRESETS = [50, 58, 65, 79] as const;
const ACCENT_OPTIONS: readonly { value: Accent; label: string }[] = [
  { value: "en-AU", label: "Inglês (Austrália) — padrão do PTE" },
  { value: "en-US", label: "Inglês (EUA)" },
  { value: "en-GB", label: "Inglês (Reino Unido)" },
];

function SettingsPage() {
  const state = useAppState();
  const settings = state.settings;
  const now = Date.now();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importText, setImportText] = useState<string | null>(null);
  const [importMode, setImportMode] = useState<"replace" | "merge">("merge");
  const [canUndo, setCanUndo] = useState(false);
  const [resetArmed, setResetArmed] = useState(false);

  const preview = useMemo(
    () => (importText ? parseBackup(importText, state) : null),
    [importText, state],
  );

  const backupStale =
    settings.lastBackupAt !== null && daysBetween(dayKey(settings.lastBackupAt), dayKey(now)) > 14;

  const patch = (partial: Parameters<typeof updateSettings>[1]) => {
    mutateAppState((s) => updateSettings(s, partial));
  };

  const handleExport = () => {
    const { text, state: next } = exportBackup(state, now);
    mutateAppState(() => next);
    downloadText(`pte-master-hub-backup-${dayKey(now)}.json`, text);
  };

  const handleImportFile = (file: File) => {
    void file.text().then((text) => setImportText(text));
  };

  const handleApplyImport = () => {
    if (!importText) return;
    const result = applyBackup(importText, importMode, state);
    if (!result.ok || !result.state) return;
    mutateAppState(() => result.state!);
    setCanUndo(result.undoWritten);
    setImportText(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleUndo = () => {
    const restored = undo();
    if (!restored) return;
    mutateAppState(() => restored);
    setCanUndo(false);
  };

  const handleReset = () => {
    if (!resetArmed) {
      setResetArmed(true);
      return;
    }
    const result = resetProgress(state);
    mutateAppState(() => result.state);
    setCanUndo(result.undoWritten);
    setResetArmed(false);
  };

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <TopNav />
      <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 py-8">
        <h1 className="font-serif text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Ajustes
        </h1>

        <Section title="Prática">
          <div>
            <Label htmlFor="setting-accent">Sotaque da voz</Label>
            <select
              id="setting-accent"
              value={settings.accent}
              onChange={(event) => patch({ accent: event.target.value as Accent })}
              className="mt-1 min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
            >
              {ACCENT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="setting-rate">
              Velocidade da voz (×{settings.modelRate.toFixed(2).replace(".", ",")})
            </Label>
            <input
              id="setting-rate"
              type="range"
              min={0.7}
              max={1.2}
              step={0.05}
              value={settings.modelRate}
              onChange={(event) => patch({ modelRate: Number(event.target.value) })}
              className="mt-2 w-full accent-[var(--primary)]"
            />
          </div>
          <div>
            <Label htmlFor="setting-goal">Meta diária de questões</Label>
            <Input
              id="setting-goal"
              type="number"
              min={0}
              max={200}
              value={settings.dailyGoal}
              onChange={(event) => patch({ dailyGoal: Number(event.target.value) })}
              className="mt-1 max-w-32"
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label htmlFor="setting-replay">Permitir repetir o áudio na prática</Label>
              <p className="text-xs text-muted-foreground">
                Na prova real, o áudio toca uma única vez.
              </p>
            </div>
            <Switch
              id="setting-replay"
              checked={settings.allowReplay}
              onCheckedChange={(checked) => patch({ allowReplay: checked })}
            />
          </div>
        </Section>

        <Section title="Prova">
          <div>
            <Label htmlFor="setting-date">Data da prova</Label>
            <Input
              id="setting-date"
              type="date"
              value={settings.examDate ?? ""}
              onChange={(event) => patch({ examDate: event.target.value || null })}
              className="mt-1 max-w-48"
            />
          </div>
          <div>
            <Label htmlFor="setting-target">Alvo de estimativa de treino</Label>
            <select
              id="setting-target"
              value={
                (TARGET_PRESETS as readonly number[]).includes(settings.targetScore)
                  ? String(settings.targetScore)
                  : "outro"
              }
              onChange={(event) => {
                const value = event.target.value;
                patch({ targetScore: value === "outro" ? 70 : Number(value) });
              }}
              className="mt-1 min-h-11 rounded-md border border-input bg-background px-3 text-sm text-foreground"
            >
              {TARGET_PRESETS.map((preset) => (
                <option key={preset} value={String(preset)}>
                  {preset}
                </option>
              ))}
              <option value="outro">Outro (10–90)</option>
            </select>
            {!(TARGET_PRESETS as readonly number[]).includes(settings.targetScore) ? (
              <Input
                type="number"
                min={10}
                max={90}
                aria-label="Alvo personalizado (10 a 90)"
                value={settings.targetScore}
                onChange={(event) => patch({ targetScore: Number(event.target.value) })}
                className="mt-2 max-w-32"
              />
            ) : null}
            <p className="mt-1 text-xs text-muted-foreground">
              O alvo compara com a estimativa de treino — nunca com a nota oficial.
            </p>
          </div>
        </Section>

        <Section title="Banco de questões">
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label htmlFor="setting-verified">Mostrar apenas fontes verificadas</Label>
              <p className="text-xs text-muted-foreground">
                Esconde questões de fontes comunitárias nas listas.
              </p>
            </div>
            <Switch
              id="setting-verified"
              checked={settings.onlyVerified}
              onCheckedChange={(checked) => patch({ onlyVerified: checked })}
            />
          </div>
          <div className="rounded-lg border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
            <p>
              <strong className="text-foreground">fonte verificada</strong> — conferida na fonte
              original (com gabarito/transcrição).
            </p>
            <p className="mt-1">
              <strong className="text-foreground">fonte comunitária</strong> — fontes de preparo
              acessíveis, com nível de confiança registrado.
            </p>
          </div>
        </Section>

        <Section title="Dados e backup">
          <p className="text-sm text-muted-foreground">
            Tudo é salvo neste navegador, sem conta. O backup é um arquivo JSON com a data de
            exportação — guarde-o fora do navegador para não perder o progresso.
          </p>
          {backupStale ? (
            <p className="rounded-lg border border-warning/50 bg-warning/10 px-3 py-2 text-sm text-warning-foreground">
              Seu último backup tem mais de duas semanas. Exporte um novo.
            </p>
          ) : null}
          <div className="flex flex-wrap gap-3">
            <Button type="button" onClick={handleExport} className="min-h-11">
              <Download aria-hidden="true" className="size-4" />
              Exportar backup
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="min-h-11"
            >
              <Upload aria-hidden="true" className="size-4" />
              Importar backup
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              className="sr-only"
              aria-label="Arquivo de backup"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) handleImportFile(file);
              }}
            />
          </div>

          {preview ? (
            <div className="rounded-lg border border-border bg-muted p-4">
              <h3 className="text-sm font-semibold text-foreground">Prévia da importação</h3>
              {preview.valid ? (
                <>
                  <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                    <li>
                      exportado em: {new Date(preview.exportedAt).toLocaleString("pt-BR")} · versão{" "}
                      {preview.version}
                    </li>
                    <li>
                      tentativas: {preview.attempts.toLocaleString("pt-BR")} (neste navegador:{" "}
                      {preview.comparison.currentAttempts.toLocaleString("pt-BR")})
                    </li>
                    <li>
                      questões com progresso: {preview.questions.toLocaleString("pt-BR")} (neste
                      navegador: {preview.comparison.currentQuestions.toLocaleString("pt-BR")})
                    </li>
                    <li>
                      sessões: {preview.sessions.toLocaleString("pt-BR")} (neste navegador:{" "}
                      {preview.comparison.currentSessions.toLocaleString("pt-BR")})
                    </li>
                    <li>favoritas: {preview.bookmarks.toLocaleString("pt-BR")}</li>
                  </ul>
                  <fieldset className="mt-3">
                    <legend className="text-sm font-medium text-foreground">Modo</legend>
                    <div className="mt-1 flex flex-wrap gap-4 text-sm">
                      <label className="inline-flex min-h-11 items-center gap-2">
                        <input
                          type="radio"
                          name="import-mode"
                          checked={importMode === "merge"}
                          onChange={() => setImportMode("merge")}
                        />
                        Mesclar (mantém o progresso daqui)
                      </label>
                      <label className="inline-flex min-h-11 items-center gap-2">
                        <input
                          type="radio"
                          name="import-mode"
                          checked={importMode === "replace"}
                          onChange={() => setImportMode("replace")}
                        />
                        Substituir (usa só o backup)
                      </label>
                    </div>
                  </fieldset>
                  <div className="mt-3 flex flex-wrap gap-3">
                    <Button type="button" onClick={handleApplyImport} className="min-h-11">
                      Aplicar importação
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setImportText(null)}
                      className="min-h-11"
                    >
                      Cancelar
                    </Button>
                  </div>
                </>
              ) : (
                <p className="mt-2 text-sm text-destructive">
                  Backup inválido: {preview.reason}. Nada foi alterado.
                </p>
              )}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleUndo}
              disabled={!canUndo}
              className="min-h-11"
            >
              <RotateCcw aria-hidden="true" className="size-4" />
              Desfazer última importação/zerada
            </Button>
            <Button type="button" variant="destructive" onClick={handleReset} className="min-h-11">
              {resetArmed ? "Confirmar: apagar o progresso" : "Zerar progresso"}
            </Button>
            {resetArmed ? (
              <Button type="button" variant="ghost" onClick={() => setResetArmed(false)}>
                Cancelar
              </Button>
            ) : null}
          </div>
        </Section>

        <Section title="Studie Plus (extra de estudo)">
          <p className="text-sm text-muted-foreground">
            Recurso extra de estudo:{" "}
            <strong className="text-foreground">não faz parte do PTE</strong> — não entra na nota,
            no histórico nem na estimativa. Tudo continua salvo apenas neste navegador.
          </p>
          <div className="rounded-lg border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
            <p>
              <strong className="text-foreground">Tradução</strong> = significado em português,
              escrito na tela.
            </p>
            <p className="mt-1">
              <strong className="text-foreground">Áudio</strong> = pronúncia do inglês original —
              nunca lê a tradução em voz alta.
            </p>
          </div>
          {PLUS_TOGGLES.map((toggle) => (
            <div key={toggle.key} className="flex items-center justify-between gap-4">
              <div>
                <Label htmlFor={`setting-plus-${toggle.key}`}>{toggle.label}</Label>
                <p className="text-xs text-muted-foreground">{toggle.description}</p>
              </div>
              <Switch
                id={`setting-plus-${toggle.key}`}
                checked={settings.plus[toggle.key]}
                onCheckedChange={(checked) =>
                  patch({ plus: { ...settings.plus, [toggle.key]: checked } })
                }
              />
            </div>
          ))}
          <p className="text-xs text-muted-foreground">
            O modo offline (baixar seções para estudar sem internet) entra em uma fase posterior do
            plano.
          </p>
        </Section>

        <Section title="Privacidade e voz">
          <p className="text-sm text-muted-foreground">
            Tudo é salvo neste navegador, sem conta. O reconhecimento de voz pode usar um serviço do
            próprio navegador (ex.: Chrome). A voz sintética usada em cada áudio é mostrada na
            prática. Nenhuma nota “oficial” é prometida: as estimativas são de treino.
          </p>
        </Section>

        <footer className="pb-6 pt-2 text-center text-xs text-muted-foreground">
          {BACKUP_APP} · dados e backup locais
        </footer>
      </main>
    </div>
  );
}
