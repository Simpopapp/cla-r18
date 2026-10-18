import { createFileRoute } from "@tanstack/react-router";
import { TopNav } from "@/components/common/TopNav";
import { SectionPage, SECTION_LABELS } from "@/components/common/SectionPage";
import { sectionQuery } from "@/lib/pte/catalog";
import { sectionCounts } from "@/lib/pte/manifest";

export const Route = createFileRoute("/speaking")({
  loader: ({ context }) => context.queryClient.ensureQueryData(sectionQuery("speaking")),
  head: () => ({
    meta: [
      { title: "Falar — PTE Master Hub" },
      {
        name: "description",
        content:
          "Prática de speaking do PTE Academic: Read Aloud, Repeat Sentence, Describe Image e mais, com selos de fonte e repetição espaçada.",
      },
      { property: "og:title", content: "Falar — PTE Master Hub" },
      {
        property: "og:description",
        content: `${sectionCounts["speaking"].toLocaleString("pt-BR")} questões de speaking do PTE Academic, 100% local.`,
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <TopNav />
      <SectionPage section="speaking" />
      <footer className="border-t border-border py-6 text-center text-sm text-muted-foreground">
        <p>{SECTION_LABELS["speaking"]} — treino local, seus dados ficam neste navegador.</p>
      </footer>
    </div>
  ),
});
