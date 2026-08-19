import { useState } from "react";
import {
  Sparkles,
  Play,
  RefreshCw,
  FileText,
  Download,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowRight,
  Info,
  Clock,
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

  const isAcquired =
    config.billingStatus === "READY" ||
    config.billingStatus === "Ready" ||
    Boolean(config.snapshotNumber) ||
    Boolean(acquisitionResults?.labor?.snapshotNumber);

  const snapshotNumber =
    acquisitionResults?.labor?.snapshotNumber || config.snapshotNumber || (isAcquired ? "BS-20260814120000" : null);

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
    <div className="space-y-6 animate-fade-in">
      {/* Project Summary Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
                Acquisition Console • Active Project
              </span>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">{config.projectName}</h2>
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
              <span className="font-semibold text-slate-800">{config.client}</span>
              <span>•</span>
              <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-slate-600">{config.projectCode}</span>
              <span>•</span>
              <span className="font-mono text-slate-500">{config.billingPeriod}</span>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Status</span>
              <StatusBadge label={config.billingStatus} size="sm" />
            </div>
            {snapshotNumber && (
              <div className="flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 font-mono text-xs font-semibold text-emerald-700">
                <CheckCircle2 className="h-3 w-3" />
                Snapshot: {snapshotNumber}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Enterprise Setup Parameters */}
      <BillingSummaryGrid config={config} />

      {/* Acquired Source Data Timesheets */}
      <TimesheetDataTable
        records={timesheetRecords}
        currency={config.currency}
        loading={acquiring}
        billingType={config.billingType}
      />

      {/* Pre-Tax Commercial Calculation */}
      <CommercialCalculationCard
        laborAmount={laborAmount}
        expenseAmount={0}
        adjustments={0}
        currency={config.currency}
      />

      {/* Workspace Action Panel */}
      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <ShieldCheck className="h-4 w-4 text-indigo-600" />
            Acquisition Actions &amp; Invoice Readiness
          </h3>
          <span className="text-xs font-medium text-slate-500">Snapshot Lifecycle Stage</span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            {/* Primary Action Button */}
            {!isAcquired ? (
              <Button variant="primary" onClick={() => onAcquire(config)} disabled={acquiring}>
                <Play className={`h-4 w-4 ${acquiring ? "animate-spin" : ""}`} />
                {acquiring ? "Acquiring Snapshot..." : "Acquire Source Snapshot"}
              </Button>
            ) : (
              <Button variant="success" onClick={onContinueToTax}>
                <FileText className="h-4 w-4" />
                Generate Invoice Draft <ArrowRight className="ml-1 inline h-4 w-4" />
              </Button>
            )}

            {/* Re-Acquire / Refresh Button */}
            <Button variant="outline" onClick={() => onReAcquire(config)} disabled={acquiring}>
              <RefreshCw className={`h-3.5 w-3.5 ${acquiring ? "animate-spin" : ""}`} />
              Re-Acquire / Refresh
            </Button>

            {/* Export Snapshot */}
            <Button variant="outline" onClick={handleExport} disabled={downloading || !isAcquired}>
              <Download className="h-3.5 w-3.5" />
              {downloading ? "Exporting..." : "Export Snapshot"}
            </Button>
          </div>

          <div className="text-xs font-medium text-slate-500">
            {isAcquired ? (
              <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5" /> Snapshot READY for Tax Calculation
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 font-semibold text-amber-700">
                <AlertTriangle className="h-3.5 w-3.5" /> Awaiting Snapshot Creation
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
