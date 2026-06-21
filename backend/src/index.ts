// Load env first: services read process.env at construction time.
// We reuse the existing demo .env (one place to manage keys) and allow a local
// backend/.env to override it.
import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.join(__dirname, "..", "..", "SIX-Noumena-NTT-Data", "demo", ".env") });
dotenv.config({ path: path.join(__dirname, "..", ".env"), override: true });

import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import api from "./routes/api";
import { rmActivityMiddleware } from "./middleware/rm-activity";
import { startWatchdog } from "./advisory/watchdog";
import { PhoeniqsService } from "./services/phoeniqs.service";

const app = express();
const port = parseInt(process.env.API_PORT || "3001", 10);

app.use(helmet());
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());

// Track RM presence on every API call
app.use("/api", rmActivityMiddleware);

app.use("/api", api);
app.get("/health", (_req, res) => res.json({ status: "ok", timestamp: new Date().toISOString() }));

app.listen(port, () => {
  console.log(`[Agent Angelo API] http://localhost:${port}`);
  console.log(`[Agent Angelo API] integrations: GET /api/integrations`);

  // Start the proactive call watchdog
  const phoeniqs = new PhoeniqsService();
  if (phoeniqs.configured) {
    startWatchdog(phoeniqs);
  } else {
    console.warn("[Watchdog] Skipped — PHOENIQS_API_KEY not set");
  }
});

export default app;
