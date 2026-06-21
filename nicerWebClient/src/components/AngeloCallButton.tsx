import { useState, useEffect, useRef } from "react";

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:3001";

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

export function AngeloCallButton({ clientId, alertId, clientName, className = "" }: AngeloCallButtonProps) {
  const [status, setStatus] = useState<CallStatus>("idle");
  const [record, setRecord] = useState<CallRecord | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function stopPolling() {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }

  useEffect(() => () => stopPolling(), []);

  async function handleClick() {
    if (status !== "idle" && status !== "failed") return;
    setStatus("queuing");
    setRecord(null);

    try {
      const res = await fetch(`${API_BASE}/api/calls/trigger`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: clientId, alert_id: alertId }),
      });
      if (!res.ok) throw new Error(await res.text());
      setStatus("calling");

      // Poll for status updates every 3s
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
        } catch { /* ignore poll errors */ }
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
    <div className={`flex flex-col gap-1 ${className}`}>
      <button
        onClick={status === "completed" || status === "failed" ? reset : handleClick}
        disabled={isActive}
        className={[
          "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-200 border",
          isActive
            ? "bg-amber-500/20 border-amber-500/50 text-amber-300 cursor-not-allowed"
            : status === "completed"
            ? "bg-green-500/15 border-green-500/40 text-green-400 hover:bg-green-500/25 cursor-pointer"
            : status === "failed"
            ? "bg-red-500/15 border-red-500/40 text-red-400 hover:bg-red-500/25 cursor-pointer"
            : "bg-violet-600/20 border-violet-500/40 text-violet-300 hover:bg-violet-600/30 hover:border-violet-400/60 cursor-pointer",
        ].join(" ")}
      >
        {isActive ? (
          <>
            <span className="inline-block h-3.5 w-3.5 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
            {status === "queuing" ? "Preparing…" : status === "calling" ? "Angelo is calling you…" : "Call in progress…"}
          </>
        ) : status === "completed" ? (
          <>
            <span>✓</span>
            <span>Call completed — tap to reset</span>
          </>
        ) : status === "failed" ? (
          <>
            <span>✕</span>
            <span>Call failed — tap to retry</span>
          </>
        ) : (
          <>
            <span>📞</span>
            <span>Ask Angelo to call me</span>
          </>
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

      {record?.error && (
        <p className="text-[11px] text-red-400/80">{record.error}</p>
      )}
    </div>
  );
}
