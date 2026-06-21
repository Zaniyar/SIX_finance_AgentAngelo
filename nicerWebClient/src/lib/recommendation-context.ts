import type { Client, Recommendation } from "@/lib/mock-data";

export type ClientPageTab = "reco" | "portfolio" | "dna";

/** Rich context payload for the per-client recommendation chatbot. */
export function buildRecommendationChatContext(
  client: Client,
  recs: Recommendation[],
  pageMeta?: { activeTab?: ClientPageTab },
) {
  return {
    page: "recommendation_detail",
    ui: {
      activeTab: pageMeta?.activeTab ?? "reco",
    },
    generatedAt: new Date().toISOString(),
    client: {
      id: client.id,
      name: client.name,
      segment: client.segment,
      mandate: client.mandate,
      strategy: client.strategy,
      aumChfM: client.aum,
      domicile: client.domicile,
      timezone: client.timezone,
      workingHours: client.workingHours,
      archetype: client.archetype,
      communicationStyle: client.communicationStyle,
      preferredChannel: client.preferredChannel,
      lastContact: client.lastContact,
      riskScore: client.riskScore,
      hasAssistant: client.hasAssistant,
      assistantName: client.assistantName,
      dna: {
        values: client.dna.values,
        sensitivities: client.dna.sensitivities,
        preferences: client.dna.preferences,
        dos: client.dna.dos,
        donts: client.dna.donts,
        discretion: client.dna.discretion,
        successionStatus: client.dna.successionStatus,
        wealthSource: client.dna.wealthSource,
        personal: client.dna.personal,
        timeline: client.dna.timeline?.slice(0, 12),
      },
      portfolio: {
        allocation: client.portfolio.allocation,
        holdings: client.portfolio.holdings.map((h) => ({
          ticker: h.ticker,
          name: h.name,
          weightPct: h.weight,
          sector: h.sector,
          isin: h.isin,
          valor: h.valor,
          primaryMic: h.primaryMic,
          alert: h.alert,
          lastPrice: h.lastPrice,
        })),
      },
    },
    recommendations: recs.map((r) => ({
      id: r.id,
      title: r.title,
      priority: r.priority,
      category: r.category,
      affectedTicker: r.affectedTicker,
      sections: {
        proposedAction: r.advised,
        whyNow: r.trigger,
        whyClient: r.whyClient,
        whyAction: r.whyAction,
        impact: r.impact,
        storyline: r.reason.storyline,
        sources: r.reason.sources,
        confidence: r.confidence ?? null,
        whatCouldGoWrong: r.counterArguments ?? [],
        alternatives: r.alternatives ?? [],
        pastTrack: r.pastTrack ?? null,
        humanSpark: r.personalImpact ?? null,
        businessValue: r.revenueImpact ?? null,
        compliance: r.compliance,
      },
      outreach: {
        channel: r.outreach.channel,
        timing: r.outreach.timing,
        timingReason: r.outreach.timingReason,
        style: r.outreach.style,
        subject: r.outreach.subject,
      },
    })),
    integrations: {
      phoeniqs: "LLM reasoning (this chat)",
      sixMcp: "Live instrument symbology, listings, market_data via MCP",
      news: "Event Registry / news sentiment for issuers and themes",
    },
  };
}

export type RecommendationChatContext = ReturnType<typeof buildRecommendationChatContext>;
