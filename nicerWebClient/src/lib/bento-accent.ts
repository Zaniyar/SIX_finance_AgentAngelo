export type BentoAccent =
  | "accent"
  | "insight"
  | "evidence"
  | "trust"
  | "risk"
  | "human"
  | "business"
  | "studio"
  | "neutral";

export const bentoAccentStyles: Record<BentoAccent, { icon: string; glow: string; ring: string }> = {
  accent: {
    icon: "border-accent/25 bg-gradient-to-br from-accent/25 via-accent/10 to-accent/5 text-accent",
    glow: "from-accent/10 via-transparent to-transparent",
    ring: "ring-accent/20",
  },
  insight: {
    icon: "border-primary/20 bg-gradient-to-br from-primary/15 via-primary/8 to-primary/5 text-primary",
    glow: "from-primary/8 via-transparent to-transparent",
    ring: "ring-primary/15",
  },
  evidence: {
    icon: "border-chart-4/25 bg-gradient-to-br from-chart-4/20 via-chart-4/10 to-chart-4/5 text-chart-4",
    glow: "from-chart-4/10 via-transparent to-transparent",
    ring: "ring-chart-4/15",
  },
  trust: {
    icon: "border-positive/25 bg-gradient-to-br from-positive/20 via-positive/10 to-positive/5 text-positive",
    glow: "from-positive/10 via-transparent to-transparent",
    ring: "ring-positive/15",
  },
  risk: {
    icon: "border-destructive/25 bg-gradient-to-br from-destructive/15 via-destructive/8 to-destructive/5 text-destructive",
    glow: "from-destructive/8 via-transparent to-transparent",
    ring: "ring-destructive/15",
  },
  human: {
    icon: "border-accent/30 bg-gradient-to-br from-accent/30 via-accent/15 to-accent/5 text-accent",
    glow: "from-accent/12 via-transparent to-transparent",
    ring: "ring-accent/20",
  },
  business: {
    icon: "border-foreground/10 bg-gradient-to-br from-foreground/10 via-foreground/5 to-secondary text-foreground",
    glow: "from-foreground/5 via-transparent to-transparent",
    ring: "ring-foreground/10",
  },
  studio: {
    icon: "border-accent/35 bg-gradient-to-br from-accent/35 via-accent/15 to-accent/5 text-accent",
    glow: "from-accent/15 via-transparent to-transparent",
    ring: "ring-accent/25",
  },
  neutral: {
    icon: "border-border bg-gradient-to-br from-secondary via-secondary/60 to-surface text-muted-foreground",
    glow: "from-secondary/40 via-transparent to-transparent",
    ring: "ring-border",
  },
};

export function accentForCategory(category: string, priority?: string): BentoAccent {
  if (priority === "High") {
    if (category === "Opportunity") return "trust";
    return "risk";
  }
  switch (category) {
    case "Opportunity":
      return "trust";
    case "Reputational":
    case "Fraud":
    case "Concentration":
      return "risk";
    case "Macro":
      return "insight";
    case "Liquidity":
    case "Tax":
      return "business";
    default:
      return "neutral";
  }
}
