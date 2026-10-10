import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Clock,
  CheckCircle2,
  XCircle,
  DollarSign,
  Eye,
  FileText,
  FileCheck,
} from "lucide-react";

import PageHeader from "../../../components/ui/PageHeader";
import { PageCard, PageCardContent } from "../../../components/Cards/PageCard";
import Button from "../../../components/Button/Button";
import Loader from "../../../components/ui/Loader";
import SearchInput from "../../../components/filter/Searchbar";
import ARClearFiltersButton from "../components/common/ARClearFiltersButton";
import Pagination from "../../../components/Pagination/pagination";
import StatusBadge from "../../../components/status/statusbadge";
import ConfirmationModal from "../../../components/confirmation_modal/ConfirmationModal";
import { showStatusToast } from "../../../components/toastfy/toast";
import ARTable from "../components/common/ARTable";
import ARKPICard from "../components/common/ARKPICard";
import ARKPIStatusTabs from "../components/common/ARKPIStatusTabs";
import ActionMenu from "../components/common/ActionMenu";
import { formatCurrency, formatDisplayDate, formatDisplayDateTime } from "../utils/format";
import {
  getInvoiceApprovalWorkspace,
  getInvoiceErrorMessage,
  approveInvoice,
  rejectInvoice,
} from "../services/invoiceService";
import { RECORD_LOCK_ACTION, RECORD_LOCK_RESOURCE } from "../services/recordLockService";
import useRecordLock from "../hooks/useRecordLock";

/* ------------------------------------------------------------------ */
/* Global constants                                                    */
/* ------------------------------------------------------------------ */

// Same page size as the other AR list pages (e.g. BillingApprovals)
const PAGE_SIZE = 5;

const STATUS_TABS = {
  ALL: "ALL",
  PENDING: "PENDING_APPROVAL",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
};

const TABLE_HEADERS = [
  "Invoice Number",
  "Client",
  "Project",
  "Billing Period",
  "Invoice Date",
  "Due Date",
  "Grand Total",
  "Status",
  "Submitted At",
  "Last Action",
  "Actions",
];

const TABLE_COLUMNS = [
  "invoiceNumber",
  "client",
  "project",
  "billingPeriod",
  "invoiceDate",
  "dueDate",
  "grandTotal",
  "status",
  "submittedAt",
  "lastAction",
  "actions",
];

const TABLE_ALIGNMENTS = {
  invoiceNumber: "left",
  client: "left",
  project: "left",
  billingPeriod: "left",
  invoiceDate: "left",
  dueDate: "center",
  grandTotal: "left",
  status: "center",
  submittedAt: "left",
  lastAction: "left",
  actions: "center",
};

const TABLE_HEADER_ALIGNMENTS = {
  client: "center",
  project: "center",
  billingPeriod: "center",
  invoiceDate: "center",
  dueDate: "center",
  grandTotal: "center",
  status: "center",
  submittedAt: "center",
  lastAction: "center",
  actions: "center",
}


const getInvoiceStatus = (inv) => (inv.status || inv.invoiceStatus || "").toUpperCase();
const getInvoiceRecordId = (inv) => inv?.invoiceId || inv?.billingSnapshotId || inv?.snapshotId;

export default function InvoiceApproval() {
  const navigate = useNavigate();

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Filters + pagination
  const [searchQuery, setSearchQuery] = useState("");
  const [statusTab, setStatusTab] = useState(STATUS_TABS.ALL);
  const [currentPage, setCurrentPage] = useState(1);

  // Confirmation modal states
  const [approveTarget, setApproveTarget] = useState(null);
  const [approveLoading, setApproveLoading] = useState(false);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectLoading, setRejectLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  // Approve / Reject from the list first take the backend APPROVAL lock; the
  // confirmation modal only opens once it is ours. A 409 leaves the modal
  // closed (the hook shows the backend's owner message). The lock is released
  // on cancel, on success and on unmount.
  const recordLock = useRecordLock(RECORD_LOCK_RESOURCE.INVOICE);
  const [lockingInvoiceId, setLockingInvoiceId] = useState(null);

  const startDecision = async (inv, openModal) => {
    const invId = getInvoiceRecordId(inv);
    if (!invId || lockingInvoiceId) return;
    setLockingInvoiceId(invId);
    try {
      const result = await recordLock.acquire(invId, RECORD_LOCK_ACTION.APPROVAL);
      if (result.acquired) openModal();
    } finally {
      setLockingInvoiceId(null);
    }
  };

  const closeApproveModal = () => {
    if (approveLoading) return;
    setApproveTarget(null);
    recordLock.release();
  };

  const closeRejectModal = () => {
    if (rejectLoading) return;
    setRejectTarget(null);
    setRejectReason("");
    recordLock.release();
  };

  const handleConfirmApprove = async () => {
    if (!approveTarget) return;
    const invId = getInvoiceRecordId(approveTarget);
    setApproveLoading(true);
    try {
      await approveInvoice(invId);
      recordLock.release();
      showStatusToast("Invoice approved successfully.", "success");
      setApproveTarget(null);
      await loadData();
    } catch (err) {
      const msg = getInvoiceErrorMessage(err, "Failed to approve invoice.");
      showStatusToast(msg, "error");
    } finally {
      setApproveLoading(false);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectTarget) return;
    const invId = getInvoiceRecordId(rejectTarget);
    if (!rejectReason.trim()) {
      showStatusToast("Please provide a reason for rejection.", "error");
      return;
    }
    setRejectLoading(true);
    try {
      await rejectInvoice(invId, rejectReason.trim());
      recordLock.release();
      showStatusToast("Invoice rejected.", "success");
      setRejectTarget(null);
      setRejectReason("");
      await loadData();
    } catch (err) {
      const msg = getInvoiceErrorMessage(err, "Failed to reject invoice.");
      showStatusToast(msg, "error");
    } finally {
      setRejectLoading(false);
    }
  };

  const loadData = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    setLoading(true);
    setError(null);

    try {
      // Primary data source: dedicated backend workspace API
      const workspaceRecords = await getInvoiceApprovalWorkspace();
      setInvoices(workspaceRecords || []);

      if (isManualRefresh) {
        showStatusToast("Invoice approval dashboard refreshed.", "success");
      }
    } catch (err) {
      console.error("[InvoiceApproval] Error loading workspace invoices:", err);
      const message = getInvoiceErrorMessage(err, "Failed to load invoice approval dashboard.");
      setError(message);
      showStatusToast(message, "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Persistent KPIs calculated directly from workspace records
  const kpis = useMemo(() => {
    const count = (status) => invoices.filter((inv) => getInvoiceStatus(inv) === status).length;

    // Total Approval Value is strictly the sum of persisted grandTotal values
    const totalApprovalValue = invoices.reduce(
      (sum, inv) => sum + (Number(inv.grandTotal) || 0),
      0
    );

    return {
      [STATUS_TABS.ALL]: invoices.length,
      [STATUS_TABS.PENDING]: count(STATUS_TABS.PENDING),
      [STATUS_TABS.APPROVED]: count(STATUS_TABS.APPROVED),
      [STATUS_TABS.REJECTED]: count(STATUS_TABS.REJECTED),
      totalApprovalValue,
      currency: invoices[0]?.currency || invoices[0]?.currencyCode || "USD",
    };
  }, [invoices]);

  // KPI cards double as status filters (Total Approval Value is display-only)
  const kpiCards = [
    { key: STATUS_TABS.ALL, label: "Total Invoices", icon: FileText, color: "bg-[#0A0082] text-white" },
    { key: STATUS_TABS.PENDING, label: "Pending Approval", icon: Clock, color: "bg-amber-500 text-white" },
    { key: STATUS_TABS.APPROVED, label: "Approved", icon: CheckCircle2, color: "bg-emerald-600 text-white" },
    { key: STATUS_TABS.REJECTED, label: "Rejected", icon: XCircle, color: "bg-rose-600 text-white" },
  ];

  const handleKpiClick = (key) => {
    if (key === STATUS_TABS.ALL) {
      setStatusTab(STATUS_TABS.ALL);
    } else {
      setStatusTab((prev) => (prev === key ? STATUS_TABS.ALL : key));
    }
    setCurrentPage(1);
  };

  const handleSearchInputChange = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [statusTab, searchQuery]);

  const filteredInvoices = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return invoices.filter((inv) => {
      if (statusTab !== STATUS_TABS.ALL && getInvoiceStatus(inv) !== statusTab) return false;

      if (q) {
        const haystack = [
          inv.invoiceNumber,
          inv.clientName,
          inv.projectName,
          inv.billingSnapshotNumber || inv.snapshotNumber,
        ].map((v) => (v || "").toLowerCase());
        if (!haystack.some((v) => v.includes(q))) return false;
      }
      return true;
    });
  }, [invoices, statusTab, searchQuery]);

  const totalPages = Math.ceil(filteredInvoices.length / PAGE_SIZE) || 1;
  const paginatedInvoices = useMemo(
    () => filteredInvoices.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filteredInvoices, currentPage]
  );

  const handleReviewInvoice = (inv) => {
    if (inv.billingScheduleId && !inv.billingSnapshotId) {
      navigate(`/account-receivable/invoices/occurrence/${inv.billingScheduleId}`, {
        state: {
          from: "invoice-approval",
          source: "invoice-approval",
          billingScheduleId: inv.billingScheduleId,
          occurrenceId: inv.billingScheduleId,
          invoiceId: inv.invoiceId,
        },
      });
      return;
    }

    const targetSnapshotId = inv.billingSnapshotId || inv.snapshotId || inv.invoiceId;
    if (!targetSnapshotId) {
      showStatusToast("Identifier is missing for this invoice.", "error");
      return;
    }
    navigate(`/account-receivable/invoices/${targetSnapshotId}`, {
      state: {
        from: "invoice-approval",
        source: "invoice-approval",
        invoiceId: inv.invoiceId,
      },
    });
  };

  const kpiCardsSection = (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {kpiCards.map((kpi) => (
        <button
          key={kpi.key}
          type="button"
          onClick={() => handleKpiClick(kpi.key)}
          title={`Filter by ${kpi.label}`}
          className="w-full rounded-xl text-left transition-transform active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
        >
          <ARKPICard
            label={kpi.label}
            value={loading ? "…" : kpis[kpi.key]}
            icon={<kpi.icon className="h-5 w-5" />}
            color={kpi.color}
            className="h-full w-full"
          />
        </button>
      ))}

      <div className="col-span-2 sm:col-span-1">
        <ARKPICard
          label="Total Approval Value"
          value={loading ? "…" : formatCurrency(kpis.totalApprovalValue, kpis.currency)}
          icon={<DollarSign className="h-5 w-5" />}
          color="bg-indigo-600 text-white"
          className="h-full w-full"
        />
      </div>
    </div>
  );

  const kpiSection = (
    <ARKPIStatusTabs
      label="Invoice approval status"
      loading={loading}
      items={kpiCards.map((kpi) => ({
        key: kpi.key,
        label: kpi.label,
        value: kpis[kpi.key],
        active: statusTab === kpi.key,
        onClick: () => handleKpiClick(kpi.key),
      }))}
    />
  );

  if (loading && !refreshing) {
    return (
      <div className="flex h-80 items-center justify-center">
        <Loader size="lg" text="Loading Invoice Approval Dashboard..." />
      </div>
    );
  }

  // Error state with retry
  if (error && !loading && invoices.length === 0) {
    return (
      <div className="space-y-4">
        <PageHeader
          title="Invoice Approval"
          subtitle="Review, approve, and track invoices through the invoice approval lifecycle."
        />

        <PageCard>
          <PageCardContent className="p-12 text-center space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-600">
              <FileCheck className="h-8 w-8" />
            </div>
            <div className="space-y-1.5 max-w-md mx-auto">
              <h3 className="text-lg font-bold text-slate-800">
                Failed to Load Invoice Approval Workspace
              </h3>
              <p className="text-sm text-red-600">{error}</p>
            </div>
            <div className="pt-3">
            </div>
          </PageCardContent>
        </PageCard>
      </div>
    );
  }

  // Genuine empty state: zero workflow records exist
  if (!loading && invoices.length === 0) {
    return (
      <div className="space-y-4">
        <PageHeader
          title="Invoice Approval"
          subtitle="Review, approve, and track invoices through the invoice approval lifecycle."
        />

        {kpiCardsSection}

        <PageCard>
          <PageCardContent className="p-12 text-center space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-500">
              <FileCheck className="h-8 w-8" />
            </div>
            <div className="space-y-1.5 max-w-md mx-auto">
              <h3 className="text-lg font-bold text-slate-800">
                There are no invoices in the approval workflow yet.
              </h3>
              <p className="text-sm text-slate-500">
                Generated invoices submitted for approval will appear here for review and historical auditing.
              </p>
            </div>
          </PageCardContent>
        </PageCard>
      </div>
    );
  }

  const tableRows = paginatedInvoices.map((item) => {
    const rawStatus = getInvoiceStatus(item);
    const isPending = rawStatus === STATUS_TABS.PENDING;
    const isRejected = rawStatus === STATUS_TABS.REJECTED;
    const isLockingRow = lockingInvoiceId !== null && lockingInvoiceId === getInvoiceRecordId(item);

    return {
      onRowClick: () => handleReviewInvoice(item),
      invoiceNumber: (
        <div className="text-left">
          <span className="font-mono font-bold text-indigo-700">{item.invoiceNumber || "—"}</span>
          {(item.billingSnapshotNumber || item.snapshotNumber) && (
            <div className="text-xs font-mono text-slate-400">
              {item.billingSnapshotNumber || item.snapshotNumber}
            </div>
          )}
        </div>
      ),
      client: <div className="text-left font-semibold text-slate-800">{item.clientName || "—"}</div>,
      project: (
        <div className="text-left">
          <div className="font-bold text-slate-900">{item.projectName || "—"}</div>
        </div>
      ),
      billingPeriod: (
        <div className="flex items-center justify-start font-medium text-slate-700">
          {item.billingPeriod || "—"}
        </div>
      ),
      invoiceDate: (
        <div className="flex items-center justify-start font-medium text-slate-700">
          {item.invoiceDate ? formatDisplayDate(item.invoiceDate) : "—"}
        </div>
      ),
      dueDate: (
        <div className="flex items-center justify-start font-medium text-slate-700">
          {item.dueDate ? formatDisplayDate(item.dueDate) : "—"}
        </div>
      ),
      grandTotal: (
        <div className="text-left font-mono font-bold text-slate-900">
          {formatCurrency(item.grandTotal || 0, item.currency || item.currencyCode || "USD")}
        </div>
      ),
      status: (
        <div className="flex flex-col items-center justify-center gap-1">
          <StatusBadge label={item.status || item.invoiceStatus || "PENDING_APPROVAL"} size="sm" />
          {isRejected && (
            <span
              className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded border ${item.correctionRequired
                ? "bg-rose-50 text-rose-700 border-rose-200"
                : "bg-emerald-50 text-emerald-700 border-emerald-200"
                }`}
            >
              {item.correctionRequired ? "Correction Required" : "Ready to Resubmit"}
            </span>
          )}
        </div>
      ),
      submittedAt: (
        <div className="text-left text-xs">
          <div className="font-medium text-slate-700">
            {item.submittedAt ? formatDisplayDateTime(item.submittedAt) : "—"}
          </div>
          {item.submittedBy && item.submittedBy !== "—" && (
            <div className="text-[11px] text-slate-400">by {item.submittedBy}</div>
          )}
        </div>
      ),
      lastAction: (
        <div className="text-left text-xs">
          <span className="font-semibold text-slate-800">{item.lastAction || "—"}</span>
          {item.lastActionAt && (
            <div className="text-[11px] text-slate-400">{formatDisplayDateTime(item.lastActionAt)}</div>
          )}
        </div>
      ),
      actions: (
        <div className="flex items-center justify-center">
          <ActionMenu
            items={[
              {
                label: isPending ? "Review & Decide" : "View Invoice",
                icon: <Eye className="h-4 w-4 text-slate-600" />,
                onClick: () => handleReviewInvoice(item),
              },
              {
                label: isLockingRow ? "Acquiring lock..." : "Approve Invoice",
                icon: <CheckCircle2 className="h-4 w-4 text-emerald-600" />,
                hidden: !isPending,
                disabled: Boolean(lockingInvoiceId),
                onClick: () => startDecision(item, () => setApproveTarget(item)),
              },
              {
                label: isLockingRow ? "Acquiring lock..." : "Reject Invoice",
                icon: <XCircle className="h-4 w-4 text-rose-600" />,
                hidden: !isPending,
                danger: true,
                disabled: Boolean(lockingInvoiceId),
                onClick: () =>
                  startDecision(item, () => {
                    setRejectReason("");
                    setRejectTarget(item);
                  }),
              },
            ]}
          />
        </div>
      ),
    };
  });

  return (
    <div className="space-y-4">
      {/* 1. Page Header */}
      <PageHeader
        title="Invoice Approval"
        subtitle="Review, approve, and track invoices through the invoice approval lifecycle."
      />

      {/* 2. KPI Cards — click to filter, click the active card again to clear */}
      {kpiCardsSection}

      {/* 3. Main Data Card */}
      <PageCard>
        <PageCardContent className="p-4 sm:p-5 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Invoice approvals</h2>
              <p className="mt-0.5 text-xs text-slate-500">Review invoices by approval status and track their latest action.</p>
            </div>
            <p className="text-xs font-medium text-slate-600">
              Total approval value <span className="ml-1 font-semibold text-slate-900">{loading ? "…" : formatCurrency(kpis.totalApprovalValue, kpis.currency)}</span>
            </p>
          </div>
          {kpiSection}
          <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50/70 p-2 lg:flex-row lg:items-center lg:justify-between">
            <div className="w-full lg:max-w-md">
              <SearchInput
                value={searchQuery}
                onChange={handleSearchInputChange}
                onSearch={(val) => setSearchQuery(val)}
                placeholder="Search by invoice number, project, client, or snapshot..."
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {(statusTab !== STATUS_TABS.ALL || searchQuery) && (
                <ARClearFiltersButton
                  onClick={() => {
                    setStatusTab(STATUS_TABS.ALL);
                    setSearchQuery("");
                    setCurrentPage(1);
                  }}
                  title="Clear all search and status filters"
                />
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <ARTable
              headers={TABLE_HEADERS}
              columns={TABLE_COLUMNS}
              rows={tableRows}
              alignments={TABLE_ALIGNMENTS}
              headerAlignments={TABLE_HEADER_ALIGNMENTS}
              loading={loading}
              emptyMessage="No matching invoices found for the selected criteria."
            />
            {!loading && filteredInvoices.length > 0 && (
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

      {/* Approval Confirmation Modal */}
      <ConfirmationModal
        isOpen={Boolean(approveTarget)}
        title="Approve Invoice"
        message={
          approveTarget
            ? `Are you sure you want to approve invoice ${approveTarget.invoiceNumber || "this invoice"} for ${formatCurrency(approveTarget.grandTotal || 0, approveTarget.currency || approveTarget.currencyCode || "USD")}? Once approved, it can be delivered to the client.`
            : ""
        }
        confirmText="Approve"
        variant="primary"
        isLoading={approveLoading}
        onCancel={closeApproveModal}
        onConfirm={handleConfirmApprove}
      />

      {/* Rejection Modal */}
      <ConfirmationModal
        isOpen={Boolean(rejectTarget)}
        title="Reject Invoice"
        message={
          rejectTarget
            ? `Are you sure you want to reject invoice ${rejectTarget.invoiceNumber || "this invoice"}? Please specify the reason for rejection below:`
            : ""
        }
        confirmText="Reject Invoice"
        variant="danger"
        isLoading={rejectLoading}
        onCancel={closeRejectModal}
        onConfirm={handleConfirmReject}
      >
        <div className="mt-3">
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Rejection Reason <span className="text-red-500">*</span>
          </label>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Enter specific reasons why this invoice was rejected..."
            rows={3}
            className="w-full rounded-lg border border-slate-200 p-2.5 text-xs text-slate-800 placeholder-slate-400 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
          />
        </div>
      </ConfirmationModal>
    </div>
  );
}
