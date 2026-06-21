import { createFileRoute } from "@tanstack/react-router";

const BACKEND = process.env.BACKEND_URL ?? "http://localhost:3001";

export const Route = createFileRoute("/api/recommendation-chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as {
          messages?: { role: string; content: string }[];
          context?: unknown;
        };
        if (!Array.isArray(body.messages)) return new Response("messages[] required", { status: 400 });
        if (!body.context) return new Response("context required", { status: 400 });

        const upstream = await fetch(`${BACKEND}/api/recommendation-chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: body.messages,
            context: typeof body.context === "string" ? body.context : JSON.stringify(body.context),
          }),
        });

        if (!upstream.ok) {
          const text = await upstream.text();
          return new Response(`Backend error: ${text}`, { status: upstream.status });
        }

        return new Response(upstream.body, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
        });
      },
    },
  },
});
