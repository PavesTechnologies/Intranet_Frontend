import React from "react";
import { formatStatusLabel, normalizeSubState } from "../models/benchModel";

const STATUS_STYLES = {
  READY: {
    dot: "bg-emerald-400 shadow-[0_0_14px_rgba(74,222,128,0.7)]",
    badge: "border-emerald-500/30 bg-emerald-500/12 text-emerald-200",
  },
  TRAINING: {
    dot: "bg-sky-400 shadow-[0_0_14px_rgba(56,189,248,0.65)]",
    badge: "border-sky-500/30 bg-sky-500/12 text-sky-200",
  },
  NOT_AVAILABLE: {
    dot: "bg-rose-400 shadow-[0_0_14px_rgba(251,113,133,0.7)]",
    badge: "border-rose-500/30 bg-rose-500/12 text-rose-200",
  },
  LOW_UTILIZATION: {
    dot: "bg-amber-400 shadow-[0_0_14px_rgba(251,191,36,0.7)]",
    badge: "border-amber-500/30 bg-amber-500/12 text-amber-100",
  },
  SHADOW: {
    dot: "bg-violet-400 shadow-[0_0_14px_rgba(167,139,250,0.65)]",
    badge: "border-violet-500/30 bg-violet-500/12 text-violet-200",
  },
  COE: {
    dot: "bg-teal-400 shadow-[0_0_14px_rgba(45,212,191,0.65)]",
    badge: "border-teal-500/30 bg-teal-500/12 text-teal-100",
  },
  RND: {
    dot: "bg-fuchsia-400 shadow-[0_0_14px_rgba(232,121,249,0.65)]",
    badge: "border-fuchsia-500/30 bg-fuchsia-500/12 text-fuchsia-100",
  },
  TRAINING_POOL: {
    dot: "bg-cyan-400 shadow-[0_0_14px_rgba(34,211,238,0.65)]",
    badge: "border-cyan-500/30 bg-cyan-500/12 text-cyan-100",
  },
};

const StatusIndicator = ({ status, compact = false }) => {
  const normalizedStatus = normalizeSubState(status);
  const tone = STATUS_STYLES[normalizedStatus] || STATUS_STYLES.READY;

  return (
    <div className="inline-flex items-center gap-2">
      <span className={`h-2.5 w-2.5 rounded-full ${tone.dot}`} />
      <span
        className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-[0.16em] uppercase ${
          compact ? "px-2 py-0.5 text-[10px]" : ""
        } ${tone.badge}`}
      >
        {formatStatusLabel(normalizedStatus)}
      </span>
    </div>
  );
};

export default StatusIndicator;
