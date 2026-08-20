import React from "react";
import {
  CheckCircle2,
  AlertTriangle,
  Clock,
  UserCheck,
  Eye,
  BellRing,
  RefreshCw,
  XCircle,
  FileCheck,
} from "lucide-react";
import StatusBadge from "../../../../components/status/statusbadge";
import Button from "../../../../components/Button/Button";

export default function BillingReadinessCard({
  config,
  acquisitionResults,
  onViewPending,
  onRemindPM,
  onReValidate,
  onReAcquire,
  loading = false,
  reminding = false,
}) {
  if (!config) return null;

  const status = config.billingStatus || "NOT_ACQUIRED";
  const laborRes = acquisitionResults?.labor || {};
  const readiness = laborRes.readiness || {};

  const approvedCount = readiness.approvedCount ?? (status === "READY" ? laborRes.records?.length || 0 : 0);
  const pendingCount = readiness.pendingCount ?? 0;
  const approvedHours = readiness.approvedHours ?? (status === "READY" ? laborRes.records?.reduce((acc, r) => acc + Number(r.hours || 0), 0) : 0);
  const pendingHours = readiness.pendingHours ?? 0;
  const pendingTimesheets = readiness.pendingTimesheets || [];

  const pendingEmployees = Array.from(new Set(pendingTimesheets.map((t) => t.employee).filter(Boolean)));
  const pmName = config.projectManager || "Alex Morgan (Project Lead)";

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
      {/* Top Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <FileCheck className="h-5 w-5 text-indigo-600" />
          <h3 className="text-base font-bold text-slate-900">Billing Readiness Control</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium">Readiness Status:</span>
          <StatusBadge label={status} size="sm" />
        </div>
      </div>

      {/* Main Readiness Content according to state */}
      {status === "READY" ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-4 text-emerald-900 space-y-2">
          <div className="flex items-center gap-2 font-bold text-emerald-800 text-sm">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            100% Approved — Billing Snapshot Ready
          </div>
          <p className="text-xs text-emerald-700">
            All required timesheets for this billing period have passed approval validation. Billing data is ready for tax calculation and downstream invoice processing.
          </p>
          <div className="flex items-center gap-4 text-xs font-semibold text-emerald-900 pt-1">
            <span>Approved Timesheets: <strong className="font-mono text-emerald-800">{approvedCount}</strong></span>
            <span>&middot;</span>
            <span>Total Billable Hours: <strong className="font-mono text-emerald-800">{approvedHours} hrs</strong></span>
          </div>
        </div>
      ) : status === "PARTIALLY_READY" ? (
        <div className="space-y-3">
          <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-4 text-amber-900 space-y-2">
            <div className="flex items-center gap-2 font-bold text-amber-900 text-sm">
              <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
              Billing Blocked — Timesheet Approvals Pending
            </div>
            <p className="text-xs text-amber-800">
              {acquisitionResults?.message ||
                `Billing snapshot cannot become READY. ${pendingCount} timesheet(s) totaling ${pendingHours} hours are still awaiting manager approval.`}
            </p>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-xs">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="text-slate-500 font-medium">Approved Timesheets</div>
              <div className="mt-1 text-lg font-bold font-mono text-emerald-700">{approvedCount}</div>
              <div className="text-[11px] text-slate-400 font-mono">{approvedHours} hrs</div>
            </div>

            <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3">
              <div className="text-amber-700 font-medium">Pending Approvals</div>
              <div className="mt-1 text-lg font-bold font-mono text-amber-800">{pendingCount}</div>
              <div className="text-[11px] text-amber-600 font-mono">{pendingHours} hrs</div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 col-span-2">
              <div className="text-slate-500 font-medium">Assigned Project Manager</div>
              <div className="mt-1 font-semibold text-slate-800">{pmName}</div>
              <div className="text-[11px] text-slate-400">
                {pendingEmployees.length > 0
                  ? `Pending employees: ${pendingEmployees.join(", ")}`
                  : "Awaiting approval action"}
              </div>
            </div>
          </div>
        </div>
      ) : status === "NO_DATA" ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900 space-y-2">
          <div className="flex items-center gap-2 font-bold text-amber-900 text-sm">
            <Clock className="h-5 w-5 text-amber-600 flex-shrink-0" />
            No Approved Timesheets Found
          </div>
          <p className="text-xs text-amber-800">
            {acquisitionResults?.message ||
              "No approved billable timesheets are available for the selected billing period. Please verify dates or remind the Project Manager to approve submitted timesheets."}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-rose-900 space-y-2">
          <div className="flex items-center gap-2 font-bold text-rose-900 text-sm">
            <XCircle className="h-5 w-5 text-rose-600 flex-shrink-0" />
            Acquisition Failed
          </div>
          <p className="text-xs text-rose-800">
            {acquisitionResults?.message || "We couldn't retrieve billing data at this time. Please try again."}
          </p>
        </div>
      )}

      {/* Control Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
        <div className="flex flex-wrap items-center gap-2">
          {status === "PARTIALLY_READY" && (
            <>
              <Button variant="outline" size="small" onClick={onViewPending}>
                <Eye className="h-3.5 w-3.5" />
                View Pending ({pendingCount})
              </Button>

              <Button
                variant="primary"
                size="small"
                onClick={onRemindPM}
                disabled={reminding}
                className="bg-amber-600 hover:bg-amber-700 text-white border-amber-600"
              >
                <BellRing className={`h-3.5 w-3.5 ${reminding ? "animate-spin" : ""}`} />
                {reminding ? "Sending..." : "Remind Project Manager"}
              </Button>
            </>
          )}

          {status === "NO_DATA" && pendingCount > 0 && (
            <Button
              variant="primary"
              size="small"
              onClick={onRemindPM}
              disabled={reminding}
              className="bg-amber-600 hover:bg-amber-700 text-white border-amber-600"
            >
              <BellRing className={`h-3.5 w-3.5 ${reminding ? "animate-spin" : ""}`} />
              Remind Project Manager
            </Button>
          )}

          <Button variant="outline" size="small" onClick={onReValidate} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Re-Validate
          </Button>

          <Button variant="outline" size="small" onClick={() => onReAcquire(config)} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Re-Acquire
          </Button>
        </div>

        <div className="text-[11px] font-medium text-slate-400">
          Rule: 100% timesheet approval required for READY status
        </div>
      </div>
    </div>
  );
}
