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
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-indigo-600" />
          <h3 className="text-sm font-semibold text-slate-900">
            Recent Acquisition Activity &amp; Operational Audit Log
          </h3>
        </div>
        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 font-mono text-xs font-medium text-slate-500">
          System Audit Log
        </span>
      </div>

      <div className="space-y-3 pt-1">
        {events.map((evt, idx) => (
          <div key={evt.id || idx} className="group flex items-start gap-3 text-xs">
            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-indigo-200 bg-indigo-50 text-indigo-600 transition-colors group-hover:bg-indigo-600 group-hover:text-white">
              <Activity className="h-3.5 w-3.5" />
            </div>
            <div className="flex-1 space-y-0.5 rounded-xl border border-slate-200 bg-slate-50/60 p-3 transition-colors group-hover:bg-indigo-50/30">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-900">{evt.event}</span>
                <span className="font-mono text-[11px] text-slate-400">{evt.timestamp}</span>
              </div>
              <p className="text-xs text-slate-600">{evt.details}</p>
              <div className="flex items-center gap-1 pt-1 font-mono text-[11px] text-slate-400">
                <UserCheck className="h-3 w-3 text-slate-400" /> Actor: {evt.actor}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
