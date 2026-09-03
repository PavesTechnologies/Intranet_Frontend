import React from "react";
import { AlertTriangle } from "lucide-react";

const fmt = (d) => (d ? new Date(d).toLocaleString() : null);

const TONE = {
  HALF_OPEN: "bg-amber-50 text-amber-800 border-amber-200",
  OPEN: "bg-rose-50 text-rose-800 border-rose-200",
};

const LABEL = {
  OPEN: "unavailable",
  HALF_OPEN: "recovering",
};

// Healthy collapses to one line — the common case is everything CLOSED, and a
// row of green pills spends screen space confirming nothing is wrong. Degraded
// services are named individually with their retry time.
export default function PlatformHealthStrip({ breakers }) {
  if (!breakers?.length) {
    return (
      <p className="text-[11px] text-slate-400">
        No service health recorded yet.
      </p>
    );
  }

  const degraded = breakers.filter((b) => b.state !== "CLOSED");

  // Healthy is the common case and needs no confirmation on screen — only
  // degraded services are worth surfacing here.
  if (degraded.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[11px] font-bold text-rose-700 flex items-center gap-1.5">
        <AlertTriangle className="h-3.5 w-3.5" />
        {degraded.length} service{degraded.length === 1 ? "" : "s"} degraded
      </span>
      {degraded.map((b) => (
        <span
          key={b.service_name}
          className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${TONE[b.state] || "bg-slate-50 text-slate-600 border-slate-200"}`}
          title={
            b.state === "OPEN"
              ? `Down since ${fmt(b.opened_at)} · next retry ${fmt(b.retry_after)}`
              : `${b.failure_count} recorded failure(s)`
          }
        >
          {b.service_name.replace(/_/g, " ")} — {LABEL[b.state] || b.state}
        </span>
      ))}
      <span className="text-[10px] text-slate-400">
        {breakers.length - degraded.length} healthy
      </span>
    </div>
  );
}
