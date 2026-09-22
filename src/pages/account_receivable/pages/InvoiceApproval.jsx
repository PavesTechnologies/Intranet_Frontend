import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Clock,
  CheckCircle2,
  XCircle,
  DollarSign,
  RefreshCw,
  Eye,
  ArrowRight,
  FileText,
  FileCheck,
} from "lucide-react";

import PageHeader from "../../../components/ui/PageHeader";
import { PageCard, PageCardContent } from "../../../components/Cards/PageCard";
import { KPICard } from "../../../components/kpi/KPI";
import Button from "../../../components/Button/Button";
import Loader from "../../../components/ui/Loader";
import SearchInput from "../../../components/filter/Searchbar";
import FilterListbox from "../../../components/filter/FilterListbox";
import Pagination from "../../../components/Pagination/pagination";
import StatusBadge from "../../../components/status/statusbadge";
import { showStatusToast } from "../../../components/toastfy/toast";
import ARTable from "../components/common/ARTable";
import ActionMenu from "../components/common/ActionMenu";
import { formatCurrency, formatDisplayDate, formatDisplayDateTime } from "../utils/format";
import {
  getInvoiceApprovalWorkspace,
  getInvoiceErrorMessage,
} from "../services/invoiceService";

/* ------------------------------------------------------------------ */
/* Global constants                                                    */
/* ------------------------------------------------------------------ */

const INVOICE_GENERATION_PATH = "/account-receivable/invoice-generation";

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
  "Action",
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
  "action",
];

const getInvoiceStatus = (inv) => (inv.status || inv.invoiceStatus || "").toUpperCase();

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

  const statusFilterOptions = [
    { value: STATUS_TABS.ALL, label: `All Statuses (${kpis.ALL})` },
    { value: STATUS_TABS.PENDING, label: `Pending Approval (${kpis.PENDING_APPROVAL})` },
    { value: STATUS_TABS.APPROVED, label: `Approved (${kpis.APPROVED})` },
    { value: STATUS_TABS.REJECTED, label: `Rejected (${kpis.REJECTED})` },
  ];

  const handleKpiClick = (key) => {
    if (key === STATUS_TABS.ALL) {
      setStatusTab(STATUS_TABS.ALL);
    } else {
      setStatusTab((prev) => (prev === key ? STATUS_TABS.ALL : key));
    }
    setCurrentPage(1);
  };

  const handleStatusChange = (value) => {
    setStatusTab(value);
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

  const refreshButton = (label = "Refresh") => (
    <Button variant="outline" size="sm" onClick={() => loadData(true)} disabled={refreshing}>
      <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
      {label}
    </Button>
  );

  const kpiSection = (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {kpiCards.map((kpi) => (
        <button
          key={kpi.key}
          type="button"
          onClick={() => handleKpiClick(kpi.key)}
          title={`Filter by ${kpi.label}`}
          className="text-left rounded-xl transition-transform active:scale-[0.99] focus:outline-none"
        >
          <KPICard
            label={kpi.label}
            value={loading ? "…" : kpis[kpi.key]}
            icon={<kpi.icon className="h-5 w-5" />}
            color={kpi.color}
            className="h-full w-full cursor-pointer bg-white shadow-sm border border-slate-200 transition-all hover:shadow-md"
          />
        </button>
      ))}

      <div className="col-span-2 sm:col-span-1">
        <KPICard
          label="Total Approval Value"
          value={loading ? "…" : formatCurrency(kpis.totalApprovalValue, kpis.currency)}
          icon={<DollarSign className="h-5 w-5" />}
          color="bg-indigo-600 text-white"
          className="h-full w-full bg-white shadow-sm border border-slate-200"
        />
      </div>
    </div>
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
          actions={refreshButton("Retry")}
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
              <Button
                onClick={() => loadData(true)}
                className="bg-[#0A0082] text-white hover:bg-[#0A0082]/90 font-semibold px-6 py-2.5"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry
              </Button>
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
          actions={refreshButton()}
        />

        {kpiSection}

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
            <div className="pt-3">
              <Button
                onClick={() => navigate(INVOICE_GENERATION_PATH)}
                className="bg-[#0A0082] text-white hover:bg-[#0A0082]/90 font-semibold px-6 py-2.5"
              >
                Go to Invoice Generation
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
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
      client: <span className="font-semibold text-slate-800">{item.clientName || "—"}</span>,
      project: (
        <div className="text-left">
          <div className="font-bold text-slate-900">{item.projectName || "—"}</div>
        </div>
      ),
      billingPeriod: <span className="font-medium text-slate-700">{item.billingPeriod || "—"}</span>,
      invoiceDate: (
        <span className="font-medium text-slate-700">
          {item.invoiceDate ? formatDisplayDate(item.invoiceDate) : "—"}
        </span>
      ),
      dueDate: (
        <span className="font-medium text-slate-700">
          {item.dueDate ? formatDisplayDate(item.dueDate) : "—"}
        </span>
      ),
      grandTotal: (
        <span className="font-mono font-bold text-slate-900">
          {formatCurrency(item.grandTotal || 0, item.currency || item.currencyCode || "USD")}
        </span>
      ),
      status: (
        <div className="flex flex-col items-start gap-1">
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
      // Three-dots menu, same as BillingApprovals
      action: (
        <ActionMenu
          items={[
            {
              label: isPending || isRejected ? "Review Invoice" : "View Invoice",
              icon: <Eye className="h-4 w-4" />,
              onClick: () => handleReviewInvoice(item),
            },
          ]}
        />
      ),
    };
  });

  return (
    <div className="space-y-4">
      {/* 1. Page Header */}
      <PageHeader
        title="Invoice Approval"
        subtitle="Review, approve, and track invoices through the invoice approval lifecycle."
        actions={refreshButton()}
      />

      {/* 2. KPI Cards — click to filter, click the active card again to clear */}
      {kpiSection}

      {/* 3. Main Data Card */}
      <PageCard>
        <PageCardContent className="p-4 sm:p-5 space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="w-full lg:max-w-md">
              <SearchInput
                value={searchQuery}
                onChange={handleSearchInputChange}
                onSearch={(val) => setSearchQuery(val)}
                placeholder="Search by invoice number, project, client, or snapshot..."
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="w-48 sm:w-52">
                <FilterListbox
                  options={statusFilterOptions}
                  value={statusTab}
                  onChange={handleStatusChange}
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
    </div>
  );
}