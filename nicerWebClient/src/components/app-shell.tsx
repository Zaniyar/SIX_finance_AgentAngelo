import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Sparkles } from "lucide-react";
const michaelAvatar = "/michael-avatar.png";
import { AngeloCallButton } from "@/components/AngeloCallButton";
import { GlobalCopilot } from "@/components/GlobalCopilot";

const navLinks = [
  { to: "/", label: "Dashboard" },
  { to: "/map", label: "Map" },
  { to: "/clients", label: "Clients" },
  { to: "/copilot", label: "Copilot" },
] as const;

export function AppShell({
  children,
  breadcrumbs,
  fullBleed = false,
}: {
  children: ReactNode;
  breadcrumbs?: { label: string; to?: string }[];
  fullBleed?: boolean;
}) {
  return (
    <div className={fullBleed ? "h-screen flex flex-col bg-background text-foreground overflow-hidden" : "min-h-screen bg-background text-foreground flex flex-col"}>
      <header className="border-b border-border/70 bg-background/80 backdrop-blur sticky top-0 z-40 shrink-0">
        <div className="mx-auto max-w-[1400px] px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-7 h-7 rounded-sm bg-primary flex items-center justify-center">
              <span className="font-display text-primary-foreground text-lg leading-none">A</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-display text-xl tracking-tight">AgentAngelo</span>
              <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">AURA</span>
            </div>
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            {navLinks.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="px-3 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors [&.active]:text-foreground [&.active]:bg-secondary"
                activeProps={{ className: "active" }}
                activeOptions={{ exact: l.to === "/" }}
              >
                {l.to === "/copilot" ? (
                  <span className="flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-accent" />{l.label}</span>
                ) : l.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2 text-sm">
            <AngeloCallButton clientId="all" clientName="all clients" className="scale-90" />
            <img src={michaelAvatar} alt="Michael" className="w-8 h-8 rounded-full object-cover" width={32} height={32} />
          </div>
        </div>
        {breadcrumbs && (
          <div className="mx-auto max-w-[1400px] px-8 pb-3 -mt-2">
            <nav className="text-xs text-muted-foreground flex items-center gap-2">
              {breadcrumbs.map((b, i) => (
                <span key={i} className="flex items-center gap-2">
                  {b.to ? <Link to={b.to} className="hover:text-foreground transition-colors">{b.label}</Link> : <span className="text-foreground">{b.label}</span>}
                  {i < breadcrumbs.length - 1 && <span className="opacity-40">/</span>}
                </span>
              ))}
            </nav>
          </div>
        )}
      </header>

      <main className={fullBleed ? "flex-1 min-h-0 overflow-hidden" : "flex-1 mx-auto max-w-[1400px] w-full px-8 py-10"}>
        {children}
      </main>

      {!fullBleed && <Footer />}
      <GlobalCopilot />
    </div>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border/60 bg-background/60 mt-auto shrink-0">
      <div className="mx-auto max-w-[1400px] px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 rounded-sm bg-primary flex items-center justify-center">
            <span className="font-display text-primary-foreground text-xs leading-none">A</span>
          </div>
          <span className="text-xs text-muted-foreground">
            AgentAngelo · AURA · SwissHacks 2026
          </span>
        </div>

        <div className="flex items-center gap-6">
          <Link to="/about" className="text-xs text-muted-foreground hover:text-foreground transition-colors">About</Link>
          <a href="https://github.com/Zaniyar/SIX_finance_AgentAngelo" target="_blank" rel="noreferrer" className="text-xs text-muted-foreground hover:text-foreground transition-colors">GitHub</a>
          <a href="mailto:jaha@zhaw.ch" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Contact</a>
        </div>

        <div className="flex items-center gap-4 opacity-60">
          <a href="http://swissmade.xyz/" target="_blank" rel="noreferrer">
            <img src="https://raw.githubusercontent.com/Zaniyar/SIX_finance_AgentAngelo/main/web/public/realite-suisse-logo.png" alt="Réalité Suisse" className="h-5 w-auto grayscale hover:grayscale-0 transition" />
          </a>
          <img src="https://cdn.prod.website-files.com/65d86f019d4bd1a34646a0ae/65d87371590440050fa08a8f_1_SIX-p-1080.png" alt="SIX" className="h-4 w-auto grayscale hover:grayscale-0 transition" />
        </div>
      </div>
    </footer>
  );
}
