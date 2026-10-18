import { createFileRoute } from "@tanstack/react-router";
import { TopNav } from "@/components/common/TopNav";
import { SectionPage, SECTION_LABELS } from "@/components/common/SectionPage";
import { sectionQuery } from "@/lib/pte/catalog";
import { sectionCounts } from "@/lib/pte/manifest";

export const Route = createFileRoute("/writing")({
  loader: ({ context }) => context.queryClient.ensureQueryData(sectionQuery("writing")),
  head: () => ({
    meta: [
      { title: "Escrever — PTE Master Hub" },
      {
        name: "description",
        content:
          "Prática de writing do PTE Academic: Summarize Written Text e Write Essay, com zonas de palavras e cronômetro.",
      },
      { property: "og:title", content: "Escrever — PTE Master Hub" },
      {
        property: "og:description",
        content: `${sectionCounts["writing"].toLocaleString("pt-BR")} questões de writing do PTE Academic, 100% local.`,
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <TopNav />
      <SectionPage section="writing" />
      <footer className="border-t border-border py-6 text-center text-sm text-muted-foreground">
        <p>{SECTION_LABELS["writing"]} — treino local, seus dados ficam neste navegador.</p>
      </footer>
    </div>
  ),
});
