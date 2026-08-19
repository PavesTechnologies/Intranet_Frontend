import { Clock, CheckCircle2, FileText, UserCheck, ShieldCheck, Activity } from "lucide-react";

export default function AcquisitionTimeline({ history = [] }) {
  const defaultHistory = [
    {
      id: 1,
      event: "Billing Snapshot Created",
      details: "Snapshot BS-20260814120000 generated for Website Redesign (PRJ-23)",
      timestamp: "Today at 12:00 PM",
      actor: "SYSTEM",
      type: "success",
    },
    {
      id: 2,
      event: "TMS Timesheet Sync",
      details: "48 approved billable hours imported from Time Management System",
      timestamp: "Today at 11:58 AM",
      actor: "TMS Integration Engine",
      type: "info",
    },
    {
      id: 3,
      event: "Rate Model Merged",
      details: "Applied standard flat rate of INR 1,500/hr from AR Billing Configuration",
      timestamp: "Today at 11:58 AM",
      actor: "AR Setup Service",
      type: "info",
    },
    {
      id: 4,
      event: "Validation Checklist Passed",
      details: "Duplicate billing check & currency consistency check completed successfully",
      timestamp: "Today at 11:57 AM",
      actor: "AR Validator",
      type: "success",
    },
  ];

  const events = history.length > 0 ? history : defaultHistory;

  return (
    <div className="rounded-2xl bg-white p-5 border border-slate-200/90 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-indigo-600" />
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
            Recent Acquisition Activity & Operational Audit Log
          </h3>
        </div>
        <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full font-mono">
          System Audit Log
        </span>
      </div>

      <div className="space-y-3 pt-1">
        {events.map((evt, idx) => (
          <div key={evt.id || idx} className="flex items-start gap-3 text-xs group">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 border border-indigo-200 flex-shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <Activity className="h-3.5 w-3.5" />
            </div>
            <div className="flex-1 space-y-0.5 bg-slate-50/60 group-hover:bg-indigo-50/30 p-3 rounded-xl border border-slate-200/70 transition-colors">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-xs">{evt.event}</span>
                <span className="text-[10px] text-slate-400 font-mono">{evt.timestamp}</span>
              </div>
              <p className="text-[11px] text-slate-600">{evt.details}</p>
              <div className="text-[10px] text-slate-400 pt-1 font-mono flex items-center gap-1">
                <UserCheck className="h-3 w-3 text-slate-400" /> Actor: {evt.actor}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
