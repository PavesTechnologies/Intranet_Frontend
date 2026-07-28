import React from "react";
import { Badge } from "../../../../components/ui/badge";
import { PARSE_STATUS_LABEL, PARSE_STATUS_BADGE_TONE, SOURCE_LABEL } from "../constants/resumeIntakeConstants";

export function renderParseStatusBadge(status) {
  const tone = PARSE_STATUS_BADGE_TONE[status] || PARSE_STATUS_BADGE_TONE.PENDING;
  return <Badge className={`${tone} font-semibold px-2.5 py-1 text-xs`}>{PARSE_STATUS_LABEL[status] || status}</Badge>;
}

export function renderSourceBadge(source) {
  return (
    <Badge className="bg-slate-100 text-slate-700 border-slate-200 font-semibold px-2.5 py-1 text-xs">
      {SOURCE_LABEL[source] || source || "—"}
    </Badge>
  );
}

export function formatResumeDate(isoString) {
  if (!isoString) return "—";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
