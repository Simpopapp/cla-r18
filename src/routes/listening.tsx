import { createFileRoute } from "@tanstack/react-router";
import { TopNav } from "@/components/common/TopNav";
import { SectionPage, SECTION_LABELS } from "@/components/common/SectionPage";
import { sectionQuery } from "@/lib/pte/catalog";
import { sectionCounts } from "@/lib/pte/manifest";

export const Route = createFileRoute("/listening")({
  loader: ({ context }) => context.queryClient.ensureQueryData(sectionQuery("listening")),
  head: () => ({
    meta: [
      { title: "Ouvir — PTE Master Hub" },
      {
        name: "description",
        content:
          "Prática de listening do PTE Academic: resumo, lacunas, palavras incorretas e ditado, com áudio tocado uma vez.",
      },
      { property: "og:title", content: "Ouvir — PTE Master Hub" },
      {
        property: "og:description",
        content: `${sectionCounts["listening"].toLocaleString("pt-BR")} questões de listening do PTE Academic, 100% local.`,
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <TopNav />
      <SectionPage section="listening" />
      <footer className="border-t border-border py-6 text-center text-sm text-muted-foreground">
        <p>{SECTION_LABELS["listening"]} — treino local, seus dados ficam neste navegador.</p>
      </footer>
    </div>
  ),
});
