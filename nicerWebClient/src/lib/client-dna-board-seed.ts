import {
  AssetRecordType,
  Box,
  createShapeId,
  getHashForString,
  type Editor,
  type TLAsset,
  type TLDefaultColorStyle,
  type TLShapePartial,
  toRichText,
} from "tldraw";
import type { Client, Confidence } from "@/lib/mock-data";

type BoardCard = {
  id: string;
  title: string;
  subtitle?: string;
  body: string;
  color: TLDefaultColorStyle;
  w?: number;
  skipTextBody?: boolean;
};

const CARD_W = 380;
const GAP_X = 56;
const GAP_Y = 48;
const COLS = 3;
const PORTRAIT_W = 260;
const PORTRAIT_H = 340;

const CHART_COLORS = ["#6366f1", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

function estimateHeight(body: string, min = 168, max = 520): number {
  if (!body.trim()) return min;
  const lines = body.split("\n").length;
  return Math.min(max, Math.max(min, 96 + lines * 22));
}

function bulletLines(items: string[], prefix = "•"): string {
  return items.filter(Boolean).map((item) => `${prefix} ${item}`).join("\n");
}

function confidenceTag(c: Confidence): string {
  return `[${c}]`;
}

function resolvePublicUrl(src: string): string {
  if (src.startsWith("http") || src.startsWith("data:")) return src;
  if (typeof window !== "undefined") return new URL(src, window.location.origin).href;
  return src;
}

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function svgDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function barChartSvg(
  title: string,
  rows: { label: string; value: number; max: number; suffix?: string }[],
  accent = "#6366f1",
): string {
  const rowH = 34;
  const pad = 20;
  const w = 400;
  const h = pad + 28 + rows.length * rowH + pad;
  const trackX = 148;
  const trackW = 210;

  const bars = rows
    .map((row, i) => {
      const y = pad + 28 + i * rowH;
      const fillW = Math.max(4, (row.value / row.max) * trackW);
      const label = escapeXml(row.label.length > 22 ? `${row.label.slice(0, 21)}…` : row.label);
      const val = row.suffix ?? (row.max === 100 ? `${row.value}%` : `${row.value}/${row.max}`);
      return `
        <text x="${pad}" y="${y + 14}" font-family="Inter, system-ui, sans-serif" font-size="11" fill="#334155">${label}</text>
        <rect x="${trackX}" y="${y}" width="${trackW}" height="16" rx="5" fill="#e2e8f0"/>
        <rect x="${trackX}" y="${y}" width="${fillW}" height="16" rx="5" fill="${accent}"/>
        <text x="${trackX + trackW + 8}" y="${y + 13}" font-family="ui-monospace, monospace" font-size="10" fill="#64748b">${escapeXml(val)}</text>`;
    })
    .join("");

  return svgDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <rect width="100%" height="100%" rx="12" fill="#ffffff"/>
    <text x="${pad}" y="${pad + 16}" font-family="Inter, system-ui, sans-serif" font-size="13" font-weight="600" fill="#0f172a">${escapeXml(title)}</text>
    ${bars}
  </svg>`);
}

function timelineSvg(
  title: string,
  events: { date: string; type: string; text: string }[],
): string {
  const pad = 20;
  const w = 420;
  const rowH = 52;
  const h = pad + 28 + events.length * rowH + pad;
  const colors: Record<string, string> = {
    Life: "#6366f1",
    Meeting: "#2563eb",
    Trade: "#059669",
    Note: "#94a3b8",
  };

  const rows = events
    .map((ev, i) => {
      const y = pad + 28 + i * rowH;
      const dot = colors[ev.type] ?? "#64748b";
      const text = escapeXml(ev.text.length > 72 ? `${ev.text.slice(0, 71)}…` : ev.text);
      return `
        <circle cx="${pad + 6}" cy="${y + 14}" r="6" fill="${dot}"/>
        <line x1="${pad + 6}" y1="${y + 22}" x2="${pad + 6}" y2="${y + rowH - 6}" stroke="#e2e8f0" stroke-width="2"/>
        <text x="${pad + 22}" y="${y + 10}" font-family="ui-monospace, monospace" font-size="10" fill="#64748b">${escapeXml(ev.date)} · ${escapeXml(ev.type)}</text>
        <text x="${pad + 22}" y="${y + 28}" font-family="Inter, system-ui, sans-serif" font-size="11" fill="#334155">${text}</text>`;
    })
    .join("");

  return svgDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <rect width="100%" height="100%" rx="12" fill="#ffffff"/>
    <text x="${pad}" y="${pad + 16}" font-family="Inter, system-ui, sans-serif" font-size="13" font-weight="600" fill="#0f172a">${escapeXml(title)}</text>
    ${rows}
  </svg>`);
}

function riskGaugeSvg(score: number): string {
  const pct = Math.min(100, Math.max(0, score));
  const color = pct >= 70 ? "#ef4444" : pct >= 40 ? "#f59e0b" : "#10b981";
  const dash = (pct / 100) * 88;
  return svgDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 36 36">
    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e2e8f0" stroke-width="2.2"/>
    <circle cx="18" cy="18" r="15.9" fill="none" stroke="${color}" stroke-width="2.2"
      stroke-dasharray="${dash} 100" stroke-linecap="round" transform="rotate(-90 18 18)"/>
    <text x="18" y="19.5" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-size="8" font-weight="700" fill="#0f172a">${pct}</text>
    <text x="18" y="24" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-size="3.5" fill="#64748b">RISK</text>
  </svg>`);
}

function imageAsset(id: string, src: string, w: number, h: number, name: string): TLAsset {
  const resolved = resolvePublicUrl(src);
  return {
    id: AssetRecordType.createId(getHashForString(`${id}:${resolved}`)),
    type: "image",
    typeName: "asset",
    props: {
      w,
      h,
      name,
      isAnimated: false,
      mimeType: src.endsWith(".png") ? "image/png" : "image/jpeg",
      src: resolved,
    },
    meta: {},
  };
}

function imageShape(
  shapeId: string,
  assetId: TLAsset["id"],
  x: number,
  y: number,
  w: number,
  h: number,
): TLShapePartial {
  return {
    id: createShapeId(shapeId),
    type: "image",
    x,
    y,
    props: { assetId, w, h, playing: true, url: "", crop: null, flipX: false, flipY: false, altText: "" },
  };
}

function frameLabel(x: number, y: number, w: number, title: string, subtitle?: string): TLShapePartial {
  return {
    id: createShapeId(`frame-${title.replace(/\s+/g, "-").toLowerCase()}`),
    type: "geo",
    x,
    y,
    props: {
      geo: "rectangle",
      w,
      h: 36,
      richText: toRichText(subtitle ? `${title}\n${subtitle}` : title),
      color: "grey",
      labelColor: "grey",
      fill: "none",
      dash: "draw",
      size: "s",
      font: "draw",
      align: "start",
      verticalAlign: "middle",
    },
  };
}

function buildCards(client: Client): BoardCard[] {
  const d = client.dna;
  const first = client.name.split(" ")[0];
  const cards: BoardCard[] = [];

  cards.push({
    id: "hero",
    title: client.name,
    subtitle: "Client DNA · overview",
    color: "violet",
    w: COLS * CARD_W + (COLS - 1) * GAP_X - PORTRAIT_W - GAP_X,
    body: [
      client.archetype,
      `${client.domicile} · ${client.timezone}`,
      `${client.mandate} mandate · CHF ${client.aum.toFixed(1)}M AUM`,
      `Preferred ${client.preferredChannel} · ${client.communicationStyle}`,
      `Last contact ${client.lastContact}`,
      d.personal?.voice ? `\n"${d.personal.voice}"` : "",
    ].filter(Boolean).join("\n"),
  });

  cards.push({
    id: "memory",
    title: "Client memory card",
    subtitle: "Values · wealth · family · preferences",
    color: "light-violet",
    body: [
      "Values",
      bulletLines(d.values.slice(0, 4).map((v) => `${v.label} ${confidenceTag(v.confidence)}`)),
      "",
      "Family context",
      bulletLines([
        ...(d.personal?.family ?? []).slice(0, 4).map((f) => `${f.name} (${f.relation})`),
        d.successionStatus ? `Succession: ${d.successionStatus}` : "",
      ].filter(Boolean)),
      "",
      "Preferences",
      bulletLines([
        `Channel: ${client.preferredChannel}`,
        `Style: ${client.communicationStyle}`,
        ...(d.preferences ?? []).slice(0, 3),
      ]),
    ].join("\n"),
  });

  cards.push({
    id: "cheatsheet",
    title: "RM cheat-sheet",
    subtitle: d.kycRefresh ? `KYC ${d.kycRefresh}` : "Before you reach out",
    color: "blue",
    body: [
      "Do",
      bulletLines(d.dos ?? [], "✓"),
      "",
      "Don't",
      bulletLines(d.donts ?? [], "✗"),
      d.discretion ? `\nDiscretion: ${d.discretion}` : "",
    ].join("\n"),
  });

  cards.push({
    id: "timeline",
    title: "News about the client",
    subtitle: "Visual timeline → see chart panel",
    color: "yellow",
    skipTextBody: true,
    body: bulletLines(
      d.timeline.slice(0, 6).map((t) => `${t.date} · ${t.type}: ${t.text}`),
      "•",
    ),
  });

  if ((d.media ?? []).length > 0) {
    cards.push({
      id: "media",
      title: "Media & news mentions",
      color: "orange",
      body: bulletLines(
        (d.media ?? []).slice(0, 6).map((m) => `${m.date} · ${m.outlet}: ${m.title}`),
      ),
    });
  }

  if ((d.crmTouchpoints ?? []).length > 0) {
    cards.push({
      id: "crm",
      title: "CRM touchpoints",
      color: "blue",
      body: bulletLines(
        (d.crmTouchpoints ?? []).slice(0, 8).map(
          (t) => `${t.date} · ${t.direction} ${t.channel}: ${t.subject}`,
        ),
      ),
    });
  }

  if (d.personal) {
    const p = d.personal;
    cards.push({
      id: "personal-hero",
      title: "The person behind the portfolio",
      subtitle: `In ${first}'s words`,
      color: "light-red",
      body: [
        p.voice ? `"${p.voice}"` : "",
        p.lastPersonalTouch ? `Last touch: ${p.lastPersonalTouch.text}` : "",
      ].filter(Boolean).join("\n\n"),
    });

    if ((p.family ?? []).length > 0) {
      cards.push({
        id: "personal-family",
        title: "Family & inner life",
        color: "light-red",
        body: bulletLines((p.family ?? []).map((f) => `${f.name} · ${f.relation}`)),
      });
    }

    if ((p.keyDates ?? []).length > 0) {
      cards.push({
        id: "personal-dates",
        title: "Dates that matter",
        color: "red",
        body: bulletLines((p.keyDates ?? []).map((k) => `${k.date} · ${k.kind} — ${k.label}`)),
      });
    }

    if ((p.ritualsAndLoves ?? []).length > 0) {
      cards.push({
        id: "personal-rituals",
        title: "Small things they love",
        color: "light-red",
        body: bulletLines(p.ritualsAndLoves ?? []),
      });
    }

    if ((p.conversationStarters ?? []).length > 0) {
      cards.push({
        id: "personal-starters",
        title: "Conversation starters",
        color: "green",
        body: bulletLines(p.conversationStarters ?? []),
      });
    }

    if (p.giftNotes) {
      cards.push({
        id: "personal-gifts",
        title: "Gifting & gestures",
        color: "light-green",
        body: p.giftNotes,
      });
    }

    if ((p.neverForget ?? []).length > 0) {
      cards.push({
        id: "personal-never",
        title: "Never forget",
        subtitle: "Handle with care",
        color: "red",
        body: bulletLines(p.neverForget ?? [], "!"),
      });
    }
  }

  cards.push({
    id: "wealth",
    title: "Where the wealth sits",
    subtitle: "Bar chart → see chart panel",
    color: "grey",
    skipTextBody: true,
    body: "",
  });

  cards.push({
    id: "tax",
    title: "Wealth origin, tax & succession",
    color: "black",
    body: [
      d.wealthSource ? `Source: ${d.wealthSource}` : "",
      d.taxDomicile ? `Tax domicile: ${d.taxDomicile}` : "",
      d.successionStatus ? `Succession: ${d.successionStatus}` : "",
      d.liquidityHorizon ? `Liquidity: ${d.liquidityHorizon}` : "",
    ].filter(Boolean).join("\n"),
  });

  if ((d.behavioralPatterns ?? []).length > 0) {
    cards.push({
      id: "behaviour",
      title: "Behavioural patterns",
      color: "blue",
      body: bulletLines(d.behavioralPatterns ?? []),
    });
  }

  cards.push({
    id: "interests",
    title: "Sensitivities & interests",
    color: "light-violet",
    body: [
      "Sensitivities",
      bulletLines(d.sensitivities, "!"),
      "",
      "Interests",
      bulletLines(d.interests),
    ].join("\n"),
  });

  cards.push({
    id: "values",
    title: "Values & convictions",
    subtitle: "Weight chart → see chart panel",
    color: "green",
    skipTextBody: true,
    body: "",
  });

  cards.push({
    id: "gaps",
    title: "DNA gaps",
    subtitle: "Ask at the next meeting",
    color: "light-red",
    body: bulletLines(d.gaps),
  });

  return cards;
}

function layoutCards(cards: BoardCard[]): { card: BoardCard; x: number; y: number; h: number }[] {
  const laid: { card: BoardCard; x: number; y: number; h: number }[] = [];
  let gridY = 0;

  for (const card of cards) {
    if (card.id === "hero") {
      const h = Math.max(estimateHeight(card.body, 200, 280), PORTRAIT_H + 40);
      laid.push({ card, x: 0, y: 0, h });
      gridY = h + GAP_Y + 48;
    }
  }

  const gridCards = cards.filter((c) => c.id !== "hero");
  const rowStride = 320 + GAP_Y;

  gridCards.forEach((card, i) => {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const h = card.skipTextBody ? 120 : estimateHeight(card.body);
    laid.push({
      card,
      x: col * (CARD_W + GAP_X),
      y: gridY + row * rowStride,
      h,
    });
  });

  return laid;
}

function buildVisualAssets(client: Client): { assets: TLAsset[]; shapes: TLShapePartial[] } {
  const d = client.dna;
  const assets: TLAsset[] = [];
  const shapes: TLShapePartial[] = [];

  const heroLayout = layoutCards(buildCards(client)).find((l) => l.card.id === "hero");
  const heroW = heroLayout?.card.w ?? CARD_W;
  const heroH = heroLayout?.h ?? 280;

  // Portrait photo (family memory card style)
  if (client.avatar) {
    const portraitAsset = imageAsset("portrait", client.avatar, 720, 900, `${client.name} portrait`);
    assets.push(portraitAsset);
    shapes.push(
      frameLabel(heroW + GAP_X, 0, PORTRAIT_W, "Family portrait", client.archetype),
      imageShape("dna-portrait", portraitAsset.id, heroW + GAP_X, 44, PORTRAIT_W, PORTRAIT_H - 8),
    );
  }

  // Visual column — charts to the right of the 3-column grid
  const chartColX = COLS * (CARD_W + GAP_X) + 72;
  let chartY = 0;

  // Values weight chart
  const valuesSvg = barChartSvg(
    "Values & convictions",
    d.values.map((v, i) => ({
      label: v.label,
      value: v.weight,
      max: 10,
      suffix: `${v.weight}/10`,
    })),
    CHART_COLORS[0],
  );
  const valuesAsset = imageAsset("chart-values", valuesSvg, 400, 40 + 28 + d.values.length * 34 + 40, "Values chart");
  assets.push(valuesAsset);
  const valuesH = 40 + 28 + d.values.length * 34 + 40;
  shapes.push(
    frameLabel(chartColX, chartY, 400, "Values profile", "Explicit · Pattern · Inferred"),
    imageShape("dna-chart-values", valuesAsset.id, chartColX, chartY + 40, 400, valuesH),
  );
  chartY += valuesH + 64;

  // Net worth chart
  if ((d.netWorthMap ?? []).length > 0) {
    const wealthRows = (d.netWorthMap ?? []).map((w, i) => ({
      label: w.label,
      value: w.pct,
      max: 100,
      suffix: `${w.pct}%`,
    }));
    const wealthSvg = barChartSvg("Share of wealth", wealthRows, CHART_COLORS[1]);
    const wealthAsset = imageAsset("chart-wealth", wealthSvg, 400, 40 + 28 + wealthRows.length * 34 + 40, "Wealth chart");
    assets.push(wealthAsset);
    const wealthH = 40 + 28 + wealthRows.length * 34 + 40;
    shapes.push(
      frameLabel(chartColX, chartY, 400, "Where the wealth sits", "Share-of-wallet view"),
      imageShape("dna-chart-wealth", wealthAsset.id, chartColX, chartY + 40, 400, wealthH),
    );
    chartY += wealthH + 64;
  }

  // Timeline visual
  const timelineEvents = d.timeline.slice(0, 8);
  const timelineSvgUrl = timelineSvg("Client timeline", timelineEvents);
  const timelineAsset = imageAsset(
    "chart-timeline",
    timelineSvgUrl,
    420,
    40 + 28 + timelineEvents.length * 52 + 40,
    "Timeline chart",
  );
  assets.push(timelineAsset);
  const timelineH = 40 + 28 + timelineEvents.length * 52 + 40;
  shapes.push(
    frameLabel(chartColX, chartY, 420, "News & life events", "Newest first"),
    imageShape("dna-chart-timeline", timelineAsset.id, chartColX, chartY + 40, 420, timelineH),
  );
  chartY += timelineH + 64;

  // Risk gauge under portrait
  const riskSvg = riskGaugeSvg(client.riskScore);
  const riskAsset = imageAsset("chart-risk", riskSvg, 200, 200, "Risk gauge");
  assets.push(riskAsset);
  shapes.push(
    frameLabel(heroW + GAP_X, PORTRAIT_H + 52, PORTRAIT_W, "Risk profile", `${client.riskScore}/100`),
    imageShape("dna-chart-risk", riskAsset.id, heroW + GAP_X + 30, PORTRAIT_H + 96, 200, 200),
  );

  return { assets, shapes };
}

export function buildClientDnaBoardContent(client: Client): { shapes: TLShapePartial[]; assets: TLAsset[] } {
  const cards = buildCards(client);
  const laid = layoutCards(cards);
  const shapes: TLShapePartial[] = [];
  const { assets, shapes: visualShapes } = buildVisualAssets(client);

  laid.forEach(({ card, x, y, h }) => {
    const w = card.w ?? CARD_W;
    const titleBlock = card.subtitle ? `${card.title}\n${card.subtitle}` : card.title;
    const body = card.skipTextBody
      ? "Open the chart panel on the right →"
      : card.body;
    const richText = toRichText(`${titleBlock}\n\n${body}`);

    shapes.push({
      id: createShapeId(`dna-${card.id}`),
      type: "geo",
      x,
      y,
      props: {
        geo: "rectangle",
        w,
        h,
        richText,
        color: card.color,
        labelColor: card.color,
        fill: "semi",
        dash: "draw",
        size: "m",
        font: "draw",
        align: "start",
        verticalAlign: "start",
      },
    });
  });

  shapes.unshift({
    id: createShapeId("dna-section-label"),
    type: "text",
    x: 0,
    y: laid.find((l) => l.card.id === "hero")!.h + GAP_Y,
    props: {
      richText: toRichText("Tiles = detail cards · Right column = photo + charts · Pan · zoom · draw"),
      color: "grey",
      size: "s",
      font: "draw",
      autoSize: true,
    },
  });

  return { shapes: [...shapes, ...visualShapes], assets };
}

export function seedClientDnaBoardIfEmpty(editor: Editor, client: Client) {
  const existing = editor.getCurrentPageShapes();
  if (existing.length > 0) return;

  editor.run(() => {
    const { shapes, assets } = buildClientDnaBoardContent(client);
    if (assets.length > 0) editor.createAssets(assets);
    editor.createShapes(shapes);

    const ids = shapes.map((s) => s.id).filter(Boolean);
    const bounds = Box.Common(
      ids.map((id) => editor.getShapePageBounds(id!)).filter((b): b is Box => !!b),
    );
    if (bounds) {
      editor.zoomToBounds(bounds, { inset: 120, animation: { duration: 0 } });
    }
  });
}

export function resetClientDnaBoard(editor: Editor, client: Client) {
  editor.run(() => {
    const assetIds = editor.getAssets().map((a) => a.id);
    const ids = editor.getCurrentPageShapeIds();
    if (ids.size > 0) editor.deleteShapes([...ids]);
    if (assetIds.length > 0) editor.deleteAssets(assetIds);
    seedClientDnaBoardIfEmpty(editor, client);
  });
}
