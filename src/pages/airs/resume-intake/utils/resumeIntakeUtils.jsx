import React from "react";
import { Badge } from "../../../../components/ui/badge";
import {
  PARSE_STATUS_LABEL,
  PARSE_STATUS_BADGE_TONE,
  SOURCE_LABEL,
  PIPELINE_STAGE_LABEL,
  PIPELINE_STAGE_BADGE_TONE,
  DECISION_SOURCE_LABEL,
} from "../constants/resumeIntakeConstants";

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

// `pipeline_stage`/`decision_*` are only present once a resume's candidate
// is linked to a campaign (campaign_id set). Renders a plain dash for the
// "not in a pipeline yet" case, and a stage badge with a decision_reason
// tooltip once it is.
export function renderPipelineStageBadge(item) {
  const stage = item?.pipeline_stage;
  if (!stage) {
    return <span className="text-[11px] text-slate-400">Not in pipeline</span>;
  }

  const tone = PIPELINE_STAGE_BADGE_TONE[stage] || PIPELINE_STAGE_BADGE_TONE.UPLOADED;
  const label = PIPELINE_STAGE_LABEL[stage] || stage;
  const sourceLabel = item.decision_source ? DECISION_SOURCE_LABEL[item.decision_source] || item.decision_source : "";
  const tooltip = item.decision_reason
    ? `${sourceLabel ? `${sourceLabel}: ` : ""}${item.decision_reason}`
    : sourceLabel;

  return (
    <Badge className={`${tone} font-semibold px-2.5 py-1 text-xs`} title={tooltip || undefined}>
      {label}
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
