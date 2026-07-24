import React from "react";
import { FileText, Users } from "lucide-react";

export default function UsageStats({ jdCount = 0, candidateCount = 0 }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-blue-50 shrink-0">
          <FileText className="h-4 w-4 text-blue-600" />
        </div>
        <div>
          <div className="text-lg font-extrabold text-slate-900">{jdCount}</div>
          <div className="text-[11px] text-slate-400">Job descriptions</div>
        </div>
      </div>
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-purple-50 shrink-0">
          <Users className="h-4 w-4 text-purple-600" />
        </div>
        <div>
          <div className="text-lg font-extrabold text-slate-900">{candidateCount}</div>
          <div className="text-[11px] text-slate-400">Candidates</div>
        </div>
      </div>
    </div>
  );
}
