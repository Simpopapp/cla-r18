import { createFileRoute } from "@tanstack/react-router";
import { TopNav } from "@/components/common/TopNav";
import { SectionPage, SECTION_LABELS } from "@/components/common/SectionPage";
import { sectionQuery } from "@/lib/pte/catalog";
import { sectionCounts } from "@/lib/pte/manifest";

export const Route = createFileRoute("/reading")({
  loader: ({ context }) => context.queryClient.ensureQueryData(sectionQuery("reading")),
  head: () => ({
    meta: [
      { title: "Ler — PTE Master Hub" },
      {
        name: "description",
        content:
          "Prática de reading do PTE Academic: lacunas, múltipla escolha e reordenar parágrafos, com evidência textual.",
      },
      { property: "og:title", content: "Ler — PTE Master Hub" },
      {
        property: "og:description",
        content: `${sectionCounts["reading"].toLocaleString("pt-BR")} questões de reading do PTE Academic, 100% local.`,
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <TopNav />
      <SectionPage section="reading" />
      <footer className="border-t border-border py-6 text-center text-sm text-muted-foreground">
        <p>{SECTION_LABELS["reading"]} — treino local, seus dados ficam neste navegador.</p>
      </footer>
    </div>
  ),
});
