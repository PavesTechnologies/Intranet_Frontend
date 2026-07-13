import React from "react";
import { RECRUITER_PRODUCTIVITY } from "../mock/analyticsMockData";

export default function AnalyticsRecruiterProductivity() {
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
      <div className="font-bold text-[14px] mb-4 text-slate-900">Recruiter productivity</div>
      <div className="space-y-3">
        {RECRUITER_PRODUCTIVITY.map((r) => (
          <div key={r.id} className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 bg-gradient-to-br from-blue-600 to-indigo-600">
              {r.name.split(" ").map((n) => n[0]).join("")}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12.5px] font-semibold text-slate-900">{r.name}</div>
              <div className="text-[11px] text-slate-400">{r.campaigns} campaigns · avg {r.avgTTH}d</div>
            </div>
            <span className="text-[13px] font-extrabold text-blue-600">{r.placements}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
