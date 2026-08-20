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
import BillingReadinessCard from "./BillingReadinessCard";
import PendingTimesheetsModal from "./PendingTimesheetsModal";

export default function SnapshotWorkspace({
  config,
  acquisitionResults,
  acquiring,
  onAcquire,
  onReAcquire,
  onContinueToTax,
  onRemindPM,
  onReValidate,
  remindingPM = false,
}) {
  const [downloading, setDownloading] = useState(false);
  const [showPendingModal, setShowPendingModal] = useState(false);

  if (!config) return null;

  const isAcquired = config.billingStatus === "READY" || config.billingStatus === "Ready";

  const snapshotNumber = isAcquired
    ? acquisitionResults?.labor?.snapshotNumber || config.snapshotNumber || null
    : null;

  const timesheetRecords = acquisitionResults?.labor?.records || [];
  const laborAmount = acquisitionResults?.labor?.amount || 0;
  const pendingTimesheets = acquisitionResults?.labor?.readiness?.pendingTimesheets || [];

  const handleExport = () => {
    setDownloading(true);
    setTimeout(() => {
      setDownloading(false);
      showStatusToast("Snapshot details exported to CSV.", "success");
    }, 600);
  };

  return (
    <div className="space-y-3.5 animate-fade-in">
      {/* Project Header + Meta + Primary Actions */}
      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
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
            {config.billingStatus === "NOT_ACQUIRED" || !config.billingStatus ? (
              <Button variant="primary" onClick={() => onAcquire(config)} disabled={acquiring}>
                <Play className={`h-4 w-4 ${acquiring ? "animate-spin" : ""}`} />
                {acquiring ? "Acquiring Snapshot..." : "Acquire Source Snapshot"}
              </Button>
            ) : acquiring || config.billingStatus === "VALIDATING" ? (
              <Button variant="primary" disabled className="bg-indigo-600 border-indigo-600 text-white">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Validating Billing Data...
              </Button>
            ) : config.billingStatus === "NO_BILLABLE_DATA" || config.billingStatus === "NO_DATA" ? (
              <Button variant="primary" onClick={() => onAcquire(config)} disabled={acquiring}>
                <RefreshCw className={`h-4 w-4 ${acquiring ? "animate-spin" : ""}`} />
                Check Again
              </Button>
            ) : config.billingStatus === "PARTIALLY_READY" || config.billingStatus === "PENDING_APPROVAL" ? (
              <Button variant="primary" onClick={onReValidate} disabled={acquiring} className="bg-amber-600 hover:bg-amber-700 text-white border-amber-600">
                <RefreshCw className={`h-4 w-4 ${acquiring ? "animate-spin" : ""}`} />
                Re-Validate Approvals
              </Button>
            ) : config.billingStatus === "ACQUISITION_FAILED" ? (
              <Button variant="primary" onClick={() => onAcquire(config)} disabled={acquiring} className="bg-rose-600 hover:bg-rose-700 text-white border-rose-600">
                <RefreshCw className={`h-4 w-4 ${acquiring ? "animate-spin" : ""}`} />
                Retry Acquisition
              </Button>
            ) : config.billingStatus === "CONFIGURATION_REQUIRED" ? (
              <Button variant="primary" onClick={() => showStatusToast("Opening Billing Configuration Setup...", "info")} disabled={acquiring} className="bg-amber-600 hover:bg-amber-700 text-white border-amber-600">
                Review Billing Setup
              </Button>
            ) : null}

            {isAcquired && (
              <Button variant="outline" size="small" onClick={() => onReAcquire(config)} disabled={acquiring}>
                <RefreshCw className={`h-3.5 w-3.5 ${acquiring ? "animate-spin" : ""}`} />
                Re-Acquire
              </Button>
            )}

            <Button variant="outline" size="small" onClick={handleExport} disabled={downloading || !isAcquired}>
              <Download className="h-3.5 w-3.5" />
              {downloading ? "Exporting..." : "Export"}
            </Button>
          </div>

          {isAcquired ? (
            <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" /> Ready for Tax Calculation
            </span>
          ) : config.billingStatus === "PARTIALLY_READY" ? (
            <span className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
              <AlertTriangle className="h-3.5 w-3.5" /> Partially Ready
            </span>
          ) : config.billingStatus === "PENDING_APPROVAL" ? (
            <span className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
              <AlertTriangle className="h-3.5 w-3.5" /> Pending Approval
            </span>
          ) : config.billingStatus === "NO_BILLABLE_DATA" || config.billingStatus === "NO_DATA" ? (
            <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700">
              <AlertTriangle className="h-3.5 w-3.5" /> No Billable Data
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

      {/* Two-Column Financial Operations Workspace */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 items-start">
        {/* Left Column: Source Timesheets (dominant working area ~68% width) */}
        <div className="lg:col-span-8 min-w-0">
          <TimesheetDataTable
            records={timesheetRecords}
            currency={config.currency}
            loading={acquiring}
            billingType={config.billingType}
            billingStatus={config.billingStatus}
          />
        </div>

        {/* Right Column: Financial Control Rail (~32% width, sticky on desktop) */}
        <aside className="lg:col-span-4 space-y-4 lg:sticky lg:top-6 self-start">
          {/* 1. Billing Readiness Control */}
          <BillingReadinessCard
            config={config}
            acquisitionResults={acquisitionResults}
            onViewPending={() => setShowPendingModal(true)}
            onRemindPM={onRemindPM}
            onReValidate={onReValidate}
            onReAcquire={onReAcquire}
            loading={acquiring}
            reminding={remindingPM}
          />

          {/* 2. Commercial Value */}
          <CommercialCalculationCard
            laborAmount={laborAmount}
            expenseAmount={0}
            adjustments={0}
            currency={config.currency}
            onContinueToTax={onContinueToTax}
            isAcquired={isAcquired}
            billingStatus={config.billingStatus}
            disabled={acquiring}
          />
        </aside>
      </div>

      {/* Pending Approvals Modal */}
      <PendingTimesheetsModal
        isOpen={showPendingModal}
        onClose={() => setShowPendingModal(false)}
        pendingTimesheets={pendingTimesheets}
        config={config}
        onRemindPM={onRemindPM}
        reminding={remindingPM}
      />
    </div>
  );
}
