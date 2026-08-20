import { RefreshCw } from "lucide-react";
import Button from "../../../../components/Button/Button";

export default function AcquisitionHeader({ lastSync, onRefresh, refreshing }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button variant="outline" size="small" onClick={onRefresh} disabled={refreshing}>
        <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
        {refreshing ? "Syncing..." : "Refresh"}
      </Button>
    </div>
  );
}
