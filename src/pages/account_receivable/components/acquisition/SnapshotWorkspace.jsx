import { useState } from "react";
import {
  Play,
  RefreshCw,
  FileText,
  Download,
  CheckCircle2,
  ArrowRight,
  AlertTriangle,
} from "lucide-react";
import StatusBadge from "../../../../components/status/statusbadge";
import Button from "../../../../components/Button/Button";
import { showStatusToast } from "../../../../components/toastfy/toast";
import BillingSummaryGrid from "./BillingSummaryGrid";
import TimesheetDataTable from "./TimesheetDataTable";
import CommercialCalculationCard from "./CommercialCalculationCard";

export default function SnapshotWorkspace({
  config,
  acquisitionResults,
  acquiring,
  onAcquire,
  onReAcquire,
  onContinueToTax,
}) {
  const [downloading, setDownloading] = useState(false);

  if (!config) return null;

  const isAcquired = config.billingStatus === "READY" || config.billingStatus === "Ready";

  const snapshotNumber = isAcquired
    ? acquisitionResults?.labor?.snapshotNumber || config.snapshotNumber || null
    : null;

  const timesheetRecords = acquisitionResults?.labor?.records || [];
  const laborAmount = acquisitionResults?.labor?.amount || 0;

  const handleExport = () => {
    setDownloading(true);
    setTimeout(() => {
      setDownloading(false);
      showStatusToast("Snapshot details exported to CSV.", "success");
    }, 600);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Project Header + Meta + Primary Actions */}
      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div className="space-y-1">
            <h2 className="text-lg font-bold tracking-tight text-slate-900">{config.projectName}</h2>
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
              <span className="font-semibold text-slate-700">{config.client}</span>
              <span>&middot;</span>
              <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-slate-600">{config.projectCode}</span>
              <span>&middot;</span>
              <span className="font-mono text-slate-500">{config.billingPeriod}</span>
            </div>
          </div>

          <div className="flex flex-shrink-0 items-center gap-2">
            <StatusBadge label={config.billingStatus} size="sm" />
            {isAcquired && snapshotNumber && (
              <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-mono text-[11px] font-semibold text-emerald-700">
                <CheckCircle2 className="h-3 w-3" />
                {snapshotNumber}
              </span>
            )}
          </div>
        </div>

        {/* Enterprise setup parameters — compact inline chips */}
        <div className="border-t border-slate-100 pt-3">
          <BillingSummaryGrid config={config} />
        </div>

        {/* Primary actions — kept near the top so they stay visible */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3.5">
          <div className="flex flex-wrap items-center gap-2.5">
            {!isAcquired && (
              <Button variant="primary" onClick={() => onAcquire(config)} disabled={acquiring}>
                <Play className={`h-4 w-4 ${acquiring ? "animate-spin" : ""}`} />
                {acquiring ? "Acquiring Snapshot..." : "Acquire Source Snapshot"}
              </Button>
            )}

            <Button variant="outline" size="small" onClick={() => onReAcquire(config)} disabled={acquiring}>
              <RefreshCw className={`h-3.5 w-3.5 ${acquiring ? "animate-spin" : ""}`} />
              Re-Acquire
            </Button>

            <Button variant="outline" size="small" onClick={handleExport} disabled={downloading || !isAcquired}>
              <Download className="h-3.5 w-3.5" />
              {downloading ? "Exporting..." : "Export"}
            </Button>
          </div>

          {isAcquired ? (
            <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" /> Ready for Tax Calculation
            </span>
          ) : config.billingStatus === "NO_DATA" ? (
            <span className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
              <AlertTriangle className="h-3.5 w-3.5" /> No Billing Data
            </span>
          ) : config.billingStatus === "ACQUISITION_FAILED" ? (
            <span className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">
              <AlertTriangle className="h-3.5 w-3.5" /> Acquisition Failed
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700">
              <AlertTriangle className="h-3.5 w-3.5" /> Awaiting Snapshot Creation
            </span>
          )}
        </div>
      </div>

      {/* State Feedback Notice Banner */}
      {config.billingStatus === "NO_DATA" && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900 shadow-sm">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
            <div className="space-y-1">
              <h4 className="font-bold text-amber-900 text-sm">No timesheets found</h4>
              <p className="text-xs text-amber-800">
                {acquisitionResults?.message ||
                  "No approved timesheets were found for the selected billing period. Please verify the billing period and timesheet data, then try again."}
              </p>
            </div>
          </div>
        </div>
      )}

      {config.billingStatus === "ACQUISITION_FAILED" && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-900 shadow-sm">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-rose-600" />
            <div className="space-y-1">
              <h4 className="font-bold text-rose-900 text-sm">Unable to acquire billing data</h4>
              <p className="text-xs text-rose-800">
                {acquisitionResults?.message ||
                  "We couldn't retrieve billing data at this time. Please try again."}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Source data (main) + Commercial summary (sidebar) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 items-start">
        <div className="lg:col-span-8">
          <TimesheetDataTable
            records={timesheetRecords}
            currency={config.currency}
            loading={acquiring}
            billingType={config.billingType}
            billingStatus={config.billingStatus}
          />
        </div>
        <div className="lg:col-span-4">
          <CommercialCalculationCard
            laborAmount={laborAmount}
            expenseAmount={0}
            adjustments={0}
            currency={config.currency}
            onContinueToTax={onContinueToTax}
            isAcquired={isAcquired}
            disabled={acquiring}
          />
        </div>
      </div>
    </div>
  );
}
