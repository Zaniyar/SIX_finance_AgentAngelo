// Minimal Node HTTP server wrapping the TanStack Start fetch handler (Cloudflare-style)
import { createServer } from "http";
import { createReadStream, existsSync, statSync } from "fs";
import { join, dirname, extname } from "path";
import { fileURLToPath } from "url";
import * as handlerModule from "./dist/server/server.js";
// CJS default export compat: the built file uses module.exports.default
const handler = handlerModule.default ?? handlerModule;

const STATIC_DIR = join(dirname(fileURLToPath(import.meta.url)), "dist", "client");

const MIME = {
  ".js":   "application/javascript",
  ".mjs":  "application/javascript",
  ".css":  "text/css",
  ".html": "text/html",
  ".json": "application/json",
  ".png":  "image/png",
  ".jpg":  "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg":  "image/svg+xml",
  ".ico":  "image/x-icon",
  ".woff": "font/woff",
  ".woff2":"font/woff2",
  ".ttf":  "font/ttf",
  ".mp3":  "audio/mpeg",
  ".glb":  "model/gltf-binary",
  ".fbx":  "application/octet-stream",
  ".tga":  "image/x-tga",
  ".webp": "image/webp",
};

const PORT = parseInt(process.env.PORT ?? "3030", 10);
const HOST = process.env.HOST ?? "0.0.0.0";

const server = createServer(async (req, res) => {
  try {
    const urlPath = req.url?.split("?")[0] ?? "/";
    const staticPath = join(STATIC_DIR, urlPath);
    if (urlPath !== "/" && existsSync(staticPath) && statSync(staticPath).isFile()) {
      const ext = extname(staticPath).toLowerCase();
      const mime = MIME[ext] ?? "application/octet-stream";
      const isImmutable = urlPath.startsWith("/assets/");
      res.writeHead(200, {
        "Content-Type": mime,
        "Cache-Control": isImmutable ? "public, max-age=31536000, immutable" : "public, max-age=3600",
      });
      createReadStream(staticPath).pipe(res);
      return;
    }

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

    const fetchFn = handler.fetch ?? handler.default?.fetch;
    if (!fetchFn) throw new Error("No fetch handler found in server.js");
    const response = await fetchFn.call(handler, request, {}, {});

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
