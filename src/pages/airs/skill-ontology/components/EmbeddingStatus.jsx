import React from "react";
import { CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { renderEmbeddingPill } from "../utils/skillOntologyUtils.jsx";

const ICON = {
  GENERATED: CheckCircle2,
  PENDING: Clock,
  OUTDATED: AlertTriangle,
};

const ICON_COLOR = {
  GENERATED: "text-emerald-600",
  PENDING: "text-amber-600",
  OUTDATED: "text-rose-600",
};

export default function EmbeddingStatus({ status }) {
  const Icon = ICON[status] || Clock;
  return (
    <div className="flex items-center gap-2">
      <Icon className={`h-4 w-4 ${ICON_COLOR[status] || "text-slate-400"}`} />
      <span className="text-[12px] font-semibold text-slate-700">Embedding</span>
      {renderEmbeddingPill(status)}
    </div>
  );
}
