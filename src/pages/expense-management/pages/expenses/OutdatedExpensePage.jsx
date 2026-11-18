import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, ArrowLeft, BadgeCheck, CalendarDays, FileText, Inbox, Paperclip } from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb/Breadcrumb";
import LoadingSpinner from "@/components/LoadingSpinner";
import SectionCard from "@/components/ui/SectionCard";
import { showStatusToast } from "@/components/toastfy/toast";
import LateReceiptPanel from "@/pages/expense-management/components/expense-reports/LateReceiptPanel";
import SourceBadge from "@/pages/expense-management/approval-engine/components/SourceBadge";
import {
  LATE_RECEIPT_REPORT_STATUSES,
  expenseReportService,
  lineItemService,
} from "@/pages/expense-management/api/expenseReportsApi";

const BREADCRUMBS = [
  { label: "Expense Management", to: "/expense-management/dashboard" },
  { label: "Expenses", to: "/expense-management/expenses/my" },
  { label: "Outdated Expense" },
];

const STATUS_LABEL = {
  APPROVED: "Approved",
  REIMBURSED: "Reimbursed",
  CLOSED: "Closed",
};

// The report list comes back either as an array or as an object holding the rows under one of these keys.
const reportRows = (res) => {
  const payload = res?.data?.data;
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object") {
    return payload.reports || payload.expenseReports || payload.content || payload.data || [];
  }
  return [];
};

const formatDate = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "2-digit" });
};

const lineRows = (res) => {
  const payload = res?.data?.data;
  return Array.isArray(payload) ? payload : payload?.lineItems || payload?.content || payload?.data || [];
};

/**
 * Outdated expense: attach a receipt found after a report was settled. The employee picks one of their settled
 * reports (approved, reimbursed or closed), then uses the same late-receipt panel as the report page. The attach rules
 * (status, date, reason, duplicate check) are enforced by the backend, not here.
 */
export default function OutdatedExpensePage() {
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [lineItems, setLineItems] = useState([]);
  const [loadingLines, setLoadingLines] = useState(false);

  const settled = useMemo(
    () => reports.filter((r) => LATE_RECEIPT_REPORT_STATUSES.includes((r.reportStatus || "").toUpperCase())),
    [reports],
  );
  const selected = settled.find((r) => r.reportId === selectedId) || null;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await expenseReportService.getAll({ limit: 1000, page: 1 });
        if (!cancelled) setReports(reportRows(res));
      } catch (err) {
        if (!cancelled) setLoadError(err?.response?.data?.message || "Could not load your expense reports.");
      } finally {
        if (!cancelled) setLoadingReports(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setLineItems([]);
      return undefined;
    }
    let cancelled = false;
    setLoadingLines(true);
    lineItemService
      .getAll(selectedId)
      .then((res) => {
        if (!cancelled) setLineItems(lineRows(res));
      })
      .catch((err) => {
        if (!cancelled) {
          setLineItems([]);
          showStatusToast(err?.response?.data?.message || "Could not load the expenses of this report.", "error");
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingLines(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const statusOf = (r) => STATUS_LABEL[(r?.reportStatus || "").toUpperCase()] || r?.reportStatus;

  return (
    <div className="space-y-4">
      <Breadcrumb items={BREADCRUMBS} />

      {/* Banner: same look as the other Expense Management pages */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0A0082] via-[#18208f] to-[#2f3f9e] px-5 py-5 text-white shadow-[0_18px_40px_-24px_rgba(10,0,130,0.7)] sm:px-6">
        <span aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/[0.06]" />
        <span aria-hidden="true" className="pointer-events-none absolute -bottom-24 right-48 h-56 w-56 rounded-full bg-[#ff3d72]/[0.12] blur-2xl" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15">
              <Paperclip size={22} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Outdated expense</h1>
              <p className="mt-0.5 text-sm text-white/70">
                Attach a receipt you found after a report was settled. Choose the report, then add the receipt to its expense.
              </p>
              <p className="mt-3 inline-flex flex-wrap items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium ring-1 ring-white/15">
                {loadingReports ? (
                  "Checking your reports..."
                ) : loadError ? (
                  <>
                    <AlertTriangle size={14} className="text-amber-300" aria-hidden="true" />
                    Reports could not be loaded
                  </>
                ) : (
                  <>
                    <BadgeCheck size={14} className="text-emerald-300" aria-hidden="true" />
                    {settled.length} settled report{settled.length === 1 ? "" : "s"} you can add a receipt to
                  </>
                )}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate("/expense-management/expenses/my")}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white/10 px-3.5 py-2 text-sm font-semibold text-white ring-1 ring-white/20 transition hover:bg-white/15"
          >
            <ArrowLeft size={15} aria-hidden="true" />
            My expense reports
          </button>
        </div>
      </section>

      {loadingReports ? (
        <div className="flex items-center justify-center rounded-2xl border border-slate-100 bg-white py-16">
          <LoadingSpinner text="Loading your settled reports…" />
        </div>
      ) : loadError ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-12 text-center">
          <AlertTriangle className="h-6 w-6 text-rose-500" aria-hidden="true" />
          <p className="text-sm font-semibold text-rose-700" role="alert">
            {loadError}
          </p>
        </div>
      ) : settled.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-slate-100 bg-white px-4 py-14 text-center shadow-[0_1px_2px_rgba(10,0,130,0.04),0_10px_30px_-18px_rgba(10,0,130,0.18)]">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0A0082]/10 text-[#0A0082]">
            <Inbox size={22} aria-hidden="true" />
          </span>
          <p className="mt-1 text-sm font-semibold text-[#0a174e]">No settled expense reports yet.</p>
          <p className="max-w-sm text-xs text-slate-500">A receipt can be attached only to a report that is approved, reimbursed or closed.</p>
          <button
            type="button"
            onClick={() => navigate("/expense-management/expenses/my")}
            className="mt-2 inline-flex items-center gap-2 rounded-xl bg-[#0A0082] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#080066]"
          >
            Go to my expense reports
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Step 1: pick the report */}
          <SectionCard title="1. Choose the report" icon={FileText} tone="navy">
            <div className="space-y-3">
              <div>
                <label htmlFor="outdated-report" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Settled expense report
                </label>
                <select
                  id="outdated-report"
                  name="settledReport"
                  value={selectedId}
                  onChange={(e) => setSelectedId(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 shadow-sm transition hover:border-slate-300 focus:border-[#0A0082]/50 focus:outline-none focus:ring-2 focus:ring-[#0A0082]/15"
                >
                  <option value="">Select a report</option>
                  {settled.map((r) => (
                    <option key={r.reportId} value={r.reportId}>
                      {r.reportNumber || "Report"} · {r.title || "Untitled"} · {statusOf(r)}
                    </option>
                  ))}
                </select>
              </div>

              {selected ? (
                <div className="space-y-2 rounded-xl border border-[#0A0082]/15 bg-[#0A0082]/[0.03] p-3 text-sm text-slate-700" data-testid="selected-report">
                  <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
                    <span className="font-semibold text-[#0a174e]">{selected.reportNumber}</span> · {selected.title || "Untitled"} ·{" "}
                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
                      {statusOf(selected)}
                    </span>
                    <SourceBadge cashAdvanceId={selected.cashAdvanceId} />
                  </div>
                  {(selected.tripStartDate || selected.tripEndDate) && (
                    <p className="flex items-start gap-1.5 text-xs text-slate-500">
                      <CalendarDays size={13} className="mt-px shrink-0 text-slate-400" aria-hidden="true" />
                      <span>
                        Trip: {formatDate(selected.tripStartDate)} – {formatDate(selected.tripEndDate)}. Add a receipt you forgot for an
                        expense on this trip.
                      </span>
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-500">Only approved, reimbursed or closed reports are listed.</p>
              )}
            </div>
          </SectionCard>

          {/* Step 2: attach the receipt */}
          <SectionCard title="2. Attach the receipt" icon={Paperclip} tone="pink" className="lg:col-span-2">
            {!selected ? (
              <div className="flex h-full min-h-[160px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-8 text-center">
                <Paperclip size={20} className="text-slate-300" aria-hidden="true" />
                <p className="text-sm text-slate-500">Choose a report to see its expenses.</p>
              </div>
            ) : loadingLines ? (
              <div className="flex min-h-[160px] items-center justify-center">
                <LoadingSpinner text="Loading expenses…" />
              </div>
            ) : lineItems.length === 0 ? (
              <div className="flex min-h-[160px] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-8 text-center">
                <p className="text-sm text-slate-500">This report has no expenses to attach a receipt to.</p>
              </div>
            ) : (
              <LateReceiptPanel
                reportId={selected.reportId}
                reportStatus={(selected.reportStatus || "").toUpperCase()}
                lineItems={lineItems}
                tripStartDate={selected.tripStartDate}
                tripEndDate={selected.tripEndDate}
              />
            )}
          </SectionCard>
        </div>
      )}
    </div>
  );
}
