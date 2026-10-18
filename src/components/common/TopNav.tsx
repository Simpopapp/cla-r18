import { Link } from "@tanstack/react-router";

const NAV_ITEMS = [
  { to: "/", label: "Início" },
  { to: "/speaking", label: "Falar" },
  { to: "/writing", label: "Escrever" },
  { to: "/reading", label: "Ler" },
  { to: "/listening", label: "Ouvir" },
  { to: "/session", label: "Sessão" },
  { to: "/exam", label: "Simulado" },
  { to: "/progress", label: "Progresso" },
  { to: "/settings", label: "Ajustes" },
] as const;

/** TopNav esqueleto mobile-first (Fase 0). Nav com rolagem horizontal no mobile, alvos ≥ 44 px. */
export function TopNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4">
        <Link
          to="/"
          className="flex min-h-11 items-center gap-2 font-semibold tracking-tight text-foreground"
        >
          <span
            aria-hidden="true"
            className="flex size-7 items-center justify-center rounded-lg border border-primary/30 bg-primary/10 text-sm font-bold text-primary"
          >
            P
          </span>
          PTE Master Hub
        </Link>
        <nav aria-label="Navegação principal" className="min-w-0 flex-1">
          <ul className="flex items-center gap-1 overflow-x-auto py-2">
            {NAV_ITEMS.map((item) => (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className="inline-flex min-h-11 items-center whitespace-nowrap rounded-md px-3 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                  activeProps={{ className: "bg-accent text-accent-foreground font-medium" }}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
