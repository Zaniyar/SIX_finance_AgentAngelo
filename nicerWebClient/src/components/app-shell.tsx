import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Sparkles } from "lucide-react";
import sarahAvatar from "@/assets/sarah-avatar.jpg";
import { AngeloCallButton } from "@/components/AngeloCallButton";

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
  /** Full viewport content below header (e.g. map). Skips padded main container. */
  fullBleed?: boolean;
}) {
  return (
    <div className={fullBleed ? "h-screen flex flex-col bg-background text-foreground overflow-hidden" : "min-h-screen bg-background text-foreground"}>
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
            <AngeloCallButton
              clientId="all"
              clientName="all clients"
              className="scale-90"
            />
            <img
              src={sarahAvatar}
              alt="Sarah"
              className="w-8 h-8 rounded-full object-cover"
              width={32}
              height={32}
            />
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
      <main
        className={
          fullBleed
            ? "flex-1 min-h-0 overflow-hidden"
            : "mx-auto max-w-[1400px] px-8 py-10"
        }
      >
        {children}
      </main>
    </div>
  );
}
