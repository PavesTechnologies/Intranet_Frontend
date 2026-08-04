import React from "react";
import { CheckCircle2 } from "lucide-react";

export default function AcceptedStep({ resume, status }) {
  return (
    <div className="max-w-3xl">
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center mx-auto mb-3 shadow-sm">
          <CheckCircle2 size={22} className="text-emerald-600" />
        </div>
        <div className="text-[15px] font-bold text-slate-900">Resume accepted</div>
        <div className="text-[12.5px] text-slate-600 mt-1">
          {resume.candidate_name}'s resume has been queued for parsing. This normally takes under a minute.
        </div>
        <div className="flex justify-center gap-6 mt-4 text-[11.5px]">
          <div>
            <div className="text-slate-400">Resume ID</div>
            <div className="font-mono text-slate-700">{resume.resume_id}</div>
          </div>
          <div>
            <div className="text-slate-400">Task ID</div>
            <div className="font-mono text-slate-700">{status.task_id}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
