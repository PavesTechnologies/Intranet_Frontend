import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AlertTriangle, ArrowLeft, Eye, FilePlus2, Inbox, Pencil, Search, XCircle } from "lucide-react";
import { showStatusToast } from "@/components/toastfy/toast";
import Button from "@/components/Button/Button";
import FormSelect from "@/components/forms/FormSelect";
import ConfirmationModal from "@/components/confirmation_modal/ConfirmationModal";
import Modal from "@/components/Modal/modal";
import { expenseReportService } from "@/pages/expense-management/api/expenseReportsApi";
import {
  LATE_REASON_OPTIONS,
  errorMessage,
  supplementaryClaimService,
  unwrap,
  unwrapList,
} from "@/pages/expense-management/api/supplementaryClaimApi";
import {
  SORT_OPTIONS,
  STATUS_FILTER_OPTIONS,
  TONE_CLASSES,
  listRowActionStates,
  filterAndSortClaims,
  paymentInfo,
  statusLabel,
  statusTone,
  summarizeClaims,
} from "@/pages/expense-management/pages/supplementary/supplementaryClaimList";

// The report list comes back either as an array or as an object holding the rows under one of these keys.
const reportRows = (res) => {
  const payload = res?.data?.data;
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object") {
    return payload.reports || payload.expenseReports || payload.content || payload.data || [];
  }
  return [];
};

const formatDate = (value) => (value ? new Date(value).toLocaleDateString() : "—");
const formatMoney = (amount, currency) => {
  const value = Number(amount || 0);
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: currency || "INR" }).format(value);
  } catch {
    return `${currency || ""} ${value.toFixed(2)}`.trim();
  }
};
const detailPath = (claimId) => `/expense-management/expenses/supplementary/${claimId}`;

// Reports that might be eligible. The backend decides the final eligibility (payment and cash advance settlement).
const CANDIDATE_REPORT_STATUSES = ["APPROVED", "REIMBURSED", "CLOSED"];

/**
 * Employee entry point for supplementary claims: a summary of the caller's claims, the claims table, and the way to
 * raise a new claim against a settled report. Eligibility is asked from the backend before a draft is created.
 */
export default function SupplementaryClaimsPage() {
  const navigate = useNavigate();
  const [claims, setClaims] = useState([]);
  const [loadingClaims, setLoadingClaims] = useState(true);
  const [claimsError, setClaimsError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sort, setSort] = useState("created-desc");
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  const [settledReports, setSettledReports] = useState([]);
  // Backend eligibility per candidate report: { [reportId]: { eligible, reason, hasCashAdvance } }.
  const [eligibilityById, setEligibilityById] = useState({});
  const [checkingAll, setCheckingAll] = useState(false);
  const [reportId, setReportId] = useState("");
  const [raiseOpen, setRaiseOpen] = useState(false);
  const closeRaise = () => setRaiseOpen(false);
  const [eligibility, setEligibility] = useState(null);
  const [checking, setChecking] = useState(false);
  const [form, setForm] = useState({ lateReasonCode: "", lateReasonText: "" });
  const [formError, setFormError] = useState("");
  const [creating, setCreating] = useState(false);

  const loadClaims = useCallback(() => {
    setLoadingClaims(true);
    setClaimsError("");
    return supplementaryClaimService
      .listMine()
      .then((res) => setClaims(unwrapList(res)))
      .catch((err) => setClaimsError(errorMessage(err, "Could not load your claims. Try again.")))
      .finally(() => setLoadingClaims(false));
  }, []);

  useEffect(() => {
    loadClaims();
  }, [loadClaims]);

  useEffect(() => {
    let cancelled = false;
    expenseReportService
      .getAll({ limit: 1000, page: 1 })
      .then((res) => {
        if (cancelled) return;
        setSettledReports(
          reportRows(res).filter((r) => CANDIDATE_REPORT_STATUSES.includes((r.reportStatus || "").toUpperCase())),
        );
      })
      .catch(() => !cancelled && setSettledReports([]));
    return () => {
      cancelled = true;
    };
  }, []);

  // Ask the backend about every candidate, so the dropdown lists only reports whose money is settled (paid by AP, or
  // settled against a reconciled cash advance) and the rest are shown with the reason they are not ready yet.
  useEffect(() => {
    if (!settledReports.length) return undefined;
    let cancelled = false;
    setCheckingAll(true);
    Promise.all(
      settledReports.map((r) =>
        supplementaryClaimService
          .eligibility(r.reportId)
          .then((res) => [r.reportId, unwrap(res)])
          .catch((err) => [r.reportId, { eligible: false, reason: errorMessage(err, "Could not check this report.") }]),
      ),
    )
      .then((pairs) => !cancelled && setEligibilityById(Object.fromEntries(pairs)))
      .finally(() => !cancelled && setCheckingAll(false));
    return () => {
      cancelled = true;
    };
  }, [settledReports]);
  const readyReports = settledReports.filter((r) => eligibilityById[r.reportId]?.eligible);
  const notReadyReports = settledReports.filter((r) => eligibilityById[r.reportId] && !eligibilityById[r.reportId].eligible);
  const settledHow = (r) => {
    const e = eligibilityById[r.reportId];
    if (e?.settleAgainstAdvanceId) return `balance carried to ${e.settleAgainstAdvanceTitle || "your next advance"}`;
    // Otherwise the claim is paid by AP: no advance, the advance was closed by repayment or salary deduction, or the
    // advance holding the carried balance is already in use.
    return "paid by AP";
  };

  const summary = useMemo(() => summarizeClaims(claims), [claims]);
  const visibleClaims = useMemo(
    () => filterAndSortClaims(claims, { search, status: statusFilter, sort }),
    [claims, search, statusFilter, sort],
  );
  const filtersActive = search.trim() !== "" || statusFilter !== "ALL";

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("ALL");
  };

  const confirmCancel = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      await supplementaryClaimService.cancel(cancelTarget.claimId);
      showStatusToast(`Claim ${cancelTarget.claimNumber} cancelled.`, "success");
      setCancelTarget(null);
      loadClaims();
    } catch (err) {
      showStatusToast(errorMessage(err, "Could not cancel this claim."), "error");
    } finally {
      setCancelling(false);
    }
  };

  const chooseReport = async (id) => {
    setReportId(id);
    setEligibility(null);
    setFormError("");
    if (!id) return;
    setChecking(true);
    try {
      const res = await supplementaryClaimService.eligibility(id);
      setEligibility(unwrap(res));
    } catch (err) {
      setEligibility({ eligible: false, reason: errorMessage(err, "Could not check this report.") });
    } finally {
      setChecking(false);
    }
  };

  // Opened from a report's "Create supplementary claim" button: preselect that report and check it.
  const [searchParams] = useSearchParams();
  const presetReport = searchParams.get("reportId");
  useEffect(() => {
    if (presetReport && reportId !== presetReport && settledReports.some((r) => r.reportId === presetReport)) {
      setRaiseOpen(true);
      chooseReport(presetReport);
    }
    // chooseReport is recreated each render; the effect should run only when the preset or the report list changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presetReport, settledReports]);

  const createDraft = async (e) => {
    e.preventDefault();
    setFormError("");
    if (!reportId || !eligibility?.eligible) return setFormError("Choose a report that is eligible for a supplementary claim.");
    if (!form.lateReasonCode) return setFormError("Choose the reason the expense is missing.");
    if (form.lateReasonCode === "OTHER" && form.lateReasonText.trim().length < 5) {
      return setFormError("Explain the reason in at least 5 characters.");
    }
    setCreating(true);
    try {
      const res = await supplementaryClaimService.create({
        reportId,
        lateReasonCode: form.lateReasonCode,
        lateReasonText: form.lateReasonText.trim() || null,
      });
      const created = unwrap(res);
      showStatusToast("Draft created. Add the missing expenses to submit it.", "success");
      navigate(detailPath(created.claimId));
    } catch (err) {
      setFormError(errorMessage(err, "Could not create the claim."));
    } finally {
      setCreating(false);
    }
  };

  const goBack = () => {
    if (window.history.length > 1) window.history.back();
    else window.location.assign("/expense-management/dashboard");
  };

  const raiseClaim = () => setRaiseOpen(true);

  const summaryCards = [
    { label: "Total claims", value: summary.total, hint: "All your supplementary claims", tone: "neutral" },
    { label: "Draft", value: summary.draft, hint: "Not yet submitted", tone: "neutral" },
    { label: "Pending approval", value: summary.pendingApproval, hint: "With your manager or Finance", tone: "info" },
    { label: "Clarification required", value: summary.clarification, hint: "Needs your reply", tone: "warning" },
    { label: "Settled", value: summary.settled, hint: "Paid to you", tone: "success" },
  ];

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 p-4 sm:p-6">
      <button type="button" onClick={goBack} className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-700 hover:underline">
        <ArrowLeft size={16} aria-hidden="true" /> Back
      </button>

      {/* Page header */}
      <header className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex min-w-0 items-start gap-3">
          <div className="shrink-0 rounded-xl bg-indigo-50 p-2.5 text-[#0A0082]">
            <FilePlus2 size={20} aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-[#0a174e]">My Supplementary Claims</h1>
            <p className="mt-0.5 text-sm text-gray-500">
              Track the expenses you missed on settled reports, from your manager and Finance through to payment. Your original report is not changed.
            </p>
          </div>
        </div>
        <Button variant="primary" size="small" onClick={raiseClaim} className="shrink-0">
          <FilePlus2 size={14} aria-hidden="true" /> Raise a claim
        </Button>
      </header>

      {/* Raise a new claim against a settled report, in a dialog opened from the page. */}
      <Modal isOpen={raiseOpen} onClose={closeRaise} title="Raise a new claim" subtitle="Choose the paid or settled report that is missing an expense or receipt." size="4xl"
        maxHeight="max-h-[90vh]" bodyClassName="min-h-[60vh] px-6 pt-5 pb-6 sm:px-8 sm:pt-6 sm:pb-8">
        <div className="flex flex-col gap-5">
        {!checkingAll && notReadyReports.length > 0 && (
          <details className="order-last rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2 text-xs text-amber-900" data-not-ready-reports>
            <summary className="cursor-pointer font-semibold">
              {notReadyReports.length} approved report{notReadyReports.length === 1 ? " is" : "s are"} not paid or settled yet
            </summary>
            <ul className="mt-2 space-y-1">
              {notReadyReports.map((r) => (
                <li key={r.reportId}>
                  <span className="font-mono">{r.reportNumber || r.reportId}</span>: {eligibilityById[r.reportId].reason}
                </li>
              ))}
            </ul>
          </details>
        )}
        {checkingAll ? (
          <p className="text-sm text-gray-500" role="status">Checking which of your reports are paid or settled…</p>
        ) : readyReports.length === 0 ? (
          <p className="text-sm text-gray-600" data-no-ready-reports>
            None of your reports is paid or settled yet. A claim can be added once the report is paid by AP, or settled against
            a closed cash advance.
          </p>
        ) : (
          <>
            <FormSelect
              label="Paid or settled report"
              name="reportId"
              value={reportId}
              onChange={(e) => chooseReport(e.target.value)}
              options={readyReports.map((r) => ({
                value: r.reportId,
                label: `${r.reportNumber || r.reportId} — ${r.title || "Expense report"} (${settledHow(r)})`,
              }))}
              placeholder="Select a report"
              maxVisibleOptions={6}
            />
            {checking && <p className="text-sm text-gray-500">Checking eligibility…</p>}
            {eligibility && !checking && (
              <p className={`text-sm ${eligibility.eligible ? "text-emerald-700" : "text-red-600"}`} role="status">
                {eligibility.eligible
                  ? "This report can take a supplementary claim."
                  : eligibility.reason}
                {eligibility.eligible && eligibility.settleAgainstAdvanceId && (
                  <span className="mt-1 block text-xs text-gray-600" data-settle-against>
                    This report's advance balance was carried forward to <b>{eligibility.settleAgainstAdvanceTitle || "your next advance"}</b>.
                    Once Finance approves the claim, up to{" "}
                    <b>{formatMoney(eligibility.settleAgainstRemaining, eligibility.currencyCode || "INR")}</b> (the balance carried
                    forward from this report's advance) is set against it, so nothing is paid to your bank for that part. Anything
                    above it is paid to you by AP.
                  </span>
                )}
              </p>
            )}
            {eligibility?.eligible && (
              <form onSubmit={createDraft} className="space-y-3" noValidate>
                <FormSelect
                  label="Why is the expense missing from the report?"
                  name="lateReasonCode"
                  value={form.lateReasonCode}
                  onChange={(e) => setForm({ ...form, lateReasonCode: e.target.value })}
                  options={LATE_REASON_OPTIONS}
                  placeholder="Select a reason"
                />
                <label className="block text-sm">
                  <span className="mb-1 block text-gray-600">Explanation {form.lateReasonCode === "OTHER" ? "(required)" : "(optional)"}</span>
                  <textarea rows={2} maxLength={2000} className="w-full rounded-md border border-gray-300 px-3 py-2"
                    value={form.lateReasonText} onChange={(e) => setForm({ ...form, lateReasonText: e.target.value })} />
                </label>
                {formError && <p className="text-sm text-red-600" role="alert">{formError}</p>}
                <Button variant="primary" size="small" type="submit" disabled={creating}>
                  Create draft claim
                </Button>
              </form>
            )}
          </>
        )}
        </div>
      </Modal>

      {/* Summary cards, calculated from the claims the API returned. */}
      <section aria-label="Claim summary" className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {summaryCards.map((card) => (
          <div key={card.label} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${DOT_CLASSES[card.tone]}`} aria-hidden="true" />
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">{card.label}</p>
            </div>
            <p className="mt-2 text-2xl font-bold text-[#0a174e]" data-testid={`summary-${card.label}`}>
              {loadingClaims ? "—" : card.value}
            </p>
            <p className="mt-0.5 text-xs text-gray-500">{card.hint}</p>
          </div>
        ))}
      </section>

      {/* Claims table with search, filter and sort. */}
      <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <h2 className="text-base font-semibold text-[#0a174e]">Claims</h2>
          {!loadingClaims && !claimsError && claims.length > 0 && (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <label className="relative block">
                <span className="sr-only">Search claims</span>
                <Search size={14} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Claim or report number"
                  className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-8 pr-3 text-sm sm:w-56"
                />
              </label>
              <select
                aria-label="Filter by status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
              >
                {STATUS_FILTER_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <select
                aria-label="Sort claims"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {loadingClaims ? (
          <div className="space-y-2" role="status" aria-label="Loading claims">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-gray-100" />
            ))}
          </div>
        ) : claimsError ? (
          <div role="alert" className="flex flex-col items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-8 text-center">
            <AlertTriangle size={22} className="text-rose-500" aria-hidden="true" />
            <p className="text-sm font-medium text-rose-700">{claimsError}</p>
            <Button variant="outline" size="small" onClick={loadClaims}>Try again</Button>
          </div>
        ) : claims.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-gray-200 px-4 py-10 text-center">
            <Inbox size={26} className="text-gray-400" aria-hidden="true" />
            <p className="text-sm font-medium text-gray-700">No supplementary claims yet</p>
            <p className="text-xs text-gray-500">When a settled report is missing an expense, raise a claim for it.</p>
            <Button variant="primary" size="small" onClick={raiseClaim}>Raise a claim</Button>
          </div>
        ) : (
          <>
            <p className="mb-2 text-xs text-gray-500">
              Showing {visibleClaims.length} of {claims.length} claim{claims.length === 1 ? "" : "s"}
            </p>
            {visibleClaims.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-gray-200 px-4 py-8 text-center">
                <p className="text-sm text-gray-600">No claims match your search or filter.</p>
                <Button variant="outline" size="small" onClick={clearFilters}>Clear filters</Button>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg shadow-sm">
                <table className="w-full min-w-[980px] table-auto border-collapse text-sm">
                  <thead className="bg-gradient-to-r from-blue-900 to-indigo-900 text-left text-xs text-white">
                    <tr>
                      <th className="px-3 py-3 font-semibold">Claim reference</th>
                      <th className="px-3 py-3 font-semibold">Original report</th>
                      <th className="px-3 py-3 font-semibold">Created</th>
                      <th className="px-3 py-3 text-center font-semibold">Expense items</th>
                      <th className="px-3 py-3 text-right font-semibold">Claim amount</th>
                      <th className="px-3 py-3 font-semibold">Status</th>
                      <th className="px-3 py-3 font-semibold">Payment</th>
                      <th className="px-3 py-3 text-right font-semibold"><span className="sr-only">Actions</span></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {visibleClaims.map((c) => (
                      <ClaimRow key={c.claimId} claim={c} onCancel={() => setCancelTarget(c)} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </section>

      <ConfirmationModal
        isOpen={!!cancelTarget}
        title="Cancel Claim"
        message={`Cancel claim ${cancelTarget?.claimNumber || ""}? It will be closed. Your original report is not changed.`}
        confirmText="Cancel Claim"
        cancelText="Keep Claim"
        onConfirm={confirmCancel}
        onCancel={() => setCancelTarget(null)}
        isLoading={cancelling}
        variant="danger"
      />
    </div>
  );
}

const DOT_CLASSES = {
  neutral: "bg-gray-400",
  info: "bg-indigo-500",
  warning: "bg-amber-500",
  success: "bg-emerald-500",
  danger: "bg-rose-500",
  muted: "bg-gray-300",
};

function StatusBadge({ tone, label }) {
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${TONE_CLASSES[tone]}`}>
      {label}
    </span>
  );
}

/** One claim. Every row action is always shown; the ones that are not allowed are disabled, with the reason as a tooltip. */
function ClaimRow({ claim: c, onCancel }) {
  const actions = listRowActionStates(c);
  const payment = paymentInfo(c);
  const itemCount = Array.isArray(c.items) ? c.items.length : 0;
  const path = detailPath(c.claimId);

  return (
    <tr className="transition hover:bg-gray-50/80">
      <td className="whitespace-nowrap px-3 py-3 font-mono text-xs font-semibold text-gray-900">{c.claimNumber}</td>
      <td className="whitespace-nowrap px-3 py-3 font-mono text-xs text-gray-700">{c.reportNumber || "—"}</td>
      <td className="whitespace-nowrap px-3 py-3 text-gray-700">{formatDate(c.createdAt)}</td>
      <td className="px-3 py-3 text-center text-gray-700">{itemCount}</td>
      <td className="whitespace-nowrap px-3 py-3 text-right font-semibold text-gray-900">{formatMoney(c.totalAmount, c.currencyCode)}</td>
      <td className="px-3 py-3">
        <StatusBadge tone={statusTone(c.status)} label={statusLabel(c.status)} />
      </td>
      <td className="px-3 py-3">
        <StatusBadge tone={payment.tone} label={payment.label} />
        {payment.reference && <p className="mt-1 font-mono text-[11px] text-gray-500">{payment.reference}</p>}
      </td>
      <td className="px-3 py-3">
        <div className="flex items-center justify-end gap-1">
          <RowAction to={path} label={`View ${c.claimNumber}`} title="View claim" tone="text-gray-600 hover:bg-gray-100 hover:text-blue-700">
            <Eye size={16} aria-hidden="true" />
          </RowAction>
          <RowAction
            to={actions.edit.allowed ? path : null}
            label={`Edit ${c.claimNumber}`}
            title={actions.edit.allowed ? "Edit expenses on this claim" : actions.edit.reason}
            tone="text-blue-600 hover:bg-blue-50 hover:text-blue-800"
          >
            <Pencil size={16} aria-hidden="true" />
          </RowAction>
          <RowAction
            onClick={actions.cancel.allowed ? onCancel : null}
            label={`Cancel ${c.claimNumber}`}
            title={actions.cancel.allowed ? "Cancel claim" : actions.cancel.reason}
            tone="text-rose-600 hover:bg-rose-50 hover:text-rose-800"
          >
            <XCircle size={16} aria-hidden="true" />
          </RowAction>
        </div>
      </td>
    </tr>
  );
}

/** A row action that is either a link or a button. When it is not allowed it renders disabled, and keeps its reason. */
function RowAction({ to, onClick, label, title, tone, children }) {
  const allowed = Boolean(to || onClick);
  const className = `flex h-8 w-8 items-center justify-center rounded-md transition ${allowed ? tone : "cursor-not-allowed text-gray-300"}`;
  if (to !== undefined && to !== null && allowed) {
    return (
      <Link to={to} aria-label={label} title={title} className={className}>
        {children}
      </Link>
    );
  }
  if (to === undefined && onClick === undefined) {
    return null;
  }
  return (
    <button
      type="button"
      onClick={allowed && onClick ? onClick : undefined}
      disabled={!allowed}
      aria-label={label}
      aria-disabled={!allowed}
      title={title}
      className={className}
    >
      {children}
    </button>
  );
}
