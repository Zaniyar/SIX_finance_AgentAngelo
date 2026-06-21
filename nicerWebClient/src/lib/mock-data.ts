import schneiderAvatar from "@/assets/client-schneider.jpg";
import huberAvatar from "@/assets/client-huber.jpg";
import raeberAvatar from "@/assets/client-raeber.jpg";
import ammannAvatar from "@/assets/client-ammann.jpg";

export type Category = "Reputational" | "Macro" | "Concentration" | "Liquidity" | "Tax" | "Opportunity" | "Fraud";
export type Channel = "Email" | "Phone" | "WhatsApp" | "In-Person" | "Assistant";
export type Style = "Numbers-first" | "Narrative-first" | "Concise" | "Risk-sensitive" | "Values-driven" | "Macro-focused";

export type Source = { label: string; date: string; url?: string; outlet?: string; excerpt?: string };
export type Confidence = "Explicit" | "Pattern" | "Inferred";

export type Client = {
  id: string;
  name: string;
  avatar?: string;
  segment: "UHNWI" | "HNWI";
  mandate: string;
  aum: number;
  strategy: string;
  domicile: string;
  timezone: string;
  workingHours: string;
  hasAssistant: boolean;
  assistantName?: string;
  communicationStyle: Style;
  preferredChannel: Channel;
  lastContact: string;
  riskScore: number;
  archetype: string;
  dna: {
    values: { label: string; confidence: Confidence; weight: number }[];
    sensitivities: string[];
    preferences: string[];
    interests: string[];
    relationships: { name: string; role: string }[];
    gaps: string[];
    timeline: { date: string; type: "Note" | "Meeting" | "Life" | "Trade"; text: string }[];
    notes: { date: string; text: string }[];
    wealthSource?: string;
    taxDomicile?: string;
    successionStatus?: string;
    liquidityHorizon?: string;
    philanthropy?: string[];
    dos?: string[];
    donts?: string[];
    kycRefresh?: string;
    behavioralPatterns?: string[];
    discretion?: string;
    structures?: { label: string; jurisdiction: string; purpose: string }[];
    netWorthMap?: { label: string; pct: number }[];
    media?: { date: string; outlet: string; title: string; sentiment: "Positive" | "Neutral" | "Negative"; url?: string; summary?: string; confidence: Confidence }[];
    crmTouchpoints?: { date: string; channel: Channel | "Letter" | "Meeting" | "Video Call"; direction: "In" | "Out"; subject: string; outcome?: string; owner?: string; durationMin?: number }[];
    personal?: {
      keyDates?: { date: string; label: string; kind: "Birthday" | "Anniversary" | "Memorial" | "Milestone" }[];
      family?: { name: string; relation: string; note?: string }[];
      ritualsAndLoves?: string[];
      conversationStarters?: string[];
      neverForget?: string[];
      giftNotes?: string;
      lastPersonalTouch?: { date: string; text: string };
      voice?: string;
    };
  };
  portfolio: {
    allocation: { name: string; value: number; target: number }[];
    holdings: {
      ticker: string; name: string; weight: number; sector: string; alert?: string;
      valor?: string; isin?: string; primaryMic?: string; venueCcy?: string;
      lastPrice?: { value: number; ccy: string; asOf: string; pctDay?: number };
      instrumentType?: string;
      issuerLei?: string;
    }[];
  };
};

export type MessageVariant = {
  style: Style;
  label: string;
  subject: string;
  message: string;
  bestFor: Channel[];
};

export type Recommendation = {
  id: string;
  clientId: string;
  affectedTicker?: string;
  title: string;
  category: Category;
  priority: "High" | "Medium" | "Low";
  advised: string;
  trigger: string;
  whyClient: string;
  whyAction: string;
  impact: { portfolioFit: number; riskDelta: string; expectedReturn: string; sectorShift: string };
  reason: { storyline: string; sources: Source[] };
  compliance: { mandateOk: boolean; suitabilityOk: boolean; cioApproved: boolean; regulatoryFlags: string[] };
  confidence?: { score: number; dataFreshness: string; modelNote: string; assumptions: string[]; unknowns: string[] };
  counterArguments?: string[];
  alternatives?: { option: string; whyNot: string }[];
  pastTrack?: { similarCases: number; hitRate: string; lastExample: string };
  revenueImpact?: { feesChf: string; crossSell?: string; retentionLift?: string };
  personalImpact?: { angle: "Legacy" | "Philanthropy" | "Family" | "Identity" | "Values"; story: string };
  outreach: {
    channel: Channel; timing: string; timingReason: string; style: Style;
    subject: string; message: string; variants?: MessageVariant[];
  };
};

export type EventKind = "Risk" | "Opportunity";
export type MarketEvent = {
  id: string;
  kind: EventKind;
  title: string;
  summary: string;
  severity: "High" | "Medium" | "Low";
  category: Category;
  date: string;
  sources: Source[];
  affected: {
    clientId: string;
    ticker: string;
    exposurePct?: number;
    exposureChf?: number;
    fitScore?: number;
    fitReason?: string;
    suggestedAllocChf?: number;
  }[];
};

// ─────────────────────────────────────────────────────────────────────────
// CLIENTS, 4 personas mapped from the SwissHacks CRM + Portfolio workbook.
// Mandate size 10.0 CHF m (per spreadsheet "Target amount" = 10,000,000).
// RM in charge: Sarah Meier (handover from Thomas Keller, Dec 2025).
// ─────────────────────────────────────────────────────────────────────────

export const clients: Client[] = [
  {
    id: "c-schneider",
    name: "Hubertus & Carmen Schneider",
    avatar: schneiderAvatar,
    segment: "UHNWI",
    mandate: "Balanced, Global Discretionary",
    aum: 10.0,
    strategy: "Global Balanced, Venture Philanthropy tilt",
    domicile: "Zug, CH",
    timezone: "CET",
    workingHours: "08:00–18:00",
    hasAssistant: false,
    communicationStyle: "Values-driven",
    preferredChannel: "Phone",
    lastContact: "12 days ago",
    riskScore: 5,
    archetype: "The Personal Connection",
    dna: {
      values: [
        { label: "Funding neurodegenerative-disease research (daughter Chloe)", confidence: "Explicit", weight: 10 },
        { label: "Avoid pharma names that have de-prioritised chronic-disease R&D", confidence: "Explicit", weight: 9 },
        { label: "Capital must act with purpose, not just compound", confidence: "Pattern", weight: 8 },
        { label: "Institutional stability, long-tenured RM relationships", confidence: "Explicit", weight: 7 },
        { label: "Conservative, no speculative tilts", confidence: "Pattern", weight: 6 },
      ],
      sensitivities: [
        "Any holding linked to companies cutting neurology / rare-disease research",
        "Surprises, Hubertus needs to be the first to know, not the last",
        "Carmen, anything that feels transactional during a hard family period",
      ],
      preferences: [
        "Short, human phone calls before any written proposal",
        "Pair every trade with an explanation of who it helps and why",
        "Foundation-relevant news flagged the same day",
      ],
      interests: ["Neurology research breakthroughs", "Swiss automotive supply chain", "Family foundation governance"],
      relationships: [
        { name: "Chloe Schneider", role: "Daughter, 12, recently diagnosed with a severe neurodegenerative illness" },
        { name: "Schneider Family Foundation", role: "Venture-philanthropy vehicle, est. Jan 2026" },
        { name: "Dr. Walter Frei", role: "Family physician, CHUV Lausanne" },
      ],
      gaps: [
        "Foundation legal structure (still in draft with Bär & Karrer)",
        "Confirmed annual giving envelope for 2026",
      ],
      timeline: [
        { date: "2026-05-19", type: "Note", text: "Hubertus, calling from the US, met a biotech working on a Parkinson's asset, asked us to track it." },
        { date: "2026-05-02", type: "Note", text: "Carmen requested expedited statement for foundation's clinical audit." },
        { date: "2026-04-14", type: "Life", text: "Met at the medical charity gala, Carmen shared Chloe is fighting bravely but having a hard week." },
        { date: "2026-03-24", type: "Trade", text: "CHF 1.0m initial endowment transferred from portfolio to Schneider Family Foundation." },
        { date: "2026-03-05", type: "Note", text: "Hubertus, intense email: do an audit of our core European pharma name's neurology pipeline." },
        { date: "2026-01-22", type: "Meeting", text: "Urgent strategy realign, family establishes Venture Philanthropy foundation." },
        { date: "2026-01-09", type: "Life", text: "Hubertus profoundly distracted on first call with Sarah, hinted at family medical situation." },
      ],
      notes: [
        { date: "2026-05-19", text: "Tracking a US biotech (Parkinson's asset) Hubertus encountered, possible 2026H2 conversation." },
        { date: "2026-03-05", text: "Hubertus expects us to challenge any pharma holding that de-emphasises neurodegenerative research." },
        { date: "2026-01-22", text: "Mandate purpose shifted: capital is now an extension of the family's medical mission." },
      ],
      wealthSource: "Active owner and CEO of a major Swiss automotive supply enterprise. Most personal capital tied up in physical factory assets; this mandate is the family's primary liquid wealth.",
      taxDomicile: "Switzerland (Zug). Corporate vehicle in CH-ZG.",
      successionStatus: "Will updated Q1 2026. Foundation designated as long-term steward of a defined share of the estate.",
      liquidityHorizon: "Long (10y+). Reserved 10% buffer for foundation capital calls.",
      philanthropy: [
        "Schneider Family Foundation, venture philanthropy in neurology and rare disease",
        "CHUV Lausanne, paediatric neurology research support",
      ],
      dos: [
        "Open the call with Chloe, gently, only if Carmen brings it up first.",
        "Surface neurology-relevant market news the same day, even if it isn't actionable.",
        "Treat the foundation's clinical audit requests as Priority 1.",
      ],
      donts: [
        "Never recommend a pharma name we know has frozen its neurodegenerative pipeline.",
        "Do not push performance numbers as the lead, purpose comes first now.",
        "No commercial outreach during Chloe's treatment cycles (Carmen will flag).",
      ],
      kycRefresh: "Next review due 2026-10-15. Foundation UBO documentation in progress.",
      behavioralPatterns: [
        "Hubertus calls from abroad after meeting medical entrepreneurs, ideas land in week-long bursts.",
        "Carmen handles foundation operations, Hubertus drives strategic direction.",
        "Approvals come fast when the story matches the cause, slow otherwise.",
      ],
      discretion: "Strict, do not mention Chloe by name in any written material. The family's situation is not public.",
      structures: [
        { label: "Schneider Family Foundation", jurisdiction: "CH-ZG", purpose: "Venture philanthropy, neurology research" },
      ],
      netWorthMap: [
        { label: "Bank mandate (here)", pct: 18 },
        { label: "Automotive supply enterprise (operating)", pct: 64 },
        { label: "Foundation endowment", pct: 9 },
        { label: "Zug residence + holiday home", pct: 7 },
        { label: "Cash & sight elsewhere", pct: 2 },
      ],
      media: [
        { date: "2026-04-14", outlet: "Medical Research Switzerland", title: "Bank charity gala raises CHF 4.2m for paediatric neurology", sentiment: "Positive", url: "#media-mrs", summary: "Carmen pictured at the gala, no mention of Chloe.", confidence: "Explicit" },
        { date: "2026-03-09", outlet: "Handelszeitung", title: "Schweizer Zulieferer trotzen der Auto-Krise", sentiment: "Neutral", url: "#media-hz", summary: "Profile of Hubertus's operating business, no family content.", confidence: "Explicit" },
        { date: "2026-02-26", outlet: "Reuters Health", title: "Major pharma scales back chronic-disease pipelines", sentiment: "Negative", url: "#media-reuters-health", summary: "Context for Hubertus's pharma pipeline audit request.", confidence: "Pattern" },
      ],
      crmTouchpoints: [
        { date: "2026-05-19", channel: "Phone", direction: "In", subject: "US biotech meeting, Parkinson's asset", outcome: "Logged for monitoring", owner: "Sarah Meier", durationMin: 24 },
        { date: "2026-05-02", channel: "Phone", direction: "In", subject: "Carmen, foundation clinical audit statement", outcome: "Statement issued same day", owner: "Sarah Meier", durationMin: 9 },
        { date: "2026-04-14", channel: "In-Person", direction: "Out", subject: "Medical charity gala, brief meeting", outcome: "Carmen mentioned Chloe having a hard week", owner: "Sarah Meier", durationMin: 20 },
        { date: "2026-03-24", channel: "Phone", direction: "In", subject: "Carmen, CHF 1m endowment transfer to foundation", outcome: "Processed", owner: "Sarah Meier", durationMin: 12 },
        { date: "2026-03-05", channel: "Email", direction: "Out", subject: "Detailed neurology pipeline report sent", outcome: "Hubertus replied with intense purpose", owner: "Sarah Meier" },
        { date: "2026-02-18", channel: "Phone", direction: "In", subject: "Audit request: European pharma neurodegenerative pipeline", outcome: "Triggered pipeline note", owner: "Sarah Meier", durationMin: 18 },
        { date: "2026-01-22", channel: "Meeting", direction: "Out", subject: "Urgent strategy realign, foundation established", owner: "Sarah Meier", durationMin: 110 },
        { date: "2026-01-09", channel: "Phone", direction: "In", subject: "First call post-handover, Hubertus emotional", outcome: "Sensitivity flagged, no trades", owner: "Sarah Meier", durationMin: 22 },
      ],
      personal: {
        keyDates: [
          { date: "Apr 02", label: "Chloe's birthday, treat the whole week with care", kind: "Birthday" },
          { date: "Jun 11", label: "Hubertus's birthday (turns 56)", kind: "Birthday" },
          { date: "Sep 04", label: "Wedding anniversary (24 years)", kind: "Anniversary" },
          { date: "Jan 22", label: "Foundation founding day", kind: "Milestone" },
        ],
        family: [
          { name: "Chloe", relation: "Daughter, 12", note: "Recently diagnosed with a severe neurodegenerative illness. Never named in writing. Treat any reference with extreme care." },
          { name: "Carmen", relation: "Wife", note: "Runs the foundation operationally. Warm, but emotionally raw right now." },
          { name: "Lukas", relation: "Son, 16", note: "Boarding school in St Gallen, rarely comes up. Hubertus is protective." },
        ],
        ritualsAndLoves: [
          "Family dinner on Sundays, non-negotiable",
          "Hubertus reads two pages of NZZ over espresso before any call",
          "Annual ski week in Engadin, phones often off",
        ],
        conversationStarters: [
          "Foundation milestones and new research grants",
          "Swiss auto-supply sector dynamics",
          "Any breakthrough paper in neurodegenerative research",
        ],
        neverForget: [
          "Do not name Chloe in any written material",
          "No performance-led pitches during treatment cycles",
          "Hubertus must hear hard news from us first, never read it",
        ],
        giftNotes: "A handwritten note around Chloe's birthday week, no flowers, no wine. Tasteful book on neuroscience history has landed well.",
        lastPersonalTouch: { date: "2026-04-14", text: "Carmen at the gala, brief and warm. She asked Sarah to keep things 'human' going forward." },
        voice: "Sarah, our money has to do something with this. Otherwise, what is the point.",
      },
    },
    portfolio: {
      // Balanced sample portfolio (10.0 CHF m mandate)
      allocation: [
        { name: "Equities", value: 50, target: 50 },
        { name: "Fixed Income", value: 33, target: 33.5 },
        { name: "Real Estate", value: 5, target: 5 },
        { name: "Alternatives", value: 9, target: 8.5 },
        { name: "Cash", value: 3, target: 3 },
      ],
      holdings: [
        // Pharma anchor flagged by the trigger event
        { ticker: "NOVN.SW", name: "Novartis AG", weight: 5.8, sector: "Health Care", alert: "Chronic-disease R&D restructuring announced",
          valor: "1200526", isin: "CH0012005267", primaryMic: "XSWX", venueCcy: "CHF", instrumentType: "EQUITY",
          lastPrice: { value: 96.18, ccy: "CHF", asOf: "T-15min", pctDay: -2.4 } },
        { ticker: "ROG.SW", name: "Roche Holding AG", weight: 4.6, sector: "Health Care",
          valor: "1203204", isin: "CH0012032048", primaryMic: "XSWX", venueCcy: "CHF", instrumentType: "EQUITY",
          lastPrice: { value: 251.10, ccy: "CHF", asOf: "T-15min", pctDay: 0.4 } },
        { ticker: "NESN.SW", name: "Nestlé SA", weight: 4.1, sector: "Consumer Staples",
          valor: "3886335", isin: "CH0038863350", primaryMic: "XSWX", venueCcy: "CHF",
          lastPrice: { value: 88.42, ccy: "CHF", asOf: "T-15min", pctDay: -0.3 } },
        { ticker: "WORLDx.UH", name: "MSCI World ex-CH (USD/EUR sleeve)", weight: 28.6, sector: "Equities, Foreign",
          instrumentType: "INDEX-SLEEVE", primaryMic: "n/a", venueCcy: "USD" },
        { ticker: "SBI.AAA", name: "SBI Domestic AAA-BBB", weight: 11.5, sector: "Fixed Income, CHF",
          instrumentType: "INDEX-SLEEVE", venueCcy: "CHF" },
        { ticker: "BBG.AGG", name: "Bloomberg Global Aggregate (CHF-hedged)", weight: 20.0, sector: "Fixed Income, G7",
          instrumentType: "INDEX-SLEEVE", venueCcy: "CHF" },
        { ticker: "GOLD.LBMA", name: "Gold (LBMA, CHF)", weight: 5.0, sector: "Alternatives",
          instrumentType: "COMMODITY", venueCcy: "CHF" },
        { ticker: "LPX50", name: "LPX 50 Listed Private Equity", weight: 3.5, sector: "Alternatives",
          instrumentType: "INDEX-SLEEVE", venueCcy: "USD" },
      ],
    },
  },

  {
    id: "c-huber",
    name: "Marius & Elena Huber",
    avatar: huberAvatar,
    segment: "UHNWI",
    mandate: "Defensive, Global Discretionary",
    aum: 10.0,
    strategy: "Defensive Global, Sustainability-aligned",
    domicile: "Zurich, CH",
    timezone: "CET",
    workingHours: "09:00–17:00",
    hasAssistant: false,
    communicationStyle: "Values-driven",
    preferredChannel: "Phone",
    lastContact: "5 weeks ago",
    riskScore: 3,
    archetype: "The Purpose-Driven Investor",
    dna: {
      values: [
        { label: "Reforestation and rainforest preservation, South America", confidence: "Explicit", weight: 10 },
        { label: "Overweight authentic sustainability leaders, not greenwash", confidence: "Explicit", weight: 9 },
        { label: "Wants the RM to call about good news, not only drops", confidence: "Explicit", weight: 8 },
        { label: "Defensive, no leverage, no speculation", confidence: "Pattern", weight: 7 },
        { label: "Educate the next generation as part of the mission", confidence: "Pattern", weight: 6 },
      ],
      sensitivities: [
        "Supply-chain greenwashing, especially palm oil and deforestation",
        "Being contacted only when markets drop",
        "Performance framing without an impact angle",
      ],
      preferences: [
        "Phone updates from Sarah, with an ESG-impact framing",
        "Annual sustainability impact report alongside the financial one",
        "Loop Elena in on any field-related news",
      ],
      interests: ["Atlantic Forest restoration", "Biodiversity finance", "Youth education in conservation"],
      relationships: [
        { name: "Huber Stiftung", role: "Private foundation, reforestation in Peru and Brazil" },
        { name: "Dr. Ana Lopes", role: "Field director, foundation's Atlantic Forest project" },
      ],
      gaps: [
        "Specific equity-by-equity sustainability rating thresholds",
        "Allocation cap for thematic 'impact' equities vs core",
      ],
      timeline: [
        { date: "2026-05-20", type: "Note", text: "[CIO] Major consumer-goods firm cuts palm-oil suppliers, launches BR reforestation foundation." },
        { date: "2026-05-12", type: "Note", text: "Elena, extended summer trip to conservation sites in South America." },
        { date: "2026-04-14", type: "Life", text: "Marius at the bank charity gala, in high spirits, praised the bank's recent ESG advocacy work." },
        { date: "2026-02-17", type: "Note", text: "Marius, NZZ piece on corporate accountability, asks who in the portfolio is genuinely walking the talk." },
        { date: "2026-01-15", type: "Meeting", text: "Strategy 2026 video call, Elena shared the foundation's Brazil milestones." },
      ],
      notes: [
        { date: "2026-05-12", text: "Elena travelling, summer field trip, conservation sites in Brazil and Peru." },
        { date: "2026-02-17", text: "Marius wants names that are visibly doing the right thing, not those that only claim to." },
        { date: "2023-05-19", text: "Marius: 'The greatest investment is the future of the rainforest.'" },
      ],
      wealthSource: "Inherited industrial wealth, divested from operating businesses 2015. Capital fully redeployed into a defensive financial mandate plus the family foundation.",
      taxDomicile: "Switzerland (Zurich).",
      successionStatus: "Foundation as long-term steward. Two adult children, both involved in the foundation governance.",
      liquidityHorizon: "Long (10y+). Allocations to foundation capital calls scheduled annually.",
      philanthropy: [
        "Huber Stiftung, reforestation in Peru and Atlantic Forest Brazil",
        "Youth education sub-account, environmental literacy",
      ],
      dos: [
        "Call about positive ESG corporate news, not only risks.",
        "Pair every recommendation with a one-line impact framing.",
        "Speak in continuity with Thomas Keller's tone, they valued him deeply.",
      ],
      donts: [
        "Do not surface holdings with documented deforestation supply-chain links without a remediation plan.",
        "Avoid jargon, prefer concrete examples (a forest hectare, a species, a community).",
        "No outreach during their conservation field trips unless urgent.",
      ],
      kycRefresh: "Next review due 2026-09-01.",
      behavioralPatterns: [
        "Replies fast to phone outreach, slowly to email.",
        "Asks deeper questions when ESG framing is honest, disengages when it feels marketed.",
        "Elena is the operational driver of the foundation, Marius the strategic conscience.",
      ],
      discretion: "Public-facing through the foundation. Personal finances strictly private.",
      structures: [
        { label: "Huber Stiftung", jurisdiction: "CH-ZH", purpose: "Reforestation, environmental education" },
      ],
      netWorthMap: [
        { label: "Bank mandate (here)", pct: 46 },
        { label: "Huber Stiftung endowment", pct: 31 },
        { label: "Zurich + Engadin properties", pct: 14 },
        { label: "Cash & sight elsewhere", pct: 9 },
      ],
      media: [
        { date: "2026-05-22", outlet: "NZZ", title: "Schweizer Stiftungen treiben Aufforstung in Brasilien", sentiment: "Positive", url: "#media-nzz-stift", summary: "Huber Stiftung profiled as anchor donor.", confidence: "Explicit" },
        { date: "2026-03-15", outlet: "Mongabay", title: "Atlantic Forest restoration accelerates as private donors step in", sentiment: "Positive", url: "#media-mongabay", summary: "Mentions Huber-funded land acquisition.", confidence: "Pattern" },
      ],
      crmTouchpoints: [
        { date: "2026-05-12", channel: "Phone", direction: "In", subject: "Elena, summer travel plans", outcome: "No business, contact via Marius until July", owner: "Sarah Meier", durationMin: 8 },
        { date: "2026-04-14", channel: "In-Person", direction: "Out", subject: "Charity gala, brief interaction", outcome: "Marius praised the bank's advocacy work", owner: "Sarah Meier", durationMin: 15 },
        { date: "2026-02-17", channel: "Phone", direction: "In", subject: "NZZ article, corporate accountability", outcome: "Triggered pipeline of ESG-aligned ideas", owner: "Sarah Meier", durationMin: 22 },
        { date: "2026-01-15", channel: "Video Call", direction: "Out", subject: "Annual Strategy 2026", outcome: "Mandate confirmed, defensive + sustainability tilt", owner: "Sarah Meier", durationMin: 65 },
        { date: "2026-01-08", channel: "Phone", direction: "Out", subject: "Introductory call post-handover", outcome: "Marius: expect the same values-led approach as Keller", owner: "Sarah Meier", durationMin: 18 },
      ],
      personal: {
        keyDates: [
          { date: "Mar 12", label: "Marius's birthday (turns 61)", kind: "Birthday" },
          { date: "Jun 05", label: "World Environment Day, foundation public day", kind: "Milestone" },
          { date: "Sep 21", label: "Wedding anniversary (32 years)", kind: "Anniversary" },
        ],
        family: [
          { name: "Elena", relation: "Wife", note: "Runs the foundation field operations. Often travels for months at a time." },
          { name: "Nicolas", relation: "Son, 27", note: "Biologist, on the foundation board." },
          { name: "Léa", relation: "Daughter, 24", note: "Environmental law student, advises the foundation pro bono." },
        ],
        ritualsAndLoves: [
          "Long walks in the Sihlwald on weekends",
          "Reads Mongabay every Sunday morning",
          "Annual visit to the Peru project, full family",
        ],
        conversationStarters: [
          "Latest hectare count restored by the foundation",
          "Authentic ESG announcements from big corporates",
          "Léa's environmental law projects",
        ],
        neverForget: [
          "Greenwashing is the fastest way to lose their trust",
          "Elena is sometimes off-grid in the Amazon, plan ahead",
          "Their wealth is a tool for the foundation, not the goal",
        ],
        giftNotes: "A donation to a small NGO they admire, not flowers. Books on rewilding land well.",
        lastPersonalTouch: { date: "2026-04-14", text: "Brief gala chat, Marius asked Sarah to call when the bank does something brave, not only when it's necessary." },
        voice: "Sarah, please don't only call when something is wrong. Call when something is right too.",
      },
    },
    portfolio: {
      // Defensive sample portfolio
      allocation: [
        { name: "Equities", value: 21.5, target: 21.5 },
        { name: "Fixed Income", value: 60, target: 60 },
        { name: "Real Estate", value: 4.5, target: 4.5 },
        { name: "Alternatives", value: 9.5, target: 9.5 },
        { name: "Cash", value: 4.5, target: 4.5 },
      ],
      holdings: [
        // Consumer staples sleeve, target of the palm-oil opportunity
        { ticker: "UNA.AS", name: "Unilever PLC", weight: 4.2, sector: "Consumer Staples", alert: "Authentic palm-oil + reforestation pledge announced",
          valor: "5777394", isin: "GB00B10RZP78", primaryMic: "XAMS", venueCcy: "EUR", instrumentType: "EQUITY",
          lastPrice: { value: 50.10, ccy: "EUR", asOf: "T-15min", pctDay: 3.1 } },
        { ticker: "NESN.SW", name: "Nestlé SA", weight: 3.6, sector: "Consumer Staples",
          valor: "3886335", isin: "CH0038863350", primaryMic: "XSWX", venueCcy: "CHF",
          lastPrice: { value: 88.42, ccy: "CHF", asOf: "T-15min", pctDay: -0.3 } },
        { ticker: "SBI.AAA", name: "SBI Domestic AAA-BBB", weight: 22.0, sector: "Fixed Income, CHF",
          instrumentType: "INDEX-SLEEVE", venueCcy: "CHF" },
        { ticker: "BBG.AGG", name: "Bloomberg Global Aggregate (CHF-hedged)", weight: 37.0, sector: "Fixed Income, G7",
          instrumentType: "INDEX-SLEEVE", venueCcy: "CHF" },
        { ticker: "GOLD.LBMA", name: "Gold (LBMA, CHF)", weight: 7.5, sector: "Alternatives",
          instrumentType: "COMMODITY", venueCcy: "CHF" },
        { ticker: "SXI.RE", name: "SXI Real Estate Funds (CHF)", weight: 2.5, sector: "Real Estate",
          instrumentType: "INDEX-SLEEVE", venueCcy: "CHF" },
      ],
    },
  },

  {
    id: "c-raeber",
    name: "Eugen & Lisa Räber",
    avatar: raeberAvatar,
    segment: "UHNWI",
    mandate: "Defensive, Global Discretionary",
    aum: 10.0,
    strategy: "Defensive Global, Dividend-focused",
    domicile: "Zurich, CH",
    timezone: "CET",
    workingHours: "09:30–17:00",
    hasAssistant: false,
    communicationStyle: "Risk-sensitive",
    preferredChannel: "Phone",
    lastContact: "5 weeks ago",
    riskScore: 2,
    archetype: "The Defensive Value Investor",
    dna: {
      values: [
        { label: "Capital preservation above all", confidence: "Explicit", weight: 10 },
        { label: "Tangible dividends from real, asset-heavy businesses", confidence: "Explicit", weight: 9 },
        { label: "Deep aversion to US mega-cap tech and abstract software", confidence: "Explicit", weight: 9 },
        { label: "Quiet stewardship for grandchildren, slow money", confidence: "Pattern", weight: 7 },
        { label: "Traditional Swiss precision, prefers familiar names", confidence: "Pattern", weight: 6 },
      ],
      sensitivities: [
        "Any aggressive rebalancing away from blue-chip dividend payers",
        "Speculative US software / AI exposure",
        "Surprises, they expect explicit confirmation before any change",
      ],
      preferences: [
        "Formal phone calls, never WhatsApp",
        "Written confirmations for every trade",
        "Same tone and approach as Thomas Keller, continuity matters",
      ],
      interests: ["Swiss precision engineering", "Mountain holidays in Flims", "Grandchildren's education"],
      relationships: [
        { name: "Felix Räber", role: "Grandson, 9, savings account being built up" },
        { name: "Notar Dr. Anna Brunner", role: "Family notary, Zurich" },
      ],
      gaps: [
        "Explicit policy on European industrial automation exposure",
        "Estate-distribution split between three grandchildren",
      ],
      timeline: [
        { date: "2026-05-20", type: "Note", text: "[CIO] Aggressive TAA update: slash Nestlé/Novartis to fund Nvidia/Microsoft, conflicts with mandate." },
        { date: "2026-05-12", type: "Note", text: "Lisa, summer in the mountains, no liquidity needs." },
        { date: "2026-04-14", type: "Life", text: "Eugen at the bank gala, praised Swiss consumer staples stability." },
        { date: "2026-02-17", type: "Note", text: "Eugen, NZZ article on industrial automation, asks if there is a 'safe' way to participate." },
        { date: "2026-01-15", type: "Meeting", text: "Strategy 2026 video call, portfolio locked in defensive staples + healthcare + high-grade fixed income." },
      ],
      notes: [
        { date: "2026-02-17", text: "Eugen opened the door, gently, to European industrial automation, but only in familiar packaging." },
        { date: "2024-11-06", text: "Eugen on US tech: 'abstract software firms valued on hope, not balance sheets.'" },
        { date: "2023-05-19", text: "Eugen: 'Thomas, keep our money in real things you can touch.'" },
      ],
      wealthSource: "Built over four decades from a Swiss precision-engineering family business, sold in 2014. Capital fully invested in this defensive mandate plus property.",
      taxDomicile: "Switzerland (Zurich).",
      successionStatus: "Will updated 2022, three grandchildren as beneficiaries via trust at age 25.",
      liquidityHorizon: "Indefinite. Reserves only for property maintenance and grandchildren's accounts.",
      philanthropy: ["Annual giving to Pro Senectute"],
      dos: [
        "Use formal address, 'Herr Räber', never first names in writing.",
        "Frame anything new through familiar Swiss / European industrial peers.",
        "Always include the dividend-yield impact of a proposed change.",
      ],
      donts: [
        "Never propose Nvidia, Microsoft or other US mega-cap tech, even in a sleeve.",
        "Do not call without an agenda, they find it intrusive.",
        "Avoid the word 'aggressive', triggers immediate skepticism.",
      ],
      kycRefresh: "Next review due 2026-08-12.",
      behavioralPatterns: [
        "Long silences on the phone, then a decisive yes or no.",
        "Always defers to existing mandate language when in doubt.",
        "Lisa handles family communication, Eugen handles all investment decisions.",
      ],
      discretion: "Strict, no public profile.",
      structures: [],
      netWorthMap: [
        { label: "Bank mandate (here)", pct: 62 },
        { label: "Zurich + Flims properties", pct: 28 },
        { label: "Family business sale proceeds, escrow", pct: 6 },
        { label: "Cash & sight elsewhere", pct: 4 },
      ],
      media: [
        { date: "2026-02-15", outlet: "NZZ", title: "Industrielle Automatisierung, eine neue Welle für Europa", sentiment: "Neutral", url: "#media-nzz-auto", summary: "Background for Eugen's recent automation question.", confidence: "Pattern" },
      ],
      crmTouchpoints: [
        { date: "2026-05-12", channel: "Phone", direction: "In", subject: "Lisa, summer plans, no liquidity needs", outcome: "Quiet period through August", owner: "Sarah Meier", durationMin: 7 },
        { date: "2026-04-14", channel: "In-Person", direction: "Out", subject: "Charity gala, brief interaction", outcome: "Eugen praised staples stability", owner: "Sarah Meier", durationMin: 10 },
        { date: "2026-02-17", channel: "Phone", direction: "In", subject: "NZZ industrial automation piece", outcome: "Door opened to European automation, in familiar packaging", owner: "Sarah Meier", durationMin: 17 },
        { date: "2026-01-15", channel: "Video Call", direction: "Out", subject: "Annual Strategy 2026", outcome: "Mandate locked, no rebalancing approved", owner: "Sarah Meier", durationMin: 55 },
        { date: "2026-01-08", channel: "Phone", direction: "Out", subject: "Introductory call post-handover", outcome: "Eugen: expect the same quiet, global defensive approach", owner: "Sarah Meier", durationMin: 14 },
      ],
      personal: {
        keyDates: [
          { date: "Feb 04", label: "Eugen's birthday (turns 73)", kind: "Birthday" },
          { date: "Aug 17", label: "Wedding anniversary (47 years)", kind: "Anniversary" },
          { date: "Dec 27", label: "Family week in Flims, do not call", kind: "Milestone" },
        ],
        family: [
          { name: "Lisa", relation: "Wife", note: "Warm, traditional, handles all family communication." },
          { name: "Felix", relation: "Grandson, 9", note: "Eugen is quietly proud, building a small savings account for him." },
        ],
        ritualsAndLoves: [
          "Sunday hike in the Sihlwald, rain or shine",
          "Reads NZZ in print, every morning",
          "Long lunch on the first Wednesday of each month at Kronenhalle",
        ],
        conversationStarters: [
          "Felix's school news, Lisa loves to share",
          "Renovation projects at the Flims holiday home",
          "Swiss industrial heritage, Eugen lights up here",
        ],
        neverForget: [
          "Never propose US mega-cap tech, even framed as a hedge",
          "Felix's account is sacred, conservative only",
          "Continuity from Thomas Keller is part of the trust contract",
        ],
        giftNotes: "Hand-written card around their anniversary. Avoid digital gifts, they value the analogue.",
        lastPersonalTouch: { date: "2026-05-12", text: "Lisa called about the summer plans, gentle quick chat, no business." },
        voice: "Frau Meier, wir kaufen nichts, was wir nicht erklären können.",
      },
    },
    portfolio: {
      // Defensive sample portfolio
      allocation: [
        { name: "Equities", value: 21.5, target: 21.5 },
        { name: "Fixed Income", value: 60, target: 60 },
        { name: "Real Estate", value: 4.5, target: 4.5 },
        { name: "Alternatives", value: 9.5, target: 9.5 },
        { name: "Cash", value: 4.5, target: 4.5 },
      ],
      holdings: [
        { ticker: "NESN.SW", name: "Nestlé SA", weight: 4.8, sector: "Consumer Staples", alert: "CIO TAA: proposed slash to fund US tech",
          valor: "3886335", isin: "CH0038863350", primaryMic: "XSWX", venueCcy: "CHF", instrumentType: "EQUITY",
          lastPrice: { value: 88.42, ccy: "CHF", asOf: "T-15min", pctDay: -0.3 } },
        { ticker: "NOVN.SW", name: "Novartis AG", weight: 4.2, sector: "Health Care", alert: "CIO TAA: proposed slash to fund US tech",
          valor: "1200526", isin: "CH0012005267", primaryMic: "XSWX", venueCcy: "CHF", instrumentType: "EQUITY",
          lastPrice: { value: 96.18, ccy: "CHF", asOf: "T-15min", pctDay: -1.2 } },
        { ticker: "ROG.SW", name: "Roche Holding AG", weight: 3.4, sector: "Health Care",
          valor: "1203204", isin: "CH0012032048", primaryMic: "XSWX", venueCcy: "CHF", instrumentType: "EQUITY",
          lastPrice: { value: 251.10, ccy: "CHF", asOf: "T-15min", pctDay: 0.4 } },
        { ticker: "COST", name: "Costco Wholesale", weight: 3.1, sector: "Consumer Staples",
          valor: "915080", isin: "US22160K1051", primaryMic: "XNAS", venueCcy: "USD", instrumentType: "EQUITY",
          lastPrice: { value: 942.40, ccy: "USD", asOf: "T-15min", pctDay: 0.2 } },
        { ticker: "SIEGY", name: "Siemens AG", weight: 2.4, sector: "Industrials",
          isin: "DE0007236101", primaryMic: "XETR", venueCcy: "EUR", instrumentType: "EQUITY",
          lastPrice: { value: 192.10, ccy: "EUR", asOf: "T-15min", pctDay: 0.1 } },
        { ticker: "SBI.AAA", name: "SBI Domestic AAA-BBB", weight: 22.0, sector: "Fixed Income, CHF",
          instrumentType: "INDEX-SLEEVE", venueCcy: "CHF" },
        { ticker: "BBG.AGG", name: "Bloomberg Global Aggregate (CHF-hedged)", weight: 37.0, sector: "Fixed Income, G7",
          instrumentType: "INDEX-SLEEVE", venueCcy: "CHF" },
        { ticker: "GOLD.LBMA", name: "Gold (LBMA, CHF)", weight: 7.5, sector: "Alternatives",
          instrumentType: "COMMODITY", venueCcy: "CHF" },
      ],
    },
  },

  {
    id: "c-ammann",
    name: "Julian Ammann",
    avatar: ammannAvatar,
    segment: "UHNWI",
    mandate: "Growth, Global Discretionary",
    aum: 10.0,
    strategy: "Global Growth, Reputation-screen overlay",
    domicile: "Zurich, CH",
    timezone: "CET",
    workingHours: "07:30–19:00",
    hasAssistant: true,
    assistantName: "Sandra Vogel",
    communicationStyle: "Numbers-first",
    preferredChannel: "Email",
    lastContact: "8 days ago",
    riskScore: 7,
    archetype: "The Corporate Reputation Case",
    dna: {
      values: [
        { label: "Cannot hold names in major public-backlash situations", confidence: "Explicit", weight: 10 },
        { label: "Brand reputation is portfolio risk, not just sentiment", confidence: "Explicit", weight: 9 },
        { label: "Data-driven, demands rigorous backing for every move", confidence: "Pattern", weight: 8 },
        { label: "Performance-oriented within a clean-governance perimeter", confidence: "Pattern", weight: 7 },
        { label: "Sensitive to Swiss labour and consumer-rights coverage", confidence: "Pattern", weight: 7 },
      ],
      sensitivities: [
        "Any holding mentioned in a labour-rights or governance scandal",
        "Anything that could be quoted next to his own brand in a newspaper",
        "Soft pitches without supporting data",
      ],
      preferences: [
        "Detailed written briefings with quantitative substitution metrics",
        "Email first, phone only for execution",
        "Pre-cleared lines for media questions, if relevant",
      ],
      interests: ["Consumer sentiment data", "Swiss retail expansion", "European art collection"],
      relationships: [
        { name: "Sandra Vogel", role: "Executive assistant, gatekeeper" },
        { name: "Julian's brand (Swiss retail group)", role: "Source of wealth, public-facing operating business" },
      ],
      gaps: [
        "Explicit threshold for what constitutes a 'major' backlash",
        "Stance on engagement vs divestment for borderline names",
      ],
      timeline: [
        { date: "2026-05-20", type: "Note", text: "[CIO] Investigative scandal hits a major consumer brand in his portfolio, warehouse labour exploitation." },
        { date: "2026-05-14", type: "Note", text: "Requested updated correlation matrix to avoid retail-brand cluster risk." },
        { date: "2026-04-02", type: "Note", text: "Brand under heavy local media scrutiny on western Switzerland expansion." },
        { date: "2025-09-18", type: "Meeting", text: "Joint handover call, Julian demanded rigorous, data-driven approach from Sarah." },
      ],
      notes: [
        { date: "2026-05-14", text: "Julian wants quantitative proof that retail exposures aren't clustered." },
        { date: "2024-06-14", text: "Julian: 'Consumer boycotts are a massive unquantifiable risk for me personally.'" },
        { date: "2023-06-20", text: "Mandate clause: portfolio must not hold names in active public-backlash situations on labour or governance." },
      ],
      wealthSource: "Founder and public face of a prominent Swiss national retail brand. Personal wealth almost entirely tied to brand equity and dividends.",
      taxDomicile: "Switzerland (Zurich).",
      successionStatus: "Will updated 2024. Two children, both minors, trust structure in place.",
      liquidityHorizon: "Medium (3-7y). Regular dividend sweeps from his private holding company.",
      philanthropy: ["Corporate giving via the brand foundation, not personal"],
      dos: [
        "Lead every brief with the reputational angle, then the numbers.",
        "Pre-screen any new name against the past 18 months of news coverage.",
        "Route urgent items through Sandra Vogel.",
      ],
      donts: [
        "Never recommend a name with an open labour or governance investigation.",
        "Avoid narrative-only pitches, he will push back hard.",
        "Do not call directly during media windows (he often briefs press in the morning).",
      ],
      kycRefresh: "Next review due 2026-07-15. PEP-adjacent (public figure).",
      behavioralPatterns: [
        "Reads every brief twice, replies with sharp clarifying questions.",
        "Approves quickly when reputational risk is addressed first.",
        "Brings unsolicited macro and regulatory references into discussions.",
      ],
      discretion: "Public figure. Anything in writing should be safe to print.",
      structures: [{ label: "Ammann Holding AG", jurisdiction: "CH-ZH", purpose: "Personal holding for brand equity and dividend sweeps" }],
      netWorthMap: [
        { label: "Bank mandate (here)", pct: 22 },
        { label: "Brand equity (operating)", pct: 64 },
        { label: "Art collection", pct: 8 },
        { label: "Cash & sight elsewhere", pct: 6 },
      ],
      media: [
        { date: "2026-05-21", outlet: "Tages-Anzeiger", title: "Ammann erweitert in die Westschweiz", sentiment: "Neutral", url: "#media-ta", summary: "Profile of brand expansion, mild labour-union concerns referenced.", confidence: "Explicit" },
        { date: "2026-04-08", outlet: "Bilanz", title: "Schweizer Detailhandel, die nächsten 5 Jahre", sentiment: "Positive", url: "#media-bilanz-retail", summary: "Julian's brand named as bellwether.", confidence: "Explicit" },
      ],
      crmTouchpoints: [
        { date: "2026-06-12", channel: "Email", direction: "In", subject: "Request: updated correlation matrix, retail cluster", outcome: "Analyst desk producing report", owner: "Sarah Meier" },
        { date: "2026-05-14", channel: "Email", direction: "In", subject: "Correlation matrix follow-up", outcome: "Scheduled for next briefing", owner: "Sarah Meier" },
        { date: "2026-04-02", channel: "Phone", direction: "In", subject: "Brand under union scrutiny, asks about portfolio analogues", outcome: "Triggered reputation-screen review", owner: "Sarah Meier", durationMin: 14 },
        { date: "2026-01-09", channel: "Phone", direction: "Out", subject: "Introductory call post-handover", outcome: "Julian expects analytical depth, not stories", owner: "Sarah Meier", durationMin: 21 },
      ],
      personal: {
        keyDates: [
          { date: "May 27", label: "Julian's birthday (turns 49)", kind: "Birthday" },
          { date: "Oct 03", label: "Brand founding anniversary (annual press day)", kind: "Milestone" },
        ],
        family: [
          { name: "Mirjam", relation: "Wife", note: "Architect, private. Never named in writing without his cue." },
          { name: "Children", relation: "Two minors", note: "Strictly off-limits in communication." },
        ],
        ritualsAndLoves: [
          "Espresso macchiato at Sprüngli before any major meeting",
          "Reads the FT and NZZ back-to-back, every morning",
          "Annual collector trip during Art Basel week",
        ],
        conversationStarters: [
          "Swiss consumer sentiment data and what it implies for retail",
          "Recent art acquisitions, Basel highlights",
          "Regulatory environment for retail labour in Europe",
        ],
        neverForget: [
          "Never reference his children in writing",
          "His brand and his portfolio are intertwined in his mind, treat them as one risk surface",
          "Do not call during morning press windows",
        ],
        giftNotes: "Avoid corporate gifts. A handwritten note after a notable public moment of his brand works well.",
        lastPersonalTouch: { date: "2026-04-08", text: "Sent a short note congratulating him on the Bilanz feature. He replied with a single line, but he replied." },
        voice: "Sarah, my portfolio cannot be the headline that takes down my brand.",
      },
    },
    portfolio: {
      // Growth sample portfolio
      allocation: [
        { name: "Equities", value: 75, target: 75 },
        { name: "Fixed Income", value: 9.5, target: 9.5 },
        { name: "Real Estate", value: 5, target: 5 },
        { name: "Alternatives", value: 8.5, target: 8.5 },
        { name: "Cash", value: 2, target: 2 },
      ],
      holdings: [
        // Name hit by the labour scandal (trigger)
        { ticker: "AMZN", name: "Amazon.com Inc.", weight: 5.4, sector: "Consumer Discretionary", alert: "Open investigative scandal, warehouse labour",
          valor: "906866", isin: "US0231351067", primaryMic: "XNAS", venueCcy: "USD", instrumentType: "EQUITY",
          lastPrice: { value: 218.40, ccy: "USD", asOf: "T-15min", pctDay: -4.6 } },
        { ticker: "COST", name: "Costco Wholesale", weight: 4.1, sector: "Consumer Staples",
          valor: "915080", isin: "US22160K1051", primaryMic: "XNAS", venueCcy: "USD", instrumentType: "EQUITY",
          lastPrice: { value: 942.40, ccy: "USD", asOf: "T-15min", pctDay: 0.2 } },
        { ticker: "CFR.SW", name: "Cie Financière Richemont", weight: 3.8, sector: "Consumer Discretionary",
          valor: "21048333", isin: "CH0210483332", primaryMic: "XSWX", venueCcy: "CHF", instrumentType: "EQUITY",
          lastPrice: { value: 142.80, ccy: "CHF", asOf: "T-15min", pctDay: 0.5 } },
        { ticker: "NVDA", name: "NVIDIA Corp.", weight: 4.5, sector: "Information Technology",
          valor: "994529", isin: "US67066G1040", primaryMic: "XNAS", venueCcy: "USD", instrumentType: "EQUITY",
          lastPrice: { value: 142.55, ccy: "USD", asOf: "T-15min", pctDay: 2.1 } },
        { ticker: "WORLDx.UH", name: "MSCI World ex-CH (USD/EUR sleeve)", weight: 47.8, sector: "Equities, Foreign",
          instrumentType: "INDEX-SLEEVE", venueCcy: "USD" },
        { ticker: "BBG.AGG", name: "Bloomberg Global Aggregate (CHF-hedged)", weight: 6.0, sector: "Fixed Income, G7",
          instrumentType: "INDEX-SLEEVE", venueCcy: "CHF" },
        { ticker: "LPX50", name: "LPX 50 Listed Private Equity", weight: 5.5, sector: "Alternatives",
          instrumentType: "INDEX-SLEEVE", venueCcy: "USD" },
        { ticker: "NCI", name: "Nasdaq Crypto Index (NCI)", weight: 1.5, sector: "Alternatives",
          instrumentType: "INDEX-SLEEVE", venueCcy: "USD" },
      ],
    },
  },
];

// ─────────────────────────────────────────────────────────────────────────
// EXTENDED BOOK, ten further relationships (mainly Swiss, some cross-border).
// Bigger portfolios per the SwissHacks workbook (AUM in CHF m).
// ─────────────────────────────────────────────────────────────────────────

type LiteOpts = {
  id: string; name: string; segment: "UHNWI" | "HNWI"; mandate: string;
  aum: number; strategy: string; domicile: string; timezone: string;
  channel: Channel; style: Style; archetype: string; risk: number;
  values: string[]; sensitivities: string[]; preferences: string[];
  interests: string[]; relationships: { name: string; role: string }[];
  notes: { date: string; text: string }[];
  holdings: { ticker: string; name: string; weight: number; sector: string }[];
  allocation: { name: string; value: number; target: number }[];
  lastContact?: string;
};

function mkLite(o: LiteOpts): Client {
  return {
    id: o.id, name: o.name, segment: o.segment, mandate: o.mandate, aum: o.aum,
    strategy: o.strategy, domicile: o.domicile, timezone: o.timezone,
    workingHours: "08:00–18:00", hasAssistant: false, communicationStyle: o.style,
    preferredChannel: o.channel, lastContact: o.lastContact ?? "this week",
    riskScore: o.risk, archetype: o.archetype,
    dna: {
      values: o.values.map((v, i) => ({ label: v, confidence: "Pattern", weight: 8 - i })),
      sensitivities: o.sensitivities, preferences: o.preferences, interests: o.interests,
      relationships: o.relationships, gaps: [],
      timeline: o.notes.map((n) => ({ date: n.date, type: "Note" as const, text: n.text })),
      notes: o.notes,
    },
    portfolio: {
      allocation: o.allocation,
      holdings: o.holdings,
    },
  };
}

const defaultAllocBalanced = [
  { name: "Swiss Equities", value: 10, target: 10 },
  { name: "Foreign Equities (Dev.)", value: 34.5, target: 34.5 },
  { name: "Emerging Equities", value: 5.5, target: 5.5 },
  { name: "CHF Bonds", value: 11.5, target: 11.5 },
  { name: "Global Bonds (CHF-hedged)", value: 20, target: 20 },
  { name: "EM Bonds", value: 2, target: 2 },
  { name: "Swiss Real Estate", value: 2, target: 2 },
  { name: "Global REITs", value: 3, target: 3 },
  { name: "Private Markets", value: 3.5, target: 3.5 },
  { name: "Gold / Commodities", value: 5, target: 5 },
  { name: "Cash", value: 3, target: 3 },
];

const defaultAllocDefensive = [
  { name: "Swiss Equities", value: 6.8, target: 6.8 },
  { name: "Foreign Equities (Dev.)", value: 12.7, target: 12.7 },
  { name: "Emerging Equities", value: 2, target: 2 },
  { name: "CHF Bonds", value: 22, target: 22 },
  { name: "Global Bonds (CHF-hedged)", value: 37, target: 37 },
  { name: "EM Bonds", value: 1, target: 1 },
  { name: "Swiss Real Estate", value: 2.5, target: 2.5 },
  { name: "Global REITs", value: 2, target: 2 },
  { name: "Private Markets", value: 2, target: 2 },
  { name: "Gold / Commodities", value: 7.5, target: 7.5 },
  { name: "Cash", value: 4.5, target: 4.5 },
];

const defaultAllocGrowth = [
  { name: "Swiss Equities", value: 12, target: 12 },
  { name: "Foreign Equities (Dev.)", value: 57.5, target: 57.5 },
  { name: "Emerging Equities", value: 5.5, target: 5.5 },
  { name: "CHF Bonds", value: 3, target: 3 },
  { name: "Global Bonds (CHF-hedged)", value: 6, target: 6 },
  { name: "EM Bonds", value: 0.5, target: 0.5 },
  { name: "Swiss Real Estate", value: 1, target: 1 },
  { name: "Global REITs", value: 4, target: 4 },
  { name: "Crypto", value: 1.5, target: 1.5 },
  { name: "Private Markets", value: 5.5, target: 5.5 },
  { name: "Gold / Commodities", value: 1.5, target: 1.5 },
  { name: "Cash", value: 2, target: 2 },
];

const extraClients: Client[] = [
  mkLite({
    id: "c-blattmann", name: "Andreas & Verena Blattmann", segment: "UHNWI",
    mandate: "Growth, Global Discretionary", aum: 42.0,
    strategy: "Global Growth, tech overweight", domicile: "Zürich, CH", timezone: "CET",
    channel: "Email", style: "Numbers-first", archetype: "The Builder", risk: 8,
    values: ["Compounding through innovation", "Direct access to private deals", "Tax efficiency"],
    sensitivities: ["Slow execution on hot tickers", "Generic CIO commentary"],
    preferences: ["Crisp email summaries", "Quarterly in-person reviews"],
    interests: ["AI infrastructure", "Swiss medtech", "Family office build-out"],
    relationships: [{ name: "Blattmann Holding AG", role: "Family holding, Zug" }],
    notes: [{ date: "2026-05-12", text: "Asked for direct access to Partners Group secondaries fund." }],
    holdings: [
      { ticker: "NVDA", name: "Nvidia Corp.", weight: 8.4, sector: "Information Technology" },
      { ticker: "MSFT", name: "Microsoft Corp.", weight: 6.2, sector: "Information Technology" },
      { ticker: "PGHN.SW", name: "Partners Group", weight: 4.1, sector: "Financials" },
      { ticker: "NESN.SW", name: "Nestlé", weight: 3.0, sector: "Consumer Staples" },
    ],
    allocation: defaultAllocGrowth,
    lastContact: "5 days ago",
  }),
  mkLite({
    id: "c-merian", name: "Dr. Beatrice Merian", segment: "UHNWI",
    mandate: "Balanced, Global Discretionary", aum: 28.5,
    strategy: "Global Balanced, ESG screen", domicile: "Basel, CH", timezone: "CET",
    channel: "Phone", style: "Values-driven", archetype: "The Conscience Investor", risk: 5,
    values: ["Hard ESG screen", "Long-only Swiss + European blue chips", "Transparent reporting"],
    sensitivities: ["Holdings flagged for governance issues"],
    preferences: ["Phone briefings before any sustainability vote"],
    interests: ["Circular economy", "Pharma ethics", "Basel art scene"],
    relationships: [{ name: "Merian Stiftung", role: "Personal cultural foundation" }],
    notes: [{ date: "2026-05-04", text: "Wants a quarterly ESG attribution note alongside performance." }],
    holdings: [
      { ticker: "ROG.SW", name: "Roche Holding", weight: 4.8, sector: "Health Care" },
      { ticker: "NESN.SW", name: "Nestlé", weight: 3.6, sector: "Consumer Staples" },
      { ticker: "GIVN.SW", name: "Givaudan", weight: 2.1, sector: "Materials" },
    ],
    allocation: defaultAllocBalanced,
    lastContact: "9 days ago",
  }),
  mkLite({
    id: "c-rossi", name: "Famiglia Rossi", segment: "UHNWI",
    mandate: "Balanced, Cross-border (IT/CH)", aum: 36.0,
    strategy: "Global Balanced, Italian tilt", domicile: "Lugano, CH (Milan tax)", timezone: "CET",
    channel: "WhatsApp", style: "Narrative-first", archetype: "The Cross-border Industrialist", risk: 6,
    values: ["Discretion across IT/CH border", "Family lineage and successors"],
    sensitivities: ["Italian tax disclosures", "Anything that mentions Milan publicly"],
    preferences: ["Brief WhatsApp voice notes from RM", "Italian-language tax documents"],
    interests: ["Italian luxury brands", "Vineyard in Piemonte"],
    relationships: [{ name: "Marco Rossi", role: "Patriarch, mechanical engineering group" }, { name: "Sofia Rossi", role: "Daughter, joining the board 2027" }],
    notes: [{ date: "2026-04-30", text: "Wants succession review pulled forward to Q3 2026." }],
    holdings: [
      { ticker: "CFR.SW", name: "Richemont", weight: 4.5, sector: "Consumer Discretionary" },
      { ticker: "RACE.MI", name: "Ferrari N.V.", weight: 3.2, sector: "Consumer Discretionary" },
      { ticker: "ENI.MI", name: "Eni SpA", weight: 2.5, sector: "Energy" },
    ],
    allocation: defaultAllocBalanced,
    lastContact: "3 days ago",
  }),
  mkLite({
    id: "c-favre", name: "Jean-Luc & Sylvie Favre", segment: "HNWI",
    mandate: "Defensive, Global Discretionary", aum: 12.5,
    strategy: "Global Defensive, dividend tilt", domicile: "Genève, CH", timezone: "CET",
    channel: "In-Person", style: "Concise", archetype: "The Quiet Saver", risk: 3,
    values: ["Capital preservation", "Predictable income", "Local Swiss focus"],
    sensitivities: ["US-dollar drawdowns", "Crypto headlines"],
    preferences: ["Short in-person review every six months"],
    interests: ["Lake Geneva sailing", "Swiss bond market"],
    relationships: [{ name: "Favre & Cie. SA", role: "Family watchmaking workshop" }],
    notes: [{ date: "2026-05-18", text: "Asked us to keep total USD exposure under 20%." }],
    holdings: [
      { ticker: "NESN.SW", name: "Nestlé", weight: 4.2, sector: "Consumer Staples" },
      { ticker: "ZURN.SW", name: "Zurich Insurance", weight: 3.1, sector: "Financials" },
      { ticker: "SCMN.SW", name: "Swisscom", weight: 2.4, sector: "Telecom" },
    ],
    allocation: defaultAllocDefensive,
    lastContact: "1 week ago",
  }),
  mkLite({
    id: "c-stadler", name: "Karin Stadler", segment: "HNWI",
    mandate: "Growth, Global Discretionary", aum: 18.0,
    strategy: "Global Growth, biotech overweight", domicile: "Bern, CH", timezone: "CET",
    channel: "Email", style: "Numbers-first", archetype: "The Scientist", risk: 7,
    values: ["Evidence-led conviction picks", "Long horizon"],
    sensitivities: ["Marketing fluff", "Style-drift away from biotech focus"],
    preferences: ["Data-dense PDF notes"],
    interests: ["Oncology pipelines", "Gene therapy"],
    relationships: [{ name: "Inserm Lausanne", role: "Scientific advisor" }],
    notes: [{ date: "2026-05-09", text: "Requested deep dive on European cell-therapy issuers." }],
    holdings: [
      { ticker: "NOVN.SW", name: "Novartis", weight: 5.0, sector: "Health Care" },
      { ticker: "ROG.SW", name: "Roche Holding", weight: 4.5, sector: "Health Care" },
      { ticker: "VRTX", name: "Vertex Pharmaceuticals", weight: 3.0, sector: "Health Care" },
    ],
    allocation: defaultAllocGrowth,
    lastContact: "4 days ago",
  }),
  mkLite({
    id: "c-bachmann", name: "Reto & Anna Bachmann", segment: "HNWI",
    mandate: "Balanced, Global Discretionary", aum: 15.8,
    strategy: "Global Balanced", domicile: "Luzern, CH", timezone: "CET",
    channel: "Phone", style: "Concise", archetype: "The Steady Couple", risk: 5,
    values: ["No surprises", "Annual plan delivered on time"],
    sensitivities: ["Unsolicited new product pitches"],
    preferences: ["Single annual call, written summary after"],
    interests: ["Renovating their Luzern townhouse"],
    relationships: [{ name: "Bachmann GmbH", role: "Family construction firm" }],
    notes: [{ date: "2026-03-22", text: "Plans CHF 600k withdrawal in Q4 for property renovation." }],
    holdings: [
      { ticker: "NESN.SW", name: "Nestlé", weight: 3.4, sector: "Consumer Staples" },
      { ticker: "UBSG.SW", name: "UBS Group", weight: 2.6, sector: "Financials" },
    ],
    allocation: defaultAllocBalanced,
    lastContact: "2 weeks ago",
  }),
  mkLite({
    id: "c-petrov", name: "Dimitri Petrov", segment: "UHNWI",
    mandate: "Growth, Cross-border (UK/CH)", aum: 65.0,
    strategy: "Global Growth, alts overweight", domicile: "Zürich, CH (London prev.)", timezone: "CET",
    channel: "WhatsApp", style: "Macro-focused", archetype: "The Macro Trader", risk: 9,
    values: ["Fast execution", "Direct CIO access", "Crypto and private credit exposure"],
    sensitivities: ["Slow back-office", "Regulatory flags on Russian-origin wealth"],
    preferences: ["WhatsApp first, email second"],
    interests: ["Energy macro", "Digital assets"],
    relationships: [{ name: "Sandgate Capital UK Ltd.", role: "Family investment vehicle, London" }],
    notes: [{ date: "2026-05-15", text: "Asked about a 5% allocation to Bitcoin via the bank's structured note." }],
    holdings: [
      { ticker: "NVDA", name: "Nvidia Corp.", weight: 7.0, sector: "Information Technology" },
      { ticker: "BTC", name: "Bitcoin (structured note)", weight: 4.0, sector: "Crypto" },
      { ticker: "XOM", name: "ExxonMobil", weight: 3.5, sector: "Energy" },
    ],
    allocation: defaultAllocGrowth,
    lastContact: "Yesterday",
  }),
  mkLite({
    id: "c-zumstein", name: "Familie Zumstein-Brunner", segment: "UHNWI",
    mandate: "Balanced, Global Discretionary", aum: 22.0,
    strategy: "Global Balanced, Swiss SME owner", domicile: "St. Gallen, CH", timezone: "CET",
    channel: "In-Person", style: "Narrative-first", archetype: "The Mittelstand Family", risk: 5,
    values: ["Long-term partnership with the bank", "Conservative on FX risk"],
    sensitivities: ["Concentration in industrials (mirrors operating business)"],
    preferences: ["Annual review at their HQ in St. Gallen"],
    interests: ["Swiss industrial automation", "Sponsoring local football club"],
    relationships: [{ name: "Zumstein Präzision AG", role: "Family precision-parts manufacturer" }],
    notes: [{ date: "2026-04-08", text: "Considering selling 15% of the operating business to a strategic." }],
    holdings: [
      { ticker: "ABBN.SW", name: "ABB Ltd.", weight: 3.4, sector: "Industrials" },
      { ticker: "SCHP.SW", name: "Schindler", weight: 2.8, sector: "Industrials" },
      { ticker: "VACN.SW", name: "VAT Group", weight: 2.0, sector: "Industrials" },
    ],
    allocation: defaultAllocBalanced,
    lastContact: "10 days ago",
  }),
  mkLite({
    id: "c-meyer", name: "Theresa Meyer", segment: "HNWI",
    mandate: "Defensive, Global Discretionary", aum: 8.5,
    strategy: "Global Defensive, income focus", domicile: "Winterthur, CH", timezone: "CET",
    channel: "Phone", style: "Risk-sensitive", archetype: "The Widowed Steward", risk: 2,
    values: ["Income that pays monthly bills", "Total transparency on fees"],
    sensitivities: ["Any equity drawdown over 10%", "Complex structured products"],
    preferences: ["Monthly statement called through on the phone"],
    interests: ["Grandchildren's education planning"],
    relationships: [{ name: "Two grandchildren", role: "Education sub-accounts" }],
    notes: [{ date: "2026-05-25", text: "Set up two CHF 50k education sub-accounts for grandchildren." }],
    holdings: [
      { ticker: "SCMN.SW", name: "Swisscom", weight: 3.2, sector: "Telecom" },
      { ticker: "BKW.SW", name: "BKW AG", weight: 2.6, sector: "Utilities" },
    ],
    allocation: defaultAllocDefensive,
    lastContact: "2 days ago",
  }),
  mkLite({
    id: "c-aldrin", name: "Aldrin Family Trust (US/CH)", segment: "UHNWI",
    mandate: "Growth, Cross-border (US/CH)", aum: 85.0,
    strategy: "Global Growth, US tech tilt", domicile: "Zug, CH (US persons)", timezone: "CET",
    channel: "Email", style: "Numbers-first", archetype: "The US Cross-border Family", risk: 7,
    values: ["FATCA-clean reporting", "Access to US single stocks"],
    sensitivities: ["PFIC exposure", "Anything not 1099-friendly"],
    preferences: ["Quarterly Zoom with US tax counsel CC'd"],
    interests: ["US tech compounders", "Stanford alumni network"],
    relationships: [{ name: "Aldrin Family LLC", role: "Delaware vehicle" }, { name: "K&L Gates", role: "US tax counsel" }],
    notes: [{ date: "2026-05-06", text: "Pulled forward annual review; trustees want a FATCA refresh." }],
    holdings: [
      { ticker: "MSFT", name: "Microsoft Corp.", weight: 6.0, sector: "Information Technology" },
      { ticker: "GOOGL", name: "Alphabet Inc.", weight: 5.2, sector: "Communication Services" },
      { ticker: "AMZN", name: "Amazon.com", weight: 4.8, sector: "Consumer Discretionary" },
      { ticker: "BRK.B", name: "Berkshire Hathaway", weight: 3.5, sector: "Financials" },
    ],
    allocation: defaultAllocGrowth,
    lastContact: "6 days ago",
  }),
];

clients.push(...extraClients);

// ─────────────────────────────────────────────────────────────────────────
// RECOMMENDATIONS, one per persona, anchored to the trigger event in the
// persona slides.
// ─────────────────────────────────────────────────────────────────────────

export const recommendations: Recommendation[] = [
  // PERSONA 1, Schneider, Personal Connection
  {
    id: "r-1",
    clientId: "c-schneider",
    affectedTicker: "NOVN.SW",
    title: "Rotate Novartis to Roche, neurology pipeline alignment",
    category: "Reputational",
    priority: "High",
    advised: "Swap the full 5.8% Novartis position into Roche (same sector, active neurodegenerative pipeline).",
    trigger: "Novartis announced restructuring of its chronic-disease division, including a wind-down of two neurodegenerative programmes.",
    whyClient: "Hubertus explicitly asked us in March to audit our pharma names for neurology commitment. The family's foundation funds research in exactly this field.",
    whyAction: "Roche keeps the Health Care weight intact, the CIO list rates it Buy, and its neurology + diagnostics flywheel is materially exposed to the disease area the family cares about.",
    impact: { portfolioFit: 88, riskDelta: "−0.1% portfolio vol", expectedReturn: "+0.3% 12m est.", sectorShift: "Health Care weight unchanged" },
    reason: {
      storyline:
        "Novartis just shelved two neurodegenerative programmes [1], precisely the move Hubertus warned us about [3]. Roche is on the CIO Buy list [2] and remains one of the most active neurology platforms in Europe, a same-sector substitute that quietly honours the family's purpose.",
      sources: [
        { label: "Novartis restructures chronic-disease R&D", outlet: "Reuters Health", date: "Jun 18, 2026", url: "https://www.reuters.com/", excerpt: "Two neurology programmes discontinued; capital redirected to oncology." },
        { label: "CIO Recommendation List, Roche Buy", outlet: "CIO Office", date: "Jan 15, 2026", url: "#cio-roche-buy", excerpt: "Diagnostics-pharma flywheel, durable franchises." },
        { label: "RM note, Hubertus pharma-pipeline audit", outlet: "Salesforce CRM", date: "Mar 05, 2026", url: "#crm-schneider-mar05", excerpt: "Hubertus replied with intense purpose, asking for full pipeline audit." },
      ],
    },
    compliance: { mandateOk: true, suitabilityOk: true, cioApproved: true, regulatoryFlags: [] },
    confidence: {
      score: 88,
      dataFreshness: "Reuters story 2d old, CIO note 5m old, RM note 107d old",
      modelNote: "Matched the Novartis announcement against the CRM audit request, then ranked all CIO Buy-rated European pharma names by neurology R&D spend share. Roche led on both criteria.",
      assumptions: [
        "Hubertus's mandate intent from January (capital must act with purpose) still binds.",
        "Roche keeps its current neurology pipeline scope through 2027.",
      ],
      unknowns: [
        "Whether Hubertus has spoken to Dr. Frei this week about the Novartis cut.",
        "How fast the foundation will need its next capital tranche, may favour delaying execution by a day.",
      ],
    },
    counterArguments: [
      "Novartis often reverses programme cuts within 12 months, the rotation could lock in a sentiment-driven loss.",
      "Roche's diagnostics business carries its own pricing-pressure risk, swapping one regulatory headline for another.",
      "Hubertus is overseas this week, sending without a voice conversation first may feel impersonal.",
    ],
    alternatives: [
      { option: "Hold Novartis, write Hubertus a context note", whyNot: "He has told us, in writing, he will not stay invested in names that cut neurology research." },
      { option: "Rotate into Lonza", whyNot: "Wrong end of the pharma value chain, no direct neurology angle." },
    ],
    pastTrack: { similarCases: 3, hitRate: "3 of 3 approved within 48h", lastExample: "Roche overweight in Q4 2025, approved same day." },
    revenueImpact: {
      feesChf: "+ CHF 7.4k / yr execution + discretionary uplift",
      crossSell: "Natural lead-in to a values-aligned thematic neurology basket, est. CHF 22k / yr advisory.",
      retentionLift: "Acting on Chloe's cause without naming her is the single highest-trust signal we can send this year.",
    },
    personalImpact: {
      angle: "Family",
      story: "Hubertus and Carmen rebuilt this mandate around Chloe. A quiet, principled rotation, no headline, no fanfare, says we understood without being told twice.",
    },
    outreach: {
      channel: "Phone",
      timing: "Today, 17:30 CET (after Hubertus's US calls)",
      timingReason: "Hubertus is travelling but typically takes one call between 17:00 and 19:00 CET, before family dinner.",
      style: "Values-driven",
      subject: "Pharma rotation aligned with your March request",
      message:
        "Dear Hubertus,\n\nNovartis announced today that it is winding down two of its neurodegenerative programmes. This is exactly the situation you asked us to watch for in March. I would like to propose moving the full Novartis position into Roche, same sector, on the CIO Buy list, and with an active neurology + diagnostics pipeline.\n\nNo change to the overall strategy or risk profile. A short call when it suits you, I would rather walk you through this in person than send it cold.\n\nWith care,\nSarah",
      variants: [
        { style: "Values-driven", label: "Warm, purpose-led", bestFor: ["Phone", "Email"],
          subject: "Pharma rotation aligned with your March request",
          message:
            "Dear Hubertus,\n\nNovartis announced today that it is winding down two of its neurodegenerative programmes. This is exactly the situation you asked us to watch for in March. I would like to propose moving the full Novartis position into Roche, same sector, on the CIO Buy list, and with an active neurology + diagnostics pipeline.\n\nNo change to the overall strategy or risk profile. A short call when it suits you, I would rather walk you through this in person than send it cold.\n\nWith care,\nSarah" },
        { style: "Concise", label: "Short & factual", bestFor: ["WhatsApp", "Phone"],
          subject: "Novartis to Roche, neurology alignment",
          message: "Hubertus, Novartis just cut two neurology programmes. Proposing full rotation into Roche, same sector, CIO Buy. Aligned with the audit you asked for in March. Call when it suits you. Sarah." },
      ],
    },
  },

  // PERSONA 2, Huber, Purpose-Driven Investor
  {
    id: "r-2",
    clientId: "c-huber",
    affectedTicker: "UNA.AS",
    title: "Good news briefing, increase Unilever, authentic sustainability move",
    category: "Opportunity",
    priority: "Medium",
    advised: "Increase Unilever from 4.2% to 5.5% within the staples sleeve.",
    trigger: "Unilever cut all palm-oil suppliers tied to deforestation and committed CHF 280m to a Brazilian reforestation foundation.",
    whyClient: "Elena and Marius have asked us, repeatedly, to call when companies they own do something magnificent, not only when stocks drop.",
    whyAction: "Unilever is already in the staples sleeve, on the CIO Buy list, and the announcement directly mirrors the Huber Stiftung's own Atlantic Forest work. Adding 1.3% honours their preference without disturbing the Defensive allocation bands.",
    impact: { portfolioFit: 91, riskDelta: "neutral", expectedReturn: "+0.2% 12m est.", sectorShift: "Consumer Staples +1.3%" },
    reason: {
      storyline:
        "Unilever's announcement [1] is the rare corporate move that matches the Hubers' values in substance, not slogan, and lines up with their foundation's own work [3]. The CIO Buy stance [2] gives us cover to act without a values-versus-returns trade-off.",
      sources: [
        { label: "Unilever palm-oil + reforestation announcement", outlet: "Mongabay", date: "May 20, 2026", url: "#unilever-announcement", excerpt: "Suppliers cut, CHF 280m reforestation foundation launched in Brazil." },
        { label: "CIO Recommendation, Unilever Buy", outlet: "CIO Office", date: "May 21, 2026", url: "#cio-unilever-buy", excerpt: "Sustainability-led re-rating supports a small overweight." },
        { label: "Huber Stiftung programme, Atlantic Forest", outlet: "Foundation report", date: "Mar 2026", url: "#huber-stiftung-2026", excerpt: "Direct programme overlap with Unilever's new commitment." },
      ],
    },
    compliance: { mandateOk: true, suitabilityOk: true, cioApproved: true, regulatoryFlags: [] },
    confidence: {
      score: 82,
      dataFreshness: "Announcement 1d old, CIO note <24h old, foundation report Mar 2026",
      modelNote: "Cross-referenced the Unilever announcement against the Huber Stiftung's published programmes and Marius's recorded statements. Authenticity signal scored 0.86 against the bank's greenwash filter.",
      assumptions: [
        "The announcement holds, no quiet softening within 90 days.",
        "Elena will appreciate a 'good news' call even while travelling.",
      ],
      unknowns: [
        "Whether Marius reads this as marketing or substance, only a conversation will tell.",
        "Whether the Huber Stiftung wants any formal coordination with Unilever's new vehicle.",
      ],
    },
    counterArguments: [
      "Unilever's stock already rallied 3.1% on the day, the entry point is no longer ideal.",
      "ESG announcements have a history of being walked back within a year, a small overweight could become an unforced error.",
      "Adding to staples nudges the Defensive equity sleeve toward its upper band.",
    ],
    alternatives: [
      { option: "Send a 'good news briefing' without a trade", whyNot: "Acceptable, but misses the chance to translate values into a portfolio expression." },
      { option: "Initiate a thematic biodiversity basket instead", whyNot: "Worth scoping for Q3, but introduces too many new names at once for a Defensive mandate." },
    ],
    pastTrack: { similarCases: 5, hitRate: "4 of 5 approved within a week", lastExample: "Ørsted overweight, Mar 2025, approved in 3 days." },
    revenueImpact: {
      feesChf: "+ CHF 2.1k / yr execution",
      crossSell: "Strong opener for a discretionary biodiversity-thematic mandate, est. CHF 35k / yr.",
      retentionLift: "This is the single message Elena said she wanted from us. Delivering it is the renewal conversation, three years early.",
    },
    personalImpact: {
      angle: "Philanthropy",
      story: "Marius told us, in May, that we should call when something is right. This is the call. It costs us nothing to make it personal, and it does what Elena asked for, out loud, two reviews ago.",
    },
    outreach: {
      channel: "Phone",
      timing: "Tomorrow, 09:30 CET",
      timingReason: "Elena prefers a morning call when she is in Switzerland, before the day's foundation work.",
      style: "Values-driven",
      subject: "Good news for once, Unilever just did the right thing",
      message:
        "Dear Marius and Elena,\n\nA rare 'good news' call. Unilever, which you already hold in the staples sleeve, has cut all palm-oil suppliers tied to deforestation and committed CHF 280m to a Brazilian reforestation foundation. It overlaps directly with the Stiftung's Atlantic Forest work.\n\nThe CIO has lifted Unilever to Buy on the back of this. I would like to propose adding a small overweight (1.3%) within the existing staples sleeve, fully inside your Defensive bands. Happy to call you on Wednesday morning to walk through it.\n\nWith genuine pleasure,\nSarah",
      variants: [
        { style: "Narrative-first", label: "Story-led, warm", bestFor: ["Phone", "In-Person"],
          subject: "A 'good news' call, Unilever and the Atlantic Forest",
          message: "Marius, Elena, I promised to call when something genuinely good happens. Unilever just did it: palm-oil suppliers cut, CHF 280m reforestation foundation in Brazil. It mirrors the Stiftung's work. Proposing a small overweight, within Defensive bands. Sarah." },
      ],
    },
  },

  // PERSONA 3, Räber, Defensive Value Investor
  {
    id: "r-3",
    clientId: "c-raeber",
    affectedTicker: "NESN.SW",
    title: "Reject CIO TAA, propose Schindler + Siemens compromise",
    category: "Macro",
    priority: "High",
    advised: "Reject the CIO's proposed Nestlé / Novartis cut into US AI names. Counter-propose a small (+2%) tilt into Schindler and Siemens within European industrial automation.",
    trigger: "Bank-wide TAA update from the CIO desk recommends slashing dividend-paying Swiss blue chips to fund Nvidia and Microsoft positions.",
    whyClient: "The Räbers have told us, on the record, four times that they will not own US mega-cap tech. This rebalancing would breach the spirit and the letter of their mandate.",
    whyAction: "European industrial automation, in 'familiar packaging' (Eugen's words, Feb 17), gives them exposure to the structural trend the CIO is chasing, without the names they reject. Schindler and Siemens are on the CIO list and pay reliable dividends.",
    impact: { portfolioFit: 79, riskDelta: "+0.1% portfolio vol", expectedReturn: "+0.3% 12m est.", sectorShift: "Industrials +2%, no change to staples / healthcare" },
    reason: {
      storyline:
        "The CIO's TAA call asks us to fund Nvidia and Microsoft by selling Nestlé and Novartis [1]. That directly violates the Räbers' written mandate and their repeated verbal preferences [2]. Eugen has, however, opened a small door to European industrial automation [3], which is the cleanest way to honour the macro thesis without breaking trust.",
      sources: [
        { label: "CIO TAA update, May 20", outlet: "CIO Office", date: "May 20, 2026", url: "#cio-taa-may20", excerpt: "Tactical: reduce European staples / healthcare, increase US AI infra." },
        { label: "Mandate clause + CRM history", outlet: "Salesforce CRM", date: "2023-2026", url: "#crm-raeber-mandate", excerpt: "Four explicit refusals of US mega-cap tech across the relationship." },
        { label: "Eugen's automation question", outlet: "Salesforce CRM", date: "Feb 17, 2026", url: "#crm-raeber-feb17", excerpt: "Asked if there was a 'safe' way to participate in European automation." },
      ],
    },
    compliance: { mandateOk: true, suitabilityOk: true, cioApproved: true, regulatoryFlags: ["Mandate-bias override logged"] },
    confidence: {
      score: 86,
      dataFreshness: "TAA 31d old, CRM mandate history 7+ entries, automation note 4m old",
      modelNote: "We are explicitly overriding the bank-wide TAA for this account based on a documented client preference. Schindler + Siemens chosen for: CIO Buy status, dividend continuity, and familiarity to a Swiss industrial-engineering family.",
      assumptions: [
        "Eugen's Feb 17 opening to automation has not cooled.",
        "The CIO desk accepts mandate-bias overrides logged through the standard channel.",
      ],
      unknowns: [
        "Whether Eugen wants any technology exposure at all this year, or whether 2026 stays defensive.",
        "Whether Lisa has views, she rarely engages on investment matters but is on the relationship.",
      ],
    },
    counterArguments: [
      "If US AI continues to outperform, Eugen may eventually regret the missed beta, this is a deliberate, reasoned choice not to chase it.",
      "Schindler and Siemens are not zero-risk, both have cyclical and China-exposure questions.",
      "Two new names introduce execution work for a client who values quiet.",
    ],
    alternatives: [
      { option: "Implement the CIO TAA as written", whyNot: "Direct violation of mandate language and four-time stated preference, near-certain client rupture." },
      { option: "Hold and do nothing", whyNot: "Misses Eugen's own opened door from Feb 17; we have a small mandate to do something thoughtful." },
      { option: "Use a European industrial automation ETF instead of single names", whyNot: "Cleaner operationally, but the Räbers prefer named, recognisable Swiss/European blue chips." },
    ],
    pastTrack: { similarCases: 2, hitRate: "2 of 2 approved", lastExample: "Roche overweight via CIO Buy, Oct 2025, approved in writing." },
    revenueImpact: {
      feesChf: "+ CHF 3.6k / yr execution",
      crossSell: "Limited, the value here is mandate protection, not revenue.",
      retentionLift: "The Räbers' biggest expressed fear is being treated like a generic mandate. Honouring their stated boundary is the renewal.",
    },
    personalImpact: {
      angle: "Identity",
      story: "Eugen built his wealth in things he could touch. Buying him into Nvidia would not be a portfolio choice, it would be telling him we never listened. Schindler and Siemens are the modern grandchildren of his world.",
    },
    outreach: {
      channel: "Phone",
      timing: "Wednesday, 10:30 CET, with written follow-up the same afternoon",
      timingReason: "Eugen prefers mid-morning calls with a precise agenda, and always expects written confirmation by end-of-day.",
      style: "Risk-sensitive",
      subject: "The CIO update, and what we recommend for you specifically",
      message:
        "Sehr geehrter Herr Räber,\n\nthe bank's CIO desk issued a tactical update last month recommending a rotation out of Nestlé and Novartis into US technology names. This does not match what you and Mrs. Räber have asked of us, and we will not implement it as written.\n\nWe would like to propose, instead, a small (+2%) tilt into Schindler and Siemens, two European industrial-automation names already on the CIO Buy list, with stable dividend records. This honours the structural trend without crossing the boundaries you set.\n\nI will call you on Wednesday at 10:30 to walk you through, and confirm in writing the same afternoon.\n\nMit freundlichen Grüssen,\nSarah Meier",
      variants: [
        { style: "Risk-sensitive", label: "Formal, mandate-led", bestFor: ["Phone", "Email"],
          subject: "The CIO update, and what we recommend for you specifically",
          message: "Sehr geehrter Herr Räber, the bank's CIO recommended a rotation we will not implement for you, it would breach your stated boundaries. We propose instead a small +2% Schindler / Siemens tilt in European industrial automation. Phone call Wednesday 10:30 CET, written confirmation same day. Mit freundlichen Grüssen, Sarah Meier." },
      ],
    },
  },

  // PERSONA 4, Ammann, Corporate Reputation Case
  {
    id: "r-4",
    clientId: "c-ammann",
    affectedTicker: "AMZN",
    title: "Exit Amazon, swap into Costco, reputation screen breach",
    category: "Reputational",
    priority: "High",
    advised: "Exit the full 5.4% Amazon position. Redeploy 3.0% into Costco (already held, raise to 7.1%) and 2.4% into Richemont (raise to 6.2%).",
    trigger: "Investigative report (Tages-Anzeiger / Guardian co-publication) on systemic warehouse-worker underpayment and exploitation at Amazon EU fulfilment centres.",
    whyClient: "Julian's mandate explicitly excludes names in active labour or governance backlash. Any photograph of his brand next to a scandal name is, in his words, a 'massive unquantifiable risk'.",
    whyAction: "Costco is the cleanest sector substitute on governance and labour reputation, already held, no onboarding friction. Richemont offers a Swiss governance-clean luxury tilt and is on the CIO Buy list.",
    impact: { portfolioFit: 84, riskDelta: "−0.4% portfolio vol", expectedReturn: "neutral 12m est.", sectorShift: "Consumer Discretionary unchanged, Consumer Staples +3%" },
    reason: {
      storyline:
        "An investigative scandal is hitting Amazon's EU warehouse practices [1], the textbook fact pattern Julian's mandate is built to avoid [3]. Costco is the cleanest substitute, repeatedly cited in governance peer-comparisons [2]. Richemont absorbs the rest, Swiss, governance-clean, CIO Buy.",
      sources: [
        { label: "Amazon warehouse-labour investigation", outlet: "Tages-Anzeiger / The Guardian", date: "May 20, 2026", url: "#amzn-investigation", excerpt: "Systemic underpayment, internal whistleblowers cited." },
        { label: "Costco governance peer-comparison", outlet: "CIO Office", date: "Apr 02, 2026", url: "#cio-costco-peer", excerpt: "Top-quartile labour governance among global retail peers." },
        { label: "Mandate clause, Ammann", outlet: "Salesforce CRM", date: "Jun 20, 2023", url: "#crm-ammann-mandate", excerpt: "Cannot hold names in active labour or governance backlash." },
      ],
    },
    compliance: { mandateOk: true, suitabilityOk: true, cioApproved: true, regulatoryFlags: ["Reputation-screen breach"] },
    confidence: {
      score: 90,
      dataFreshness: "Investigation 1d old, CIO peer-comp 9w old, mandate clause 3y old (active)",
      modelNote: "Hard mandate-breach event, the AI only ranked substitutions. Costco won on governance, dividend continuity, and zero onboarding friction; Richemont on Swiss home-bias + CIO Buy.",
      assumptions: [
        "The investigation will not be retracted within 30 days.",
        "Julian's mandate exclusion still applies as written (last reaffirmed at handover, Jan 2026).",
      ],
      unknowns: [
        "Whether Julian's PR team has a position on the story that could change the urgency.",
        "Whether he prefers Richemont or a US clean-governance peer (Tractor Supply, Home Depot) as the second leg.",
      ],
    },
    counterArguments: [
      "Amazon often recovers within 60 days from labour-related drawdowns, the exit locks in the gap.",
      "Costco trades near the top of its valuation range, multiple compression could absorb the carry pickup.",
      "A two-leg substitution introduces more execution risk than a single full reallocation.",
    ],
    alternatives: [
      { option: "Half-exit Amazon, monitor for 30 days", whyNot: "Leaves Julian's brand photographed next to a scandal name. He has been explicit: this is not survivable." },
      { option: "Reallocate fully to Costco", whyNot: "Concentrates a single name above his comfort band, breaches his own correlation request from May 14." },
      { option: "Engage rather than divest (vote proxies)", whyNot: "Mandate is exclusionary, not engagement-based. Conflicts with Julian's written instruction." },
    ],
    pastTrack: { similarCases: 4, hitRate: "4 of 4 approved within 24h", lastExample: "Boohoo exit, Aug 2023, approved in 6 hours after a labour scandal." },
    revenueImpact: {
      feesChf: "+ CHF 9.8k / yr execution + two new sizing reviews",
      crossSell: "Solid trigger for a discretionary 'reputation-screened' US equity sleeve, est. CHF 60k / yr.",
      retentionLift: "Acting on the clause he built the mandate around is the renewal signal for a public-figure client.",
    },
    personalImpact: {
      angle: "Identity",
      story: "Julian's portfolio and his brand share a single risk surface in his mind. Removing the scandal name before the press cycle escalates is the quietest, most professional service we can offer him this year.",
    },
    outreach: {
      channel: "Email",
      timing: "Today, 12:45 CET, with phone follow-up via Sandra Vogel",
      timingReason: "Julian reads briefings over lunch, Sandra typically books a call slot within 90 minutes.",
      style: "Numbers-first",
      subject: "Mandate breach, AMZN, substitution proposal attached",
      message:
        "Dear Julian,\n\nan investigative report published this morning into Amazon's EU warehouse-labour practices triggers your mandate exclusion. We propose:\n\n— Exit AMZN, full 5.4%.\n— Add 3.0% to Costco (governance peer, already held), bringing it to 7.1%.\n— Add 2.4% to Richemont (Swiss, CIO Buy), bringing it to 6.2%.\n\nNet portfolio vol −0.4%, expected 12m return roughly neutral, reputation-screen breach closed. Full backing pack attached. Approve to execute at next open.\n\nBest,\nSarah Meier",
      variants: [
        { style: "Numbers-first", label: "Email, executive", bestFor: ["Email"],
          subject: "Mandate breach, AMZN, substitution proposal attached",
          message: "Julian, AMZN labour investigation triggers your exclusion. Proposing: full exit AMZN 5.4%, +3.0% Costco (to 7.1%), +2.4% Richemont (to 6.2%). Vol −0.4%, return neutral. Pack attached. Approve to execute at open. Sarah." },
        { style: "Concise", label: "Assistant brief", bestFor: ["Assistant"],
          subject: "For Julian: AMZN exit + substitutions",
          message: "Sandra, please forward the attached pack to Julian. Mandate-breach event on AMZN, proposed full exit + Costco / Richemont substitutions, awaiting his approval to execute. Thank you, Sarah." },
      ],
    },
  },
];

// ─────────────────────────────────────────────────────────────────────────
// MARKET EVENTS, one per persona trigger, plus one cross-cutting opportunity.
// ─────────────────────────────────────────────────────────────────────────

export const marketEvents: MarketEvent[] = [
  {
    id: "e-novartis-neuro",
    kind: "Risk",
    title: "Novartis shuts down two neurology drug programmes",
    summary:
      "Novartis confirmed this morning that it is winding down two flagship neurodegenerative-disease programmes to refocus on oncology. Stock −2.4% pre-market. Directly conflicts with the Schneider family's stated purpose (funding neurology research for their daughter).",
    severity: "High",
    category: "Reputational",
    date: "Jun 20, 2026 · 06:50 CET",
    sources: [
      { label: "Novartis restructures chronic-disease R&D", outlet: "Reuters Health", date: "Jun 20, 2026", url: "https://www.reuters.com/", excerpt: "Capital redirected to oncology and immunology pipelines." },
      { label: "CIO note, Novartis Buy stance under review", outlet: "CIO Office", date: "Jun 20, 2026", url: "#cio-novn-review", excerpt: "Rating moved to Hold pending pipeline clarification." },
    ],
    affected: [
      { clientId: "c-schneider", ticker: "NOVN.SW", exposurePct: 5.8, exposureChf: 0.58 },
      { clientId: "c-raeber", ticker: "NOVN.SW", exposurePct: 4.2, exposureChf: 0.42 },
      { clientId: "c-stadler", ticker: "NOVN.SW", exposurePct: 5.0, exposureChf: 0.90 },
    ],
  },
  {
    id: "e-unilever-palmoil",
    kind: "Opportunity",
    title: "Unilever drops deforestation suppliers, funds Brazil reforestation",
    summary:
      "Unilever cut every palm-oil supplier linked to Amazon deforestation and committed CHF 280m to a new Brazilian reforestation foundation. CIO desk upgraded to Buy, stock +3.1%. A clean fit for Elena Huber's reforestation work in Peru and Brazil.",
    severity: "Medium",
    category: "Opportunity",
    date: "Jun 20, 2026 · 07:30 CET",
    sources: [
      { label: "Unilever palm-oil + reforestation announcement", outlet: "Mongabay", date: "May 20, 2026", url: "#unilever-announcement", excerpt: "Suppliers cut; CHF 280m reforestation foundation launched in Brazil." },
      { label: "CIO upgrade to Buy", outlet: "CIO Office", date: "May 21, 2026", url: "#cio-unilever-buy", excerpt: "Sustainability-led re-rating supports a small overweight." },
    ],
    affected: [
      { clientId: "c-huber", ticker: "UNA.AS", fitScore: 96, fitReason: "Mirrors the Huber Stiftung's Atlantic Forest work. Already held in the staples sleeve.", suggestedAllocChf: 0.13 },
      { clientId: "c-merian", ticker: "UNA.AS", fitScore: 82, fitReason: "Aligns with Dr. Merian's hard ESG screen.", suggestedAllocChf: 0.20 },
      { clientId: "c-schneider", ticker: "UNA.AS", fitScore: 64, fitReason: "Honours the family's purpose-led mandate. Caveat: not currently held.", suggestedAllocChf: 0.10 },
    ],
  },
  {
    id: "e-cio-taa-tech",
    kind: "Risk",
    title: "CIO recommends rotating out of Swiss staples into US AI names",
    summary:
      "The bank's CIO desk issued a tactical update: trim European dividend-paying blue chips (Nestlé, Novartis) and buy Nvidia and Microsoft. Directly conflicts with the Räbers' written mandate, which forbids speculative US tech.",
    severity: "High",
    category: "Macro",
    date: "May 20, 2026 · 09:00 CET",
    sources: [
      { label: "CIO TAA update", outlet: "CIO Office", date: "May 20, 2026", url: "#cio-taa-may20", excerpt: "Tactical: reduce European staples / healthcare, increase US AI infrastructure." },
    ],
    affected: [
      { clientId: "c-raeber", ticker: "NESN.SW", exposurePct: 4.8, exposureChf: 0.48 },
      { clientId: "c-raeber", ticker: "NOVN.SW", exposurePct: 4.2, exposureChf: 0.42 },
      { clientId: "c-favre", ticker: "NESN.SW", exposurePct: 4.2, exposureChf: 0.53 },
      { clientId: "c-meyer", ticker: "SCMN.SW", exposurePct: 3.2, exposureChf: 0.27 },
    ],
  },
  {
    id: "e-amazon-labour",
    kind: "Risk",
    title: "Amazon hit by EU warehouse-labour investigation",
    summary:
      "Tages-Anzeiger and The Guardian co-published an investigation alleging systemic underpayment and exploitation across Amazon's EU fulfilment network. AMZN −4.6% pre-market. Triggers Ammann's reputation-screen mandate (his own retail brand could be tainted by association).",
    severity: "High",
    category: "Reputational",
    date: "Jun 20, 2026 · 06:30 CET",
    sources: [
      { label: "AMZN warehouse-labour investigation", outlet: "Tages-Anzeiger / The Guardian", date: "Jun 20, 2026", url: "#amzn-investigation", excerpt: "Systemic underpayment, internal whistleblowers cited." },
      { label: "CIO governance peer-comparison", outlet: "CIO Office", date: "Apr 02, 2026", url: "#cio-costco-peer", excerpt: "Costco top-quartile on labour governance vs global retail peers." },
    ],
    affected: [
      { clientId: "c-ammann", ticker: "AMZN", exposurePct: 5.4, exposureChf: 0.54 },
      { clientId: "c-aldrin", ticker: "AMZN", exposurePct: 4.8, exposureChf: 4.08 },
    ],
  },
  {
    id: "e-roche-neuro-buy",
    kind: "Opportunity",
    title: "Roche posts positive Phase III for Parkinson's drug",
    summary:
      "Roche reported a successful Phase III readout on its lead Parkinson's asset. CIO upgraded Roche to Buy. Strong narrative fit for the Schneider family foundation and for Karin Stadler's biotech-focused mandate.",
    severity: "Medium",
    category: "Opportunity",
    date: "Jun 19, 2026 · 17:45 CET",
    sources: [
      { label: "Roche Phase III readout, Parkinson's", outlet: "Roche IR", date: "Jun 19, 2026", url: "#roche-phase3", excerpt: "Primary endpoint met with statistical significance." },
      { label: "CIO upgrade, Roche to Buy", outlet: "CIO Office", date: "Jun 19, 2026", url: "#cio-roche-buy" },
    ],
    affected: [
      { clientId: "c-schneider", ticker: "ROG.SW", fitScore: 98, fitReason: "Direct alignment with the family's neurology mission.", suggestedAllocChf: 0.58 },
      { clientId: "c-stadler", ticker: "ROG.SW", fitScore: 91, fitReason: "Adds conviction to her biotech overweight.", suggestedAllocChf: 0.40 },
      { clientId: "c-merian", ticker: "ROG.SW", fitScore: 76, fitReason: "ESG-clean Swiss healthcare anchor.", suggestedAllocChf: 0.30 },
    ],
  },
  {
    id: "e-china-mobile-sell",
    kind: "Risk",
    title: "CIO downgrades China Mobile to Sell on state-control risk",
    summary:
      "Following tightening Chinese state-control rules on telecom operators, the CIO downgraded China Mobile to Sell. Recommendation: exit the position across all mandates where held.",
    severity: "Medium",
    category: "Macro",
    date: "May 03, 2026 · 14:10 CET",
    sources: [
      { label: "CIO downgrade, China Mobile", outlet: "CIO Office", date: "May 03, 2026", url: "#cio-cm-sell" },
    ],
    affected: [
      { clientId: "c-petrov", ticker: "0941.HK", exposurePct: 1.4, exposureChf: 0.91 },
      { clientId: "c-aldrin", ticker: "0941.HK", exposurePct: 0.8, exposureChf: 0.68 },
    ],
  },
  {
    id: "e-richemont-luxury",
    kind: "Opportunity",
    title: "Richemont guides ahead on Asia luxury rebound",
    summary:
      "Richemont pre-announced FY revenue 6% above consensus on a stronger-than-expected Greater China rebound. CIO maintains Buy. Natural fit for clients with a luxury / cross-border European tilt.",
    severity: "Low",
    category: "Opportunity",
    date: "Jun 18, 2026 · 08:00 CET",
    sources: [
      { label: "Richemont trading update", outlet: "Richemont IR", date: "Jun 18, 2026", url: "#richemont-update" },
    ],
    affected: [
      { clientId: "c-rossi", ticker: "CFR.SW", fitScore: 88, fitReason: "Family identifies with European luxury heritage.", suggestedAllocChf: 0.45 },
      { clientId: "c-blattmann", ticker: "CFR.SW", fitScore: 70, fitReason: "Quality compounder for the growth sleeve.", suggestedAllocChf: 0.40 },
    ],
  },
  {
    id: "e-bitcoin-note",
    kind: "Opportunity",
    title: "Bank launches CHF-settled Bitcoin structured note",
    summary:
      "Treasury issued a new CHF-settled Bitcoin participation note with 90% capital protection at maturity. Useful for clients who have asked about regulated digital-asset exposure.",
    severity: "Low",
    category: "Opportunity",
    date: "May 28, 2026 · 11:00 CET",
    sources: [
      { label: "Product launch, BTC participation note", outlet: "Bank Treasury", date: "May 28, 2026", url: "#btc-note" },
    ],
    affected: [
      { clientId: "c-petrov", ticker: "BTC", fitScore: 94, fitReason: "Has explicitly asked for a 5% Bitcoin allocation.", suggestedAllocChf: 3.25 },
      { clientId: "c-blattmann", ticker: "BTC", fitScore: 58, fitReason: "Innovation-led growth bias, small satellite makes sense.", suggestedAllocChf: 0.84 },
    ],
  },
];

export const kpis = {
  clients: clients.length,
  aum: clients.reduce((s, c) => s + c.aum, 0),
  netNewMoney: 4.2,
  profitability: 1.18,
};

export const getClient = (id: string) => clients.find((c) => c.id === id)!;
export const getRecommendation = (id: string) => recommendations.find((r) => r.id === id)!;
export const getEvent = (id: string) => marketEvents.find((e) => e.id === id)!;
export const findRecByTicker = (clientId: string, ticker: string) =>
  recommendations.find((r) => r.clientId === clientId && r.affectedTicker === ticker);
export const getRecsForClient = (clientId: string) => recommendations.filter((r) => r.clientId === clientId);
export const findEventByTicker = (ticker: string) =>
  marketEvents.find((e) => e.affected.some((a) => a.ticker === ticker));
