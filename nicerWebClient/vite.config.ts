// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

const isDev = process.env.NODE_ENV !== "production";

// basicSsl only in dev — nginx handles TLS in production
const devPlugins = isDev ? [require("@vitejs/plugin-basic-ssl").default()] : [];

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
    preset: "node",
  },
  vite: {
    plugins: devPlugins,
    server: { https: isDev, host: "0.0.0.0" },
  },
});
