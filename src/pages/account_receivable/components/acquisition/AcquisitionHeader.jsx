import { RefreshCw, Activity, ShieldCheck } from "lucide-react";
import Button from "../../../../components/Button/Button";

export default function AcquisitionHeader({ lastSync, onRefresh, refreshing }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 text-white shadow-xl border border-indigo-900/40 relative overflow-hidden">
      {/* Background Glow Overlay */}
      <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

      <div className="space-y-1 z-10">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-500/30">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
            <Activity className="h-3 w-3" />
            Live Sync Operational
          </span>
          <span className="text-xs text-slate-400 font-mono hidden sm:inline">•</span>
          <span className="text-xs text-indigo-200/80 hidden sm:inline flex items-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5 text-indigo-400 inline" /> Enterprise Console
          </span>
        </div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">
          Billing Data Acquisition Console
        </h1>
        <p className="text-xs sm:text-sm text-slate-300 max-w-2xl font-normal">
          Manage source data acquisition, review billing snapshots, and prepare commercial records for invoicing.
        </p>
      </div>

      <div className="flex items-center gap-3 z-10">
        <div className="text-right hidden md:block">
          <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Last Synchronised</div>
          <div className="text-xs font-mono font-semibold text-indigo-200">{lastSync || "Just now"}</div>
        </div>
        <Button
          variant="secondary"
          className="bg-white/10 hover:bg-white/20 text-white border-white/20 hover:border-white/30 backdrop-blur-md transition-all duration-200 text-xs font-bold py-2 px-3.5 flex items-center gap-2 shadow-sm"
          onClick={onRefresh}
          disabled={refreshing}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin text-indigo-300" : ""}`} />
          {refreshing ? "Refreshing..." : "Refresh Console"}
        </Button>
      </div>
    </div>
  );
}
