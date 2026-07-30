import React from "react";
import { CheckCircle2, Circle, XCircle } from "lucide-react";

const STATUS_STYLE = {
  done: { icon: CheckCircle2, color: "text-emerald-600", line: "bg-emerald-500" },
  current: { icon: Circle, color: "text-blue-600", line: "bg-slate-200" },
  upcoming: { icon: Circle, color: "text-slate-300", line: "bg-slate-200" },
  rejected: { icon: XCircle, color: "text-rose-600", line: "bg-rose-400" },
};

// Status Timeline — ordered pipeline stages with done/current/upcoming/rejected state.
export default function StatusTimeline({ timeline }) {
  return (
    <div className="flex items-start">
      {timeline.map((step, i) => {
        const style = STATUS_STYLE[step.status] || STATUS_STYLE.upcoming;
        const Icon = style.icon;
        const isLast = i === timeline.length - 1;
        return (
          <div key={step.stage} className={`flex items-center ${isLast ? "" : "flex-1"}`}>
            <div className="flex flex-col items-center">
              <Icon size={20} className={style.color} />
              <span className="text-[11px] font-semibold text-slate-700 mt-1.5 whitespace-nowrap">{step.stage}</span>
              <span className="text-[10px] text-slate-400">{step.date || "—"}</span>
            </div>
            {!isLast && <div className={`h-0.5 flex-1 mx-2 mt-[-18px] ${style.line}`} />}
          </div>
        );
      })}
    </div>
  );
}
