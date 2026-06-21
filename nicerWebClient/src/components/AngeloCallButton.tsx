import { useState, useEffect, useRef } from "react";

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:3001";
const DEMO_PASSWORD = "0000";

type CallStatus = "idle" | "queuing" | "calling" | "in-progress" | "completed" | "failed";

interface CallRecord {
  callId: string;
  clientName: string;
  alertTitle: string;
  script: string;
  twilioSid: string | null;
  status: CallStatus;
  error?: string;
  calledAt: string;
}

interface AngeloCallButtonProps {
  clientId: string;
  alertId?: string;
  clientName: string;
  className?: string;
}

function PasswordModal({ onConfirm, onCancel }: { onConfirm: (phone: string) => void; onCancel: () => void }) {
  const [pw, setPw] = useState("");
  const [phone, setPhone] = useState("+41764436995");
  const [error, setError] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pw !== DEMO_PASSWORD) { setError("Wrong password"); setPw(""); return; }
    onConfirm(phone);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <form onSubmit={submit}
        className="bg-background border border-border rounded-xl shadow-2xl p-6 w-full max-w-sm space-y-4">
        <div className="text-center">
          <div className="text-2xl mb-1">📞</div>
          <div className="font-semibold text-foreground">Ask Angelo to call</div>
          <div className="text-xs text-muted-foreground mt-1">Enter the demo password to trigger a real phone call</div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Phone number to call</label>
          <input
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-secondary border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-ring"
            placeholder="+41..."
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Demo password</label>
          <input
            autoFocus
            type="password"
            value={pw}
            onChange={e => { setPw(e.target.value); setError(""); }}
            maxLength={4}
            className="w-full px-3 py-2 text-sm bg-secondary border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-ring tracking-[0.5em] text-center font-mono text-lg"
            placeholder="····"
          />
          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>

        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onCancel}
            className="flex-1 px-3 py-2 text-sm border border-border rounded-lg hover:bg-secondary transition">
            Cancel
          </button>
          <button type="submit"
            className="flex-1 px-3 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition font-semibold">
            Call me
          </button>
        </div>
      </form>
    </div>
  );
}

export function AngeloCallButton({ clientId, alertId, clientName, className = "" }: AngeloCallButtonProps) {
  const [status, setStatus] = useState<CallStatus>("idle");
  const [record, setRecord] = useState<CallRecord | null>(null);
  const [showModal, setShowModal] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function stopPolling() {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }

  useEffect(() => () => stopPolling(), []);

  async function triggerCall(phone: string) {
    setShowModal(false);
    setStatus("queuing");
    setRecord(null);

    try {
      const res = await fetch(`${API_BASE}/api/calls/trigger`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: clientId, alert_id: alertId, to_number: phone }),
      });
      if (!res.ok) throw new Error(await res.text());
      setStatus("calling");

      pollRef.current = setInterval(async () => {
        try {
          const r = await fetch(`${API_BASE}/api/calls/status`);
          if (!r.ok) return;
          const json = await r.json() as { success: boolean; data: CallRecord | { status: string } };
          if (!json.success) return;
          const data = json.data as CallRecord;
          if (!data || data.status === "idle") return;
          setRecord(data);
          setStatus(data.status as CallStatus);
          if (data.status === "completed" || data.status === "failed") stopPolling();
        } catch { /* ignore */ }
      }, 3000);
    } catch (err) {
      setStatus("failed");
      console.error("[AngeloCallButton]", err);
    }
  }

  function reset() {
    stopPolling();
    setStatus("idle");
    setRecord(null);
  }

  const isActive = status === "queuing" || status === "calling" || status === "in-progress";

  return (
    <>
      {showModal && (
        <PasswordModal
          onConfirm={triggerCall}
          onCancel={() => setShowModal(false)}
        />
      )}

      <div className={`flex flex-col gap-1 ${className}`}>
        <button
          onClick={isActive ? undefined : status === "completed" || status === "failed" ? reset : () => setShowModal(true)}
          disabled={isActive}
          className={[
            "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 border",
            isActive
              ? "bg-secondary border-border text-muted-foreground cursor-not-allowed"
              : status === "completed"
              ? "bg-positive/10 border-positive/30 text-positive hover:bg-positive/15 cursor-pointer"
              : status === "failed"
              ? "bg-destructive/10 border-destructive/30 text-destructive hover:bg-destructive/15 cursor-pointer"
              : "bg-accent/10 border-accent/30 text-accent hover:bg-accent/15 hover:border-accent/50 cursor-pointer",
          ].join(" ")}
        >
          {isActive ? (
            <>
              <span className="inline-block h-3.5 w-3.5 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
              {status === "queuing" ? "Preparing…" : status === "calling" ? "Angelo is calling you…" : "Call in progress…"}
            </>
          ) : status === "completed" ? (
            <><span>✓</span><span>Call completed — tap to reset</span></>
          ) : status === "failed" ? (
            <><span>✕</span><span>Call failed — tap to retry</span></>
          ) : (
            <><span>📞</span><span>Ask Angelo to call me</span></>
          )}
        </button>

        {record?.script && (
          <details className="text-[11px] text-muted-foreground mt-1">
            <summary className="cursor-pointer hover:text-foreground transition-colors">
              {status === "completed" ? "✓ Angelo called you about" : "Angelo is calling about"}{" "}
              <strong>{record.clientName}</strong>
            </summary>
            <p className="mt-1 pl-2 border-l border-border text-[10px] leading-relaxed italic text-muted-foreground/70">
              "{record.script}"
            </p>
          </details>
        )}

        {record?.error && <p className="text-[11px] text-red-400/80">{record.error}</p>}
      </div>
    </>
  );
}
