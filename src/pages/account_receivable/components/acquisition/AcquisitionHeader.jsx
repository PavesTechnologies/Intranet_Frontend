import { RefreshCw } from "lucide-react";
import Button from "../../../../components/Button/Button";

export default function AcquisitionHeader({ lastSync, onRefresh, refreshing }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
        </span>
        Live
      </span>
      <span className="hidden text-xs text-slate-400 sm:inline">
        Synced {lastSync || "just now"}
      </span>
      <Button variant="outline" size="small" onClick={onRefresh} disabled={refreshing}>
        <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
        {refreshing ? "Syncing..." : "Refresh"}
      </Button>
    </div>
  );
}
