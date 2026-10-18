// SectionPage — PRD §11.2. Cards por tipo (contagem, tentadas, selos) + lista
// com busca, filtros e paginação de 50 com "Mostrar mais". Números derivados
// do manifesto; estados SRS derivados do estado do aluno (hidratado em efeito).

import { useMemo, useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Search } from "lucide-react";

import { BankSeal, ProvenanceBadge } from "@/components/common/seals";
import { Input } from "@/components/ui/input";
import { questionSearchText, sectionQuery } from "@/lib/pte/catalog";
import { countOf, TYPE_META, wordsOf } from "@/lib/pte/manifest";
import { isDue } from "@/lib/pte/srs";
import { PASS_SCORE_BY_TYPE, snapshotState, type SrsState } from "@/lib/pte/srs";
import { TASK_MATRIX } from "@/lib/pte/skillMatrix";
import type { Provenance, Section } from "@/lib/pte/types";
import { useAppState } from "@/lib/useAppState";

export const SECTION_LABELS: Record<Section, string> = {
  speaking: "Falar",
  writing: "Escrever",
  reading: "Ler",
  listening: "Ouvir",
};

const STATUS_OPTIONS: readonly { value: "all" | SrsState; label: string }[] = [
  { value: "all", label: "Todos os status" },
  { value: "nova", label: "Nunca tentada" },
  { value: "vencida", label: "Vencida (revisar hoje)" },
  { value: "aprendizado", label: "Em aprendizado" },
  { value: "revisao", label: "Em revisão" },
  { value: "fraca", label: "Fraca" },
  { value: "dominada", label: "Dominada" },
];

const PAGE_SIZE = 50;

export function SectionPage({ section }: { section: Section }) {
  const { data: questions } = useSuspenseQuery(sectionQuery(section));
  const state = useAppState();
  const now = Date.now();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | SrsState>("all");
  const [provenance, setProvenance] = useState<"all" | Provenance>("all");
  const [visible, setVisible] = useState(PAGE_SIZE);

  const typeLabels = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of TASK_MATRIX) map.set(row.slug, row.label);
    return map;
  }, []);

  const sectionTypes = useMemo(() => [...new Set(questions.map((q) => q.type))], [questions]);

  const searched = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return questions;
    return questions.filter((q) => questionSearchText(q).includes(needle));
  }, [questions, search]);

  const filtered = useMemo(
    () =>
      searched.filter((q) => {
        if (provenance !== "all" && q.provenance !== provenance) return false;
        if (status === "all") return true;
        const snap = state.questions[q.id];
        if (status === "nova" && (!snap || snap.attempts === 0)) return true;
        return snapshotState(snap, PASS_SCORE_BY_TYPE[q.type] ?? 75, now) === status;
      }),
    [searched, provenance, status, state.questions, now],
  );

  const shown = filtered.slice(0, visible);

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
      <h1 className="font-serif text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        {SECTION_LABELS[section]}
      </h1>

      <section aria-labelledby="types-heading" className="mt-6">
        <h2 id="types-heading" className="text-lg font-semibold text-foreground">
          Tipos desta seção
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sectionTypes.map((type) => {
            const meta = TYPE_META[type];
            const attempted = questions.filter(
              (q) => q.type === type && (state.questions[q.id]?.attempts ?? 0) > 0,
            ).length;
            const dueCount = questions.filter(
              (q) => q.type === type && isDue(state.questions[q.id], now),
            ).length;
            return (
              <article
                key={type}
                className="flex flex-col rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40"
              >
                <h3 className="font-serif text-lg font-semibold text-foreground">{meta.label}</h3>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {countOf(type).toLocaleString("pt-BR")} questões
                  </span>
                  <BankSeal type={type} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  tentadas: {attempted.toLocaleString("pt-BR")}
                  {dueCount > 0 ? ` · vencidas hoje: ${dueCount.toLocaleString("pt-BR")}` : ""}
                </p>
                <Link
                  to="/practice"
                  search={{ type }}
                  className="mt-3 inline-flex min-h-11 items-center gap-1 text-sm font-medium text-primary hover:underline"
                >
                  Praticar <ArrowRight aria-hidden="true" className="size-4" />
                </Link>
              </article>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="list-heading" className="mt-10">
        <h2 id="list-heading" className="text-lg font-semibold text-foreground">
          Todas as questões
        </h2>

        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              type="search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setVisible(PAGE_SIZE);
              }}
              placeholder="Buscar por texto ou tema"
              aria-label="Buscar questões"
              className="min-h-11 pl-9"
            />
          </div>
          <div className="flex gap-2">
            <label className="sr-only" htmlFor="filter-status">
              Filtrar por status
            </label>
            <select
              id="filter-status"
              value={status}
              onChange={(event) => {
                setStatus(event.target.value as "all" | SrsState);
                setVisible(PAGE_SIZE);
              }}
              className="min-h-11 rounded-md border border-input bg-background px-3 text-sm text-foreground"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <label className="sr-only" htmlFor="filter-provenance">
              Filtrar por fonte
            </label>
            <select
              id="filter-provenance"
              value={provenance}
              onChange={(event) => {
                setProvenance(event.target.value as "all" | Provenance);
                setVisible(PAGE_SIZE);
              }}
              className="min-h-11 rounded-md border border-input bg-background px-3 text-sm text-foreground"
            >
              <option value="all">Todas as fontes</option>
              <option value="verificada">Verificadas</option>
              <option value="comunitaria">Comunitárias</option>
            </select>
          </div>
        </div>

        {shown.length === 0 ? (
          <p className="mt-6 rounded-xl border border-border bg-muted px-4 py-6 text-center text-sm text-muted-foreground">
            Nenhuma questão com esses filtros. Ajuste a busca ou o status.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-border rounded-xl border border-border bg-card">
            {shown.map((q) => {
              const snap = state.questions[q.id];
              const srs = snap
                ? snapshotState(snap, PASS_SCORE_BY_TYPE[q.type] ?? 75, now)
                : "nova";
              const words = wordsOf(q.id);
              return (
                <li key={q.id}>
                  <Link
                    to="/practice"
                    search={{ q: q.id }}
                    className="flex min-h-14 flex-col gap-1 px-4 py-3 transition-colors hover:bg-accent sm:flex-row sm:items-center sm:justify-between"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-foreground">
                        {q.topic ?? "(sem tema)"}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {typeLabels.get(q.type) ?? q.type}
                        {words ? ` · ${words} palavras` : ""}
                        {snap ? ` · ${snap.attempts} tentativas` : ""}
                        {snap?.lastScore !== null && snap?.lastScore !== undefined
                          ? ` · última nota ${snap.lastScore}`
                          : ""}
                      </span>
                    </span>
                    <span className="flex flex-wrap items-center gap-2">
                      <ProvenanceBadge provenance={q.provenance} />
                      <span className="inline-flex min-h-6 items-center rounded-full border border-border bg-muted px-2 text-xs text-muted-foreground">
                        {srs}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
        {filtered.length > visible ? (
          <div className="mt-3 text-center">
            <button
              type="button"
              onClick={() => setVisible((v) => v + PAGE_SIZE)}
              className="inline-flex min-h-11 items-center rounded-md border border-input bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              Mostrar mais ({(filtered.length - visible).toLocaleString("pt-BR")} restantes)
            </button>
          </div>
        ) : null}
        <p className="mt-2 text-xs text-muted-foreground" aria-live="polite">
          {filtered.length.toLocaleString("pt-BR")} de {questions.length.toLocaleString("pt-BR")}{" "}
          questões listadas
        </p>
      </section>
    </main>
  );
}
