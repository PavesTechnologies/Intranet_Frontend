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
      alert("Snapshot details exported to CSV.");
    }, 600);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Project Hero Card */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 text-white shadow-lg border border-indigo-900/40 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 h-48 w-48 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-300">
                Acquisition Console • Active Project
              </span>
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">{config.projectName}</h2>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-300">
              <span className="font-bold text-white">{config.client}</span>
              <span>•</span>
              <span className="font-mono bg-white/10 px-2 py-0.5 rounded text-indigo-200">{config.projectCode}</span>
              <span>•</span>
              <span className="font-mono text-indigo-200">{config.billingPeriod}</span>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3.5 py-2 rounded-xl border border-white/15 shadow-inner">
              <span className="text-[10px] font-bold text-indigo-200 uppercase tracking-wider">Status</span>
              <StatusBadge label={config.billingStatus} />
            </div>
            {snapshotNumber && (
              <div className="text-[11px] font-mono font-bold text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 rounded-lg flex items-center gap-1">
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
      <div className="rounded-2xl bg-white p-5 border border-slate-200/90 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-indigo-600" />
            Acquisition Actions & Invoice Readiness
          </h3>
          <span className="text-[11px] text-slate-500 font-medium">Snapshot Lifecycle Stage</span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            {/* Primary Action Button */}
            {!isAcquired ? (
              <Button
                variant="primary"
                className="py-2.5 px-5 font-bold text-xs shadow-sm bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2"
                onClick={() => onAcquire(config)}
                disabled={acquiring}
              >
                <Play className={`h-4 w-4 ${acquiring ? "animate-spin" : ""}`} />
                {acquiring ? "Acquiring Snapshot..." : "Acquire Source Snapshot"}
              </Button>
            ) : (
              <Button
                variant="primary"
                className="py-2.5 px-5 font-bold text-xs shadow-sm bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2"
                onClick={onContinueToTax}
              >
                <FileText className="h-4 w-4" />
                Generate Invoice Draft <ArrowRight className="h-4 w-4 ml-1 inline" />
              </Button>
            )}

            {/* Re-Acquire / Refresh Button */}
            <Button
              variant="secondary"
              className="py-2 px-3.5 font-bold text-xs text-slate-700 border-slate-200 hover:bg-slate-50 flex items-center gap-1.5"
              onClick={() => onReAcquire(config)}
              disabled={acquiring}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${acquiring ? "animate-spin" : ""}`} />
              Re-Acquire / Refresh
            </Button>

            {/* Export Snapshot */}
            <Button
              variant="secondary"
              className="py-2 px-3.5 font-bold text-xs text-slate-700 border-slate-200 hover:bg-slate-50 flex items-center gap-1.5"
              onClick={handleExport}
              disabled={downloading || !isAcquired}
            >
              <Download className="h-3.5 w-3.5" />
              {downloading ? "Exporting..." : "Export Snapshot"}
            </Button>
          </div>

          <div className="text-xs text-slate-500 font-medium">
            {isAcquired ? (
              <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 font-bold">
                <CheckCircle2 className="h-3.5 w-3.5" /> Snapshot READY for Tax Calculation
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200 font-bold">
                <AlertTriangle className="h-3.5 w-3.5" /> Awaiting Snapshot Creation
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
