import { RefreshCw, Activity, ShieldCheck } from "lucide-react";
import Button from "../../../../components/Button/Button";

export default function AcquisitionHeader({ lastSync, onRefresh, refreshing }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          <Activity className="h-3 w-3" />
          Live Sync Operational
        </span>
        <span className="hidden items-center gap-1 text-xs text-slate-400 sm:flex">
          <ShieldCheck className="h-3.5 w-3.5 text-slate-400" /> Enterprise Console
        </span>
      </div>

      <div className="flex items-center gap-3">
        <div className="text-right">
          <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Last Synchronised</div>
          <div className="text-xs font-semibold text-slate-700">{lastSync || "Just now"}</div>
        </div>
        <Button variant="outline" size="small" onClick={onRefresh} disabled={refreshing}>
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "Refreshing..." : "Refresh Console"}
        </Button>
      </div>
    </div>
  );
}
