// Minimal Node HTTP server wrapping the TanStack Start fetch handler (Cloudflare-style)
import { createServer } from "http";
import { createReadStream } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import handler from "./dist/server/server.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT ?? "3030", 10);
const HOST = process.env.HOST ?? "0.0.0.0";

const server = createServer(async (req, res) => {
  try {
    const protocol = "http";
    const host = req.headers["host"] ?? "localhost";
    const url = `${protocol}://${host}${req.url}`;

    // Collect body
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = chunks.length ? Buffer.concat(chunks) : null;

    const headers = {};
    for (const [k, v] of Object.entries(req.headers)) {
      if (k === "connection") continue;
      headers[k] = Array.isArray(v) ? v.join(", ") : v;
    }

    const request = new Request(url, {
      method: req.method,
      headers,
      body: body?.length ? body : undefined,
    });

    const response = await handler.default.fetch(request, {}, {});

    res.writeHead(response.status, Object.fromEntries(response.headers.entries()));

    if (response.body) {
      const reader = response.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
    }
    res.end();
  } catch (err) {
    console.error("[server-node]", err);
    res.writeHead(500, { "content-type": "text/plain" });
    res.end("Internal Server Error");
  }
});

server.listen(PORT, HOST, () => {
  console.log(`[AgentAngelo Frontend] http://${HOST}:${PORT}`);
});
