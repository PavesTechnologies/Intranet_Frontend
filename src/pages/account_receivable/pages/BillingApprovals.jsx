import { useEffect, useMemo, useState } from "react";
import { Eye, CheckCircle2, XCircle, ClipboardCheck, Clock, FolderKanban, Building2, Calendar, Receipt, Wallet, Info, AlertTriangle, FilterX } from "lucide-react";
import PageHeader from "../../../components/ui/PageHeader";
import { PageCard, PageCardContent } from "../../../components/Cards/PageCard";
import { KPICard } from "../../../components/kpi/KPI";
import Button from "../../../components/Button/Button";
import Modal from "../../../components/Modal/modal";
import ConfirmationModal from "../../../components/confirmation_modal/ConfirmationModal";
import FormTextArea from "../../../components/forms/FormTextArea";
import SearchInput from "../../../components/filter/Searchbar";
import FilterListbox from "../../../components/filter/FilterListbox";
import Pagination from "../../../components/Pagination/pagination";
import StatusBadge from "../../../components/status/statusbadge";
import { showStatusToast } from "../../../components/toastfy/toast";
import ARTable from "../components/common/ARTable";
import ActionMenu from "../components/common/ActionMenu";
import {
  approveBillingConfigurationRequest,
  formatApprovalStatusLabel,
  getApiErrorMessage,
  getBillingConfigurationForApproval,
  getPendingApprovalConfigurations,
  rejectBillingConfigurationRequest,
} from "../services/billingApprovalService";
import { fetchBillingConfigurations } from "../services/billingConfigService";
import { formatFrequencyLabel, ReviewHeader } from "../components/billing-setup/ReviewActivateStep";
import ConfigurationChanges, {
  ChangedFieldsContext,
  ChangedIndicator,
  getChangedFieldLabels,
  useIsFieldChanged,
} from "../components/billing-setup/ConfigurationChanges";
import { BILLING_MODE_LABELS } from "../data/wizardOptions";
import { getBillingTypeDisplayName } from "../utils/billingType";
import { formatCurrency, formatDisplayDate } from "../utils/format";
import { RECORD_LOCK_ACTION, RECORD_LOCK_RESOURCE } from "../services/recordLockService";
import useRecordLock from "../hooks/useRecordLock";
import { RecordLockOwnIndicator } from "../components/common/RecordLockNotice";

const PAGE_SIZE = 5;

const STATUS_TABS = {
  PENDING: "PENDING_APPROVAL",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  // Not a real backend approvalStatus — a client-side-only filter derived from
  // approvalStatus === APPROVED plus effectiveTo/project end date having
  // already passed (see isBillingSetupExpired below).
  EXPIRED: "EXPIRED",
  ALL: "ALL",
};

// Options for the shared FilterListbox — same {label, value} shape used by every
// other AR list page's status filter (see Overview.jsx's APPROVAL_STATUS_OPTIONS).
const STATUS_FILTER_OPTIONS = [
  { value: STATUS_TABS.PENDING, label: "Pending Approvals" },
  { value: STATUS_TABS.APPROVED, label: "Approved" },
  { value: STATUS_TABS.REJECTED, label: "Rejected" },
  { value: STATUS_TABS.ALL, label: "All Requests" },
];

const TABLE_HEADERS = [
  "Project",
  "Client",
  "Billing Type",
  "Billing Frequency",
  "Payment Terms",
  "Tax Region",
  "Effective Period",
  "Approval Status",
  "Action",
];

const TABLE_COLUMNS = [
  "project",
  "client",
  "billingType",
  "billingFrequency",
  "paymentTerms",
  "taxRegion",
  "effectivePeriod",
  "approvalStatus",
  "action",
];

function parseTimestamp(val) {
  if (!val) return null;
  if (Array.isArray(val)) {
    const [y, m, d, h = 0, min = 0, s = 0] = val;
    return new Date(y, m - 1, d, h, min, s);
  }
  if (typeof val === "string" && val.includes(",")) {
    const parts = val.split(",").map((p) => parseInt(p.trim(), 10)).filter((p) => !isNaN(p));
    if (parts.length >= 3) {
      const [y, m, d, h = 0, min = 0, s = 0] = parts;
      return new Date(y, m - 1, d, h, min, s);
    }
  }
  const d = new Date(val);
  if (!isNaN(d.getTime())) return d;
  return null;
}

function formatDate(value) {
  const date = parseTimestamp(value);
  if (!date) return typeof value === "string" && !value.includes(",") ? value : "—";
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

// An Approved billing setup is Expired once its applicable/project duration
// (config.effectiveTo — already the tighter of the billing effective end date
// and the project end date, see loadAllApprovals below) has ended. Compares
// calendar dates only (time-of-day stripped) so "today" always reflects the
// current date, not a stale snapshot from when the list was last loaded.
// Applies uniformly to every billing type since effectiveTo is already
// normalized the same way for Time & Material, Fixed Price, Milestone, and
// Recurring configurations.
function isBillingSetupExpired(config) {
  if (config.approvalStatus !== "APPROVED") return false;
  const endDate = parseTimestamp(config.effectiveTo);
  if (!endDate) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  endDate.setHours(0, 0, 0, 0);
  return endDate < today;
}

function formatDateTime(value) {
  const date = parseTimestamp(value);
  if (!date) return typeof value === "string" && !value.includes(",") ? value : "—";
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

// Review-model amounts are numbers or null (not populated) — null renders as
// "—" via InfoRow, never as a zero. Currency is shown once as its own field,
// so amounts use the shared AR formatter (₹1,45,000.00 for INR).
function formatAmount(value, currency) {
  return value === null || value === undefined ? null : formatCurrency(value, currency || "INR");
}

const PAYMENT_STRUCTURE_LABELS = { FULL_PAYMENT: "Full Payment", INSTALLMENTS: "Installments" };
const CONTRACT_VALUE_SOURCE_LABELS = { PMS: "PMS Project Budget", MANUAL: "Manual Input" };
const RATE_PERIOD_SUFFIX = { HOURLY: "/ hr", DAILY: "/ day", WEEKLY: "/ wk", MONTHLY: "/ month" };

function InfoRow({ label, value }) {
  const isChanged = useIsFieldChanged(label);
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-2.5 text-xs last:border-0">
      <span className="flex items-center gap-1.5 text-slate-500 font-medium">
        {label}
        {isChanged && <ChangedIndicator />}
      </span>
      <span className="text-right font-bold text-slate-900">{value || "—"}</span>
    </div>
  );
}

function ReviewSection({ title, rows }) {
  return (
    <PageCard className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
      <PageCardContent className="p-0">
        <div className="border-b border-slate-100 bg-slate-50/60 px-5 py-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">{title}</h3>
        </div>
        <div className="px-5">
          {rows.map((row, index) => (
            <InfoRow key={`${row.label}-${index}`} label={row.label} value={row.value} />
          ))}
        </div>
      </PageCardContent>
    </PageCard>
  );
}

function ReviewTable({ title, headers, rows, emptyMessage }) {
  return (
    <PageCard className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
      <PageCardContent className="p-0">
        <div className="border-b border-slate-100 bg-slate-50/60 px-5 py-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">{title}</h3>
        </div>
        {rows.length > 0 ? (
          <div className="overflow-x-auto p-2">
            <table className="w-full text-left text-xs">
              <thead>
                <tr>
                  {headers.map((header) => (
                    <th key={header} className={`px-3 py-2 font-semibold text-slate-500 ${/status|action/i.test(String(header)) ? "text-center" : "text-left"}`}>{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => (
                  <tr key={row.key}>
                    {row.cells.map((cell, index) => (
                      <td key={index} className={`px-3 py-2 ${/status|action/i.test(String(headers[index])) ? "text-center" : "text-left"} ${index === 0 ? "font-medium text-slate-700" : "text-slate-900"}`}>
                        {cell ?? "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="px-5 py-4 text-xs text-slate-500">{emptyMessage}</p>
        )}
      </PageCardContent>
    </PageCard>
  );
}

// Read-only Review modal body. Renders ONLY config.review (built by
// buildApprovalReviewModel in billingApprovalService.js) — every value has a
// single definition there and is shown in exactly one section here.
function ApprovalReviewDetails({ config }) {
  const review = config.review || {};
  const { billingType, currency, projectBudget, totalValue, pricingDetails = {}, schedule = { items: [] } } = review;
  const money = (value) => formatAmount(value, currency);
  const changedFieldLabels = useMemo(() => getChangedFieldLabels(config.changes), [config.changes]);

  const billingFrequencyLabel = formatFrequencyLabel(
    null,
    review.billingFrequencyName,
    review.billingFrequencyId,
    billingType === "FIXED_PRICE"
  );

  const contractValueRows = totalValue
    ? [
      ...(totalValue.source
        ? [{ label: "Contract Value Source", value: CONTRACT_VALUE_SOURCE_LABELS[totalValue.source] || totalValue.source }]
        : []),
      { label: "Contract Value", value: money(totalValue.amount) },
    ]
    : [{ label: "Contract Value", value: null }];

  return (
    <ChangedFieldsContext.Provider value={changedFieldLabels}>
      <div className="space-y-4">
        {/* 1. Project / Configuration — the same primary summary as the wizard's
            View/Review (shared ReviewHeader, same resolved project). Currency,
            Project Budget and the current statuses live here only. */}
        <ReviewHeader
          projectInfo={review.project || {}}
          isProductService={review.project?.billingContext === "PRODUCT_SERVICE"}
          approvalStatus={config.approvalStatus}
          billingStatus={config.billingStatus}
          summary={[
            { label: "Billing Type", value: getBillingTypeDisplayName(review.billingTypeName), strong: true },
            { label: "Billing Frequency", value: billingFrequencyLabel },
            { label: "Currency", value: currency },
            { label: "Project Budget", value: money(projectBudget), emphasize: true },
          ]}
        />

        {/* Changes Pending Approval — the backend's previous approved -> new
            proposed values, shown before the details and the Approve/Reject
            actions. */}
        <ConfigurationChanges changes={config.changes} currency={currency} />

        {/* 2. Billing-type-specific details */}
        {billingType === "FIXED_PRICE" && (
          <PageCard className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm p-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-2">
              Fixed Price Financial Summary
            </h3>

            <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-3 text-xs">
              <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Financial Calculation Formula
              </span>
              <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold text-slate-800">
                <span className="rounded-md border border-slate-200 bg-white px-2 py-0.5 shadow-2xs">Billable Amount</span>
                <span className="text-slate-400">−</span>
                <span className="rounded-md border border-slate-200 bg-white px-2 py-0.5 shadow-2xs">Retention Amount</span>
                <span className="text-slate-400">−</span>
                <span className="rounded-md border border-slate-200 bg-white px-2 py-0.5 shadow-2xs">Advance Received</span>
                <span className="font-extrabold text-indigo-600">=</span>
                <span className="rounded-md bg-[#0A0082] px-2 py-0.5 font-extrabold text-white shadow-2xs">
                  Remaining Receivable
                </span>
              </div>
            </div>

            {totalValue?.differsFromProjectBudget && (
              <div className="flex items-center gap-2 rounded-lg border border-amber-200/80 bg-amber-50/70 px-3.5 py-2 text-xs font-medium text-amber-900">
                <Info className="h-4 w-4 shrink-0 text-amber-600" />
                <span>Contract Value differs from the Project Budget and is used for billing calculation.</span>
              </div>
            )}

            <div className="divide-y divide-slate-100 text-xs">
              {[
                ...contractValueRows,
                {
                  label: "Retention %",
                  value: pricingDetails.retentionPercent !== null ? `${pricingDetails.retentionPercent}%` : null,
                },
                {
                  label: "Retention Amount",
                  value: pricingDetails.retentionAmount ? `-${money(pricingDetails.retentionAmount)}` : money(pricingDetails.retentionAmount),
                },
                { label: "Billable Amount", value: money(pricingDetails.billableAmount) },
                {
                  label: "Advance Received",
                  value: pricingDetails.advanceReceived ? `-${money(pricingDetails.advanceReceived)}` : money(pricingDetails.advanceReceived),
                },
              ].map((row) => (
                <div key={row.label} className="flex justify-between py-2">
                  <span className="text-slate-500 font-medium">{row.label}</span>
                  <span className="font-bold text-slate-900">{row.value || "—"}</span>
                </div>
              ))}
              <div className="flex justify-between py-2 bg-emerald-50/40 px-2 rounded">
                <span className="text-emerald-800 font-bold">Remaining Receivable</span>
                <span className="font-extrabold text-emerald-900">{money(pricingDetails.remainingReceivable) || "—"}</span>
              </div>
            </div>
          </PageCard>
        )}

        {billingType === "TIME_MATERIAL" && (
          <>
            <ReviewSection
              title="Time & Material Pricing"
              rows={[
                {
                  label: "Pricing Model",
                  value: BILLING_MODE_LABELS[pricingDetails.pricingModel] || pricingDetails.pricingModel || "Standard",
                },
              ]}
            />
            <ReviewTable
              title="Rate Card"
              headers={["Role", "Rate"]}
              rows={(pricingDetails.rateCards || []).map((card) => ({
                key: card.key,
                cells: [
                  card.role,
                  card.rate !== null ? `${money(card.rate)} ${RATE_PERIOD_SUFFIX[card.ratePeriod] || ""}`.trim() : null,
                ],
              }))}
              emptyMessage="No rate cards have been configured."
            />
          </>
        )}

        {billingType === "RECURRING" && (() => {
          const isProductServiceContext = pricingDetails.billingContext === "PRODUCT_SERVICE";
          const renewal = pricingDetails.renewal;
          return (
            <>
              <ReviewSection
                title="Recurring Pricing Details"
                rows={[
                  { label: "Billing Context", value: isProductServiceContext ? "Product / Service" : "Project" },
                  ...(isProductServiceContext
                    ? [
                      { label: "Product / Application / Service", value: pricingDetails.productName },
                      { label: "Description", value: pricingDetails.productDescription },
                    ]
                    : []),
                  ...contractValueRows,
                ]}
              />
              {/* Renewal is a Subscription (Product/Service) concept only —
                  a project-based Recurring configuration is never renewed. */}
              {isProductServiceContext && (
                <ReviewSection
                  title="Renewal Configuration"
                  rows={
                    renewal
                      ? [
                        { label: "Renewal Mode", value: renewal.mode },
                        ...(renewal.mode === "Custom"
                          ? [
                            { label: "Renewal Amount", value: money(renewal.amount) },
                            { label: "Renewal Effective From", value: formatDisplayDate(renewal.effectiveFrom) },
                          ]
                          : []),
                      ]
                      : [{ label: "Renewal Mode", value: "Not configured" }]
                  }
                />
              )}
            </>
          );
        })()}

        {billingType === "MILESTONE_PLAN" && (
          <>
            <ReviewSection
              title="Milestone Plan Details"
              rows={[
                {
                  label: "Payment Structure",
                  value: PAYMENT_STRUCTURE_LABELS[review.paymentStructure] || formatApprovalStatusLabel(review.paymentStructure),
                },
                { label: "Total Value", value: money(totalValue?.amount) },
              ]}
            />
            <ReviewTable
              title="Payment"
              headers={["Payment", "Percentage", "Amount", "Billing Date"]}
              rows={review.payments.map((payment) => ({
                key: payment.key,
                cells: [
                  payment.label,
                  payment.percentage !== null ? `${payment.percentage}%` : null,
                  money(payment.amount),
                  formatDisplayDate(payment.billingDate),
                ],
              }))}
              emptyMessage="No payments have been configured for this Milestone Plan."
            />
          </>
        )}

        {/* 3. Billing Schedule — only the schedule facts relevant to this billing type */}
        <PageCard className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
          <PageCardContent className="p-0">
            <div className="border-b border-slate-100 bg-slate-50/60 px-5 py-3 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-[#0A0082]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">Billing Schedule</h3>
            </div>
            <div className="p-4">
              {schedule.items.length > 0 ? (
                <div className="space-y-1">
                  {schedule.items.map((item) => (
                    <InfoRow
                      key={item.label}
                      label={item.label}
                      value={item.isDate ? (item.value ? formatDisplayDate(item.value) : item.emptyText) : item.value}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-4 text-center">
                  <Calendar className="h-7 w-7 text-slate-300 mb-1" />
                  <p className="text-xs font-semibold text-slate-600">{schedule.emptyMessage || "Billing schedule not available"}</p>
                </div>
              )}
            </div>
          </PageCardContent>
        </PageCard>

        {/* 4. Invoice & Tax Controls */}
        <ReviewSection
          title="Invoice & Tax Controls"
          rows={[
            { label: "Payment Terms", value: config.paymentTermName || config.paymentTerms },
            { label: "Tax Region", value: config.taxRegionName || config.taxRegion },
            { label: "Invoice Generation Mode", value: config.invoiceGenerationType || (config.autoInvoiceGeneration ? "Automatic" : "Manual") },
            ...(config.autoInvoiceGeneration && config.invoiceGenerationDay
              ? [{ label: "Generation Day", value: `Day ${config.invoiceGenerationDay}` }]
              : []),
            { label: "Expense Billing Eligibility", value: config.expenseBillingEligible ? "Eligible" : "Not Eligible" },
          ]}
        />

        {/* 5. Submission & Workflow Information */}
        <ReviewSection
          title="Submission & Workflow Information"
          rows={[
            // Current statuses are in the primary summary; the statuses the
            // configuration had before this submission come from the backend
            // snapshot (re-approval only).
            ...(config.previousApprovalStatus
              ? [{ label: "Previous Approval Status", value: <StatusBadge label={formatApprovalStatusLabel(config.previousApprovalStatus)} size="sm" /> }]
              : []),
            ...(config.previousBillingStatus
              ? [{ label: "Previous Billing Status", value: <StatusBadge label={formatApprovalStatusLabel(config.previousBillingStatus)} size="sm" /> }]
              : []),
            { label: "Submitted By", value: config.submittedBy },
            { label: "Submitted Date", value: formatDateTime(config.createdAt) },
            { label: "Last Updated", value: formatDateTime(config.updatedAt) },
            ...(config.rejectionReason ? [{ label: "Rejection Reason", value: config.rejectionReason }] : []),
          ]}
        />
      </div>
    </ChangedFieldsContext.Provider>
  );
}

// Finance Manager (Checker) queue for the Maker-Checker billing configuration workflow.
export default function BillingApprovals() {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusTab, setStatusTab] = useState(STATUS_TABS.PENDING);
  const [currentPage, setCurrentPage] = useState(1);

  const [reviewingId, setReviewingId] = useState(null);
  const [reviewTarget, setReviewTarget] = useState(null);

  const [approveLoading, setApproveLoading] = useState(false);

  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejectLoading, setRejectLoading] = useState(false);

  // Opening Review only READS the lock status (GET) — it never takes a lock,
  // so viewing stays available to everyone. Lock status is checked automatically on
  // open and polled every 12s via useRecordLock. When Approve/Reject is clicked,
  // the APPROVAL lock is acquired automatically via ensureReviewLock.
  const recordLock = useRecordLock(RECORD_LOCK_RESOURCE.BILLING_CONFIGURATION, {
    watchResourceId: reviewTarget?.approvalStatus === "PENDING_APPROVAL" ? (reviewTarget.billingConfigurationId || reviewTarget.id) : null,
  });
  const reviewLockId = rejectTarget?.billingConfigurationId || rejectTarget?.id || reviewTarget?.billingConfigurationId || reviewTarget?.id;
  const isBlockedByOtherLock = Boolean(
    (recordLock.conflict && !recordLock.conflict.isCurrentUser) ||
    recordLock.isLockedByOther(reviewLockId)
  );
  const ownReviewLockAction = recordLock.ownLockAction(reviewLockId);

  // POST is authoritative: Approve/Reject re-run it (a no-op while held) so a
  // stale enabled button can never bypass the backend lock check.
  const ensureReviewLock = async () => {
    if (!reviewLockId) return false;
    const result = await recordLock.acquire(reviewLockId, RECORD_LOCK_ACTION.APPROVAL);
    return result.acquired;
  };

  const handleMutationError = (error, fallback) => {
    showStatusToast(getApiErrorMessage(error, fallback), "error");
    if (error?.response?.status === 409 && reviewLockId) recordLock.handleMutationConflict(reviewLockId);
  };

  const loadAllApprovals = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const [pendingResult, allConfigs] = await Promise.allSettled([
        getPendingApprovalConfigurations(),
        fetchBillingConfigurations(),
      ]);

      const pendingList = pendingResult.status === "fulfilled" ? pendingResult.value : [];
      const allList = allConfigs.status === "fulfilled" ? allConfigs.value : [];

      const combinedMap = new Map();
      allList.forEach((item) => {
        const id = item.id || item.billingConfigurationId;
        if (!id) return;
        combinedMap.set(id, {
          billingConfigurationId: id,
          billingContext: item.billingContext || "PROJECT",
          projectName: item.projectName || item.productName || "—",
          projectCode: item.projectCode || (item.billingContext === "PRODUCT_SERVICE" ? "Product/Service" : "—"),
          clientName: item.client || item.clientName || "—",
          billingTypeName: item.billingType || item.billingTypeName || "—",
          billingFrequencyName: item.billingFrequency || item.billingFrequencyName || "—",
          paymentTermName: item.paymentTerms || item.paymentTermName || "—",
          taxRegionName: item.taxRegion || item.taxRegionName || "—",
          effectiveFrom: item.startDate || item.effectiveFrom || "",
          effectiveTo: item.endDate || item.effectiveTo || "",
          submittedBy: item.submittedBy || item.createdBy || "—",
          approvalStatus: item.approvalStatus || "DRAFT",
          billingStatus: item.billingStatus || "INACTIVE",
          createdAt: item.createdAt || "",
          updatedAt: item.updatedAt || "",
        });
      });

      pendingList.forEach((item) => {
        if (item.billingConfigurationId) {
          combinedMap.set(item.billingConfigurationId, item);
        }
      });

      setConfigs(Array.from(combinedMap.values()));
    } catch (error) {
      if (!silent) {
        showStatusToast(getApiErrorMessage(error, "Failed to load billing configuration approvals."), "error");
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadAllApprovals();
  }, []);

  // Background polling for approval requests list (every 12 seconds while active)
  useEffect(() => {
    const refreshList = () => {
      if (document.visibilityState !== "hidden") {
        loadAllApprovals({ silent: true });
      }
    };

    const interval = setInterval(refreshList, 12_000);
    window.addEventListener("focus", refreshList);
    document.addEventListener("visibilitychange", refreshList);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", refreshList);
      document.removeEventListener("visibilitychange", refreshList);
    };
  }, []);

  // Background polling for active review target details (every 12 seconds while modal is open)
  useEffect(() => {
    if (!reviewTarget?.billingConfigurationId) return undefined;
    const targetId = reviewTarget.billingConfigurationId;

    const refreshReviewDetail = async () => {
      if (document.visibilityState === "hidden" || approveLoading || rejectLoading) return;
      try {
        const latestDetail = await getBillingConfigurationForApproval(targetId);
        if (latestDetail) {
          setReviewTarget((prev) => (prev?.billingConfigurationId === targetId ? latestDetail : prev));
        }
      } catch (error) {
        // Silent polling: errors / conflicts caught by lock hook
      }
    };

    const interval = setInterval(refreshReviewDetail, 12_000);
    return () => clearInterval(interval);
  }, [reviewTarget?.billingConfigurationId, approveLoading, rejectLoading]);

  const tabCounts = useMemo(() => {
    return {
      PENDING: configs.filter((c) => c.approvalStatus === "PENDING_APPROVAL").length,
      APPROVED: configs.filter((c) => c.approvalStatus === "APPROVED").length,
      REJECTED: configs.filter((c) => c.approvalStatus === "REJECTED").length,
      EXPIRED: configs.filter(isBillingSetupExpired).length,
      ALL: configs.length,
    };
  }, [configs]);

  const kpiCards = [
    { key: STATUS_TABS.ALL, label: "Total Requests", value: tabCounts.ALL, icon: FolderKanban, color: "bg-[#0A0082] text-white" },
    { key: STATUS_TABS.PENDING, label: "Pending Approvals", value: tabCounts.PENDING, icon: Clock, color: "bg-amber-500 text-white" },
    { key: STATUS_TABS.APPROVED, label: "Approved", value: tabCounts.APPROVED, icon: CheckCircle2, color: "bg-emerald-600 text-white" },
    { key: STATUS_TABS.REJECTED, label: "Rejected", value: tabCounts.REJECTED, icon: XCircle, color: "bg-rose-600 text-white" },
  ];

  const handleKpiClick = (kpiKey) => {
    if (kpiKey === STATUS_TABS.ALL) {
      setStatusTab(STATUS_TABS.ALL);
    } else {
      setStatusTab((prev) => (prev === kpiKey ? STATUS_TABS.ALL : kpiKey));
    }
    setCurrentPage(1);
  };

  const handleTabChange = (key) => {
    setStatusTab(key);
    setCurrentPage(1);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [statusTab, searchQuery]);

  const filteredConfigs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return configs.filter((c) => {
      let matchesTab = true;
      if (statusTab === STATUS_TABS.EXPIRED) {
        matchesTab = isBillingSetupExpired(c);
      } else if (statusTab !== STATUS_TABS.ALL) {
        matchesTab = c.approvalStatus === statusTab;
      }
      const matchesSearch =
        !q ||
        (c.projectName || "").toLowerCase().includes(q) ||
        (c.projectCode || "").toLowerCase().includes(q) ||
        (c.clientName || "").toLowerCase().includes(q) ||
        (c.submittedBy || "").toLowerCase().includes(q);

      return matchesTab && matchesSearch;
    });
  }, [configs, statusTab, searchQuery]);

  const totalPages = Math.ceil(filteredConfigs.length / PAGE_SIZE) || 1;
  const paginatedConfigs = useMemo(
    () => filteredConfigs.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filteredConfigs, currentPage]
  );

  const handleSearchInputChange = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const handleReview = async (config) => {
    setReviewingId(config.billingConfigurationId);
    try {
      const detail = await getBillingConfigurationForApproval(config.billingConfigurationId);
      setReviewTarget(detail);
    } catch (error) {
      showStatusToast(getApiErrorMessage(error, "Failed to load billing configuration details."), "error");
    } finally {
      setReviewingId(null);
    }
  };

  const closeReview = () => {
    if (approveLoading) return;
    setReviewTarget(null);
    recordLock.release();
  };

  const openRejectModal = async () => {
    if (!(await ensureReviewLock())) return;
    setRejectTarget(reviewTarget);
    setRejectionReason("");
    setReviewTarget(null);
  };

  const closeRejectModal = () => {
    if (rejectLoading) return;
    setRejectTarget(null);
    setRejectionReason("");
    recordLock.release();
  };

  // Approving is a single click from the review screen — no extra "are you
  // sure" step, since the review screen itself is already the confirmation.
  // After Approve/Reject, re-read the configuration from the backend and keep
  // the review open on the RESULTING state — e.g. APPROVED + ACTIVE, or the
  // previously approved version the backend restored after a rejected change.
  // Nothing is derived here: whatever the backend now returns is shown.
  const showRefreshedReview = async (billingConfigurationId) => {
    try {
      const refreshed = await getBillingConfigurationForApproval(billingConfigurationId);
      setReviewTarget(refreshed);
      return refreshed;
    } catch {
      setReviewTarget(null);
      return null;
    }
  };

  const handleApprove = async () => {
    if (!reviewTarget) return;
    setApproveLoading(true);
    if (!(await ensureReviewLock())) {
      setApproveLoading(false);
      return;
    }
    try {
      const { billingConfigurationId } = reviewTarget;
      const hadChanges = (reviewTarget.changes || []).length > 0;
      await approveBillingConfigurationRequest(billingConfigurationId);
      recordLock.release();
      showStatusToast(hadChanges ? "Changes approved successfully." : "Billing Configuration approved successfully.", "success");
      await Promise.all([loadAllApprovals(), showRefreshedReview(billingConfigurationId)]);
    } catch (error) {
      handleMutationError(error, "Failed to approve billing configuration.");
    } finally {
      setApproveLoading(false);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectTarget) return;
    if (!rejectionReason.trim()) {
      showStatusToast("Please enter a reason for rejection.", "warning");
      return;
    }

    setRejectLoading(true);
    try {
      if (!(await ensureReviewLock())) return;
      const { billingConfigurationId } = rejectTarget;
      const hadChanges = (rejectTarget.changes || []).length > 0;
      await rejectBillingConfigurationRequest(billingConfigurationId, rejectionReason.trim());
      recordLock.release();
      setRejectTarget(null);
      setRejectionReason("");
      const [, refreshed] = await Promise.all([loadAllApprovals(), showRefreshedReview(billingConfigurationId)]);
      // For a rejected re-approval the backend restores the previously
      // approved version — confirm that only when the refreshed record shows it.
      showStatusToast(
        hadChanges && refreshed?.approvalStatus === "APPROVED"
          ? "Changes rejected. The previously approved configuration has been restored."
          : "Billing Configuration rejected successfully.",
        "success"
      );
    } catch (error) {
      handleMutationError(error, "Failed to reject billing configuration.");
    } finally {
      setRejectLoading(false);
    }
  };

  const tableRows = useMemo(
    () =>
      paginatedConfigs.map((config) => ({
        project: (
          <div className="text-left">
            <div className="font-semibold text-slate-900">{config.projectName || "—"}</div>
            <div className="text-xs text-slate-400">{config.projectCode || "—"}</div>
          </div>
        ),
        client: config.clientName || "—",
        billingType: getBillingTypeDisplayName(config.billingTypeName) || "—",
        billingFrequency: config.billingFrequencyName || "—",
        paymentTerms: config.paymentTermName || "—",
        taxRegion: config.taxRegionName || "—",
        effectivePeriod: `${formatDate(config.effectiveFrom)} – ${formatDate(config.effectiveTo) || "Ongoing"}`,
        approvalStatus: <StatusBadge label={formatApprovalStatusLabel(config.approvalStatus)} size="sm" />,
        action: (
          <ActionMenu
            items={[
              {
                label: reviewingId === config.billingConfigurationId ? "Loading..." : "Review",
                icon: <Eye className="h-4 w-4" />,
                disabled: reviewingId === config.billingConfigurationId,
                onClick: () => handleReview(config),
              },
            ]}
          />
        ),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [paginatedConfigs, reviewingId]
  );

  return (
    <div className="space-y-4">
      {/* 1. Page Header */}
      <PageHeader
        title="Billing Configuration Approvals"
        subtitle="Review, approve, or reject billing configuration setups submitted by Finance Executives."
      />

      {/* 2. Summary KPI Cards (Total, Pending, Approved, Rejected) */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {kpiCards.map((kpi) => {
          const isActive =
            statusTab === kpi.key ||
            (statusTab === STATUS_TABS.ALL && kpi.key === STATUS_TABS.ALL);

          return (
            <button
              key={kpi.key}
              type="button"
              onClick={() => handleKpiClick(kpi.key)}
              title={`Filter by ${kpi.label}`}
              className="
          text-left
          rounded-xl
          border-0
          outline-none
          focus:outline-none
          focus-visible:outline-none
          focus:ring-0
          focus-visible:ring-0
          active:ring-0
          active:outline-none
          appearance-none
        "
              style={{
                outline: "none",
                boxShadow: "none",
              }}
            >
              <KPICard
                label={kpi.label}
                value={loading ? "…" : kpi.value}
                icon={<kpi.icon className="h-5 w-5" />}
                color={kpi.color}
                active={isActive}
                className="
            h-full
            w-full
            cursor-pointer
            bg-white
            shadow-sm
            border
            border-slate-200
            transition-all
            hover:shadow-md
            !outline-none
            !ring-0
            !ring-offset-0
            focus:!outline-none
            focus:!ring-0
            focus:!ring-offset-0
            focus-visible:!outline-none
            focus-visible:!ring-0
            focus-visible:!ring-offset-0
            active:!ring-0
            active:!outline-none
          "
                style={{
                  outline: "none",
                  boxShadow: "none",
                }}
              />
            </button>
          );
        })}
      </div>

      {/* 3. Main Data Card */}
      <PageCard>
        <PageCardContent className="p-4 sm:p-5 space-y-4">
          {/* Filter row — shared SearchInput + shared FilterListbox, matching the
              pattern used on Overview.jsx and other AR list pages. Status counts
              remain visible via the KPI cards above, so they aren't duplicated here. */}
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="w-full lg:max-w-md">
              <SearchInput
                value={searchQuery}
                onChange={handleSearchInputChange}
                onSearch={(val) => setSearchQuery(val)}
                placeholder="Search by project, code, or client..."
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="w-48 sm:w-52">
                <FilterListbox
                  options={STATUS_FILTER_OPTIONS}
                  value={statusTab}
                  onChange={handleTabChange}
                  placeholder="Filter by Status"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <ARTable
              headers={TABLE_HEADERS}
              columns={TABLE_COLUMNS}
              rows={tableRows}
              loading={loading}
              emptyMessage="No billing configuration requests found for this filter."
            />
            {!loading && filteredConfigs.length > 0 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPrevious={() => setCurrentPage((page) => Math.max(page - 1, 1))}
                onNext={() => setCurrentPage((page) => Math.min(page + 1, totalPages))}
              />
            )}
          </div>
        </PageCardContent>
      </PageCard>

      {/* 4. Detailed Executive Review Modal — Contract Value & PMS Budget displayed separately */}
      <Modal
        isOpen={Boolean(reviewTarget)}
        onClose={closeReview}
        title="Review Billing Configuration Request"
        titleIcon={<ClipboardCheck className="h-5 w-5 text-[#0A0082]" />}
        size="3xl"
        footer={
          reviewTarget && (
            <div className="flex justify-end gap-2">
              {reviewTarget.approvalStatus === "PENDING_APPROVAL" ? (
                <>
                  <Button
                    variant="danger"
                    size="small"
                    onClick={openRejectModal}
                    disabled={approveLoading || isBlockedByOtherLock}
                    title={isBlockedByOtherLock ? "This configuration is currently being edited by another user." : ""}
                  >
                    <XCircle className="h-4 w-4" /> Reject Configuration
                  </Button>
                  <Button
                    variant="success"
                    size="small"
                    onClick={handleApprove}
                    loading={approveLoading}
                    loadingText="Approving..."
                    disabled={approveLoading || isBlockedByOtherLock}
                    title={isBlockedByOtherLock ? "This configuration is currently being edited by another user." : ""}
                  >
                    <CheckCircle2 className="h-4 w-4" /> Approve Configuration
                  </Button>
                </>
              ) : (
                <Button variant="outline" size="small" onClick={closeReview}>
                  Close
                </Button>
              )}
            </div>
          )
        }
      >
        {reviewTarget?.approvalStatus === "PENDING_APPROVAL" && ownReviewLockAction && (
          <RecordLockOwnIndicator actionType={ownReviewLockAction} className="mb-4" />
        )}
        {reviewTarget && <ApprovalReviewDetails config={reviewTarget} />}
      </Modal>

      {/* 5. Reject Confirmation — shared ConfirmationModal, reason kept as a required field */}
      <ConfirmationModal
        isOpen={Boolean(rejectTarget)}
        title="Reject Billing Configuration"
        message={`Please provide a reason for rejecting the billing setup for ${rejectTarget?.projectName || "this project"
          } (${rejectTarget?.clientName || "—"}).`}
        confirmText="Reject Configuration"
        cancelText="Cancel"
        variant="danger"
        isLoading={rejectLoading}
        onConfirm={handleConfirmReject}
        onCancel={closeRejectModal}
      >
        <FormTextArea
          label="Rejection Reason *"
          name="rejectionReason"
          value={rejectionReason}
          onChange={(event) => setRejectionReason(event.target.value)}
          placeholder="Specify why this configuration is being rejected..."
          rows={4}
          required
          disabled={rejectLoading}
        />
      </ConfirmationModal>
    </div>
  );
}