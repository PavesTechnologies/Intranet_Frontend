import React from "react";
import { Ban, CheckCircle2, Circle, Clock, MinusCircle, PauseCircle, PlayCircle } from "lucide-react";
import { READINESS_META, STATUS_META } from "../utils/milestoneUtils";

const STATUS_ICON = {
  PLANNED: Circle,
  IN_PROGRESS: PlayCircle,
  ON_HOLD: PauseCircle,
  COMPLETED: CheckCircle2,
  CANCELLED: Ban,
};

const READINESS_ICON = {
  READY_FOR_BILLING: CheckCircle2,
  NOT_READY: Clock,
  NOT_BILLABLE: MinusCircle,
};

// Icon + text label so meaning never relies on colour alone.
const Badge = ({ className, Icon, label }) => (
  <span
    className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${className}`}
  >
    {Icon && <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
    {label}
  </span>
);

export const StatusBadge = ({ status }) => {
  const meta = STATUS_META[status] ?? { label: status ?? "—", className: "bg-slate-100 text-slate-600 ring-slate-200" };
  return <Badge className={meta.className} Icon={STATUS_ICON[status]} label={meta.label} />;
};

export const ReadinessBadge = ({ readiness }) => {
  const meta = READINESS_META[readiness] ?? { label: readiness ?? "—", className: "bg-slate-100 text-slate-600 ring-slate-200" };
  return <Badge className={meta.className} Icon={READINESS_ICON[readiness]} label={meta.label} />;
};
