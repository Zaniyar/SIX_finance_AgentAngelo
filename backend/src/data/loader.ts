import fs from "fs";
import path from "path";
import { CioEntry, Client, CrmNote, Holding } from "../shared/types";

// Seeds are produced by scripts/extract-data.py from the provided xlsx files.
const SEEDS = path.join(__dirname, "..", "..", "data", "seeds");
export const CACHE_DIR = path.join(__dirname, "..", "..", "data", "cache");

function readJson<T>(rel: string): T {
  return JSON.parse(fs.readFileSync(path.join(SEEDS, rel), "utf-8")) as T;
}

let _clients: Client[] | null = null;
let _cio: CioEntry[] | null = null;
const _portfolios: Record<string, Holding[]> = {};
const _crm: Record<string, CrmNote[]> = {};

export function getClients(): Client[] {
  if (!_clients) _clients = readJson<Client[]>("clients.json");
  return _clients;
}

export function getClient(id: string): Client | undefined {
  return getClients().find((c) => c.id === id);
}

export function getCio(): CioEntry[] {
  if (!_cio) _cio = readJson<CioEntry[]>("cio.json");
  return _cio;
}

export function getPortfolio(key: string): Holding[] {
  if (!_portfolios[key]) {
    const raw = readJson<Record<string, string | null>[]>(`portfolios/${key}.json`);
    _portfolios[key] = raw.map((r) => ({
      assetClass: r.assetClass || "",
      subAssetClass: r.subAssetClass || "",
      region: r.region || "",
      industry: r.industry || "",
      issuer: r.issuer || "",
      security: r.security || "",
      isin: r.isin || "",
      targetChf: Number(r.targetChf) || 0,
      currentChf: Number(r.currentChf) || 0,
      valor: r.valor || "",
      mic: r.mic || "",
      yahoo: r.yahoo || "",
    }));
  }
  return _portfolios[key];
}

export function getCrm(id: string): CrmNote[] {
  if (!_crm[id]) _crm[id] = readJson<CrmNote[]>(`crm/${id}.json`);
  return _crm[id];
}

// ---- Disk cache for LLM-derived artefacts (DNA, drafts) ---------------------
export function cacheGet<T>(key: string): T | null {
  try {
    const p = path.join(CACHE_DIR, `${key}.json`);
    if (!fs.existsSync(p)) return null;
    return JSON.parse(fs.readFileSync(p, "utf-8")) as T;
  } catch {
    return null;
  }
}

export function cacheSet<T>(key: string, value: T): void {
  try {
    if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.writeFileSync(path.join(CACHE_DIR, `${key}.json`), JSON.stringify(value, null, 2));
  } catch {
    /* cache is best-effort */
  }
}
