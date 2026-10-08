import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import {
  FileText,
  RefreshCw,
  CheckCircle2,
  FolderKanban,
  Clock,
  XCircle,
  Send,
  Eye,
  AlertCircle,
  MailCheck,
  ChevronRight,
} from "lucide-react";

import PageHeader from "../../../components/ui/PageHeader";
import SearchInput from "../../../components/filter/Searchbar";
import { PageCard } from "../../../components/Cards/PageCard";
import ARKPICard from "../components/common/ARKPICard";
import { cn } from "@/lib/utils";
import Button from "../../../components/Button/Button";
import Loader from "../../../components/ui/Loader";
import StatusBadge from "../../../components/status/statusbadge";
import Pagination from "../../../components/Pagination/pagination";
import ConfirmationModal from "../../../components/confirmation_modal/ConfirmationModal";
import { showStatusToast } from "../../../components/toastfy/toast";
import ARTable from "../components/common/ARTable";
import ActionMenu from "../components/common/ActionMenu";

import { formatCurrency, formatDisplayDate } from "../utils/format";
import {
  getInvoiceGenerationWorkspace,
  getInvoiceErrorMessage,
  submitInvoiceForApproval,
  sendInvoiceToClient,
} from "../services/invoiceService";
import {
  loadDemoDeliveryMap,
  saveDemoDelivery,
  DEMO_DELIVERY_STATUS,
  DEMO_SENT_BY,
} from "../utils/invoiceDemoData";

const PAGE_SIZE = 6;

const PIPELINE_STAGES = [
  { key: "READY_FOR_INVOICE", label: "Ready for Invoice", countKey: "readyForInvoiceCount" },
  { key: "GENERATED", label: "Generated", countKey: "generatedCount" },
  { key: "PENDING_APPROVAL", label: "Pending Approval", countKey: "pendingApprovalCount" },
  { key: "APPROVED", label: "Approved", countKey: "approvedCount" },
  { key: "REJECTED", label: "Rejected", countKey: "rejectedCount" },
  { key: "INVOICED", label: "Invoiced", countKey: "invoicedCount" },
];

const PIPELINE_EMPTY_MESSAGES = {
  ALL: "No invoice records available in workspace.",
  READY_FOR_INVOICE: "No candidates currently ready for invoice generation.",
  GENERATED: "No generated invoices awaiting review or approval.",
  PENDING_APPROVAL: "No invoices currently pending approval.",
  APPROVED: "No approved invoices awaiting client delivery.",
  REJECTED: "No rejected invoices requiring correction.",
  INVOICED: "No finalized invoiced records.",
};

export default function InvoiceGeneration() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const [workspaceItems, setWorkspaceItems] = useState([]);
  const [backendSummary, setBackendSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);

  // Confirmation modal states
  const [submitTarget, setSubmitTarget] = useState(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [sendTarget, setSendTarget] = useState(null);
  const [sendLoading, setSendLoading] = useState(false);

  // Demo delivery map: invoiceId → { deliveryStatus, sentAt, sentBy }
  // Loaded from localStorage on mount and after each refresh
  const [demoDeliveryMap, setDemoDeliveryMap] = useState(() =>
    loadDemoDeliveryMap()
  );

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const handleKpiClick = (type) => {
    if (type === "TOTAL") {
      setStatusFilter("ALL");
    } else {
      setStatusFilter(type);
    }
  };

  // Route forwarder: if snapshotId is provided as a query parameter or state,
  // forward to the dedicated invoice-generation detail workflow
  const targetSnapshotId =
    searchParams.get("snapshotId") ||
    location.state?.snapshotId ||
    null;

  useEffect(() => {
    if (targetSnapshotId) {
      navigate(`/account-receivable/invoice-generation/${targetSnapshotId}`, {
        replace: true,
        state: {
          from: "invoice-generation",
          source: "invoice-generation",
        },
      });
    }
  }, [targetSnapshotId, navigate]);

  const loadData = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);

    setLoading(true);
    setError(null);

    try {
      const { rows, summary } = await getInvoiceGenerationWorkspace();

      setWorkspaceItems(rows || []);
      setBackendSummary(summary || null);

      // Re-sync demo delivery map on each data refresh
      setDemoDeliveryMap(loadDemoDeliveryMap());

      if (isManualRefresh) {
        showStatusToast(
          "Invoice generation workspace refreshed.",
          "success"
        );
      }
    } catch (err) {
      console.error("[InvoiceGeneration] Error loading workspace:", err);

      const message = getInvoiceErrorMessage(
        err,
        "Failed to load invoice generation workspace."
      );

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

  const handleGenerateInvoice = (item) => {
    const sId = item.snapshotId || item.billingSnapshotId;
    if (!sId) {
      showStatusToast("Snapshot identifier is missing.", "error");
      return;
    }

    navigate(`/account-receivable/invoice-generation/${sId}`, {
      state: {
        from: "invoice-generation",
        source: "invoice-generation",
      },
    });
  };

  const handleViewInvoice = (inv) => {
    const targetId =
      inv.invoiceId ||
      inv.billingSnapshotId ||
      inv.snapshotId;

    if (!targetId) {
      showStatusToast(
        "Identifier is missing for this invoice.",
        "error"
      );
      return;
    }

    navigate(`/account-receivable/invoices/${targetId}`, {
      state: {
        from: "invoice-generation",
        source: "invoice-generation",
      },
    });
  };

  // Filtered invoices/workspace rows
  const filteredInvoices = useMemo(() => {
    return workspaceItems.filter((item) => {
      const wsStatus = (item.workspaceStatus || item.invoiceStatus || "").toUpperCase();

      // Status filter against authoritative workspaceStatus
      if (statusFilter !== "ALL") {
        if (wsStatus !== statusFilter) return false;
      }

      // Search query supports invoice number, project name, client name, and snapshot number
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();

        const num = (item.invoiceNumber || "").toLowerCase();
        const client = (item.clientName || "").toLowerCase();
        const project = (item.projectName || "").toLowerCase();
        const snapNum = (item.snapshotNumber || "").toLowerCase();

        const matches =
          num.includes(q) ||
          client.includes(q) ||
          project.includes(q) ||
          snapNum.includes(q);

        if (!matches) return false;
      }

      return true;
    });
  }, [workspaceItems, statusFilter, searchQuery]);

  // Invoice KPIs and pipeline counts
  const kpis = useMemo(() => {
    const readyForInvoiceCount =
      backendSummary?.readyForInvoiceCount ??
      workspaceItems.filter((r) => r.workspaceStatus === "READY_FOR_INVOICE").length;

    const generatedCount =
      backendSummary?.generatedCount ??
      workspaceItems.filter((r) => r.workspaceStatus === "GENERATED").length;

    const pendingApprovalCount =
      backendSummary?.pendingApprovalCount ??
      workspaceItems.filter((r) => r.workspaceStatus === "PENDING_APPROVAL").length;

    const approvedCount =
      backendSummary?.approvedCount ??
      workspaceItems.filter((r) => r.workspaceStatus === "APPROVED").length;

    const rejectedCount =
      backendSummary?.rejectedCount ??
      workspaceItems.filter((r) => r.workspaceStatus === "REJECTED").length;

    const invoicedCount =
      backendSummary?.invoicedCount ??
      workspaceItems.filter((r) => r.workspaceStatus === "INVOICED").length;

    // All records in workspace (including Ready for Invoice candidate and created invoices)
    const allCount = backendSummary
      ? (Number(backendSummary.readyForInvoiceCount || 0) +
         Number(backendSummary.generatedCount || 0) +
         Number(backendSummary.pendingApprovalCount || 0) +
         Number(backendSummary.approvedCount || 0) +
         Number(backendSummary.rejectedCount || 0) +
         Number(backendSummary.invoicedCount || 0))
      : workspaceItems.length;

    // Total Invoices: authoritative total from the workspace response (all workspace items: candidates + created invoices)
    const totalInvoices =
      backendSummary?.totalInvoices ??
      backendSummary?.totalCount ??
      backendSummary?.total ??
      (backendSummary
        ? (Number(backendSummary.readyForInvoiceCount || 0) +
           Number(backendSummary.generatedCount || 0) +
           Number(backendSummary.pendingApprovalCount || 0) +
           Number(backendSummary.approvedCount || 0) +
           Number(backendSummary.rejectedCount || 0) +
           Number(backendSummary.invoicedCount || 0))
        : workspaceItems.length);

    // Total Invoiced Amount: summary.totalInvoicedAmount (strictly excludes Ready for Invoice candidate amount)
    const totalInvoicedAmount =
      backendSummary?.totalInvoicedAmount ??
      workspaceItems
        .filter((r) => r.workspaceStatus !== "READY_FOR_INVOICE")
        .reduce((sum, r) => sum + (Number(r.grandTotal) || 0), 0);

    const currency = workspaceItems[0]?.currency || "USD";

    return {
      allCount,
      totalInvoices,
      readyForInvoiceCount,
      generatedCount,
      pendingApprovalCount,
      approvedCount,
      rejectedCount,
      invoicedCount,
      totalInvoicedAmount,
      currency,
    };
  }, [workspaceItems, backendSummary]);

  // Stage tabs renderer with count pill badge (aligned with Tax Calculation Console)
  const renderTab = (key, label, count) => {
    const active = statusFilter === key;
    return (
      <button
        key={key}
        type="button"
        role="tab"
        aria-selected={active}
        onClick={() => setStatusFilter(key)}
        className={`flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2.5 text-xs font-semibold transition-colors focus:outline-none focus-visible:bg-slate-50 ${
          active
            ? "border-[#0A0082] text-[#0A0082]"
            : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800"
        }`}
      >
        {label}
        <span
          className={`min-w-[20px] rounded-full px-1.5 py-px text-center text-[10px] font-semibold tabular-nums ${
            active ? "bg-[#0A0082] text-white" : "bg-slate-100 text-slate-600"
          }`}
        >
          {loading ? "…" : count}
        </span>
      </button>
    );
  };

  // Grouped KPIs — Approval Status (5 cards) and Invoice Status (2 cards)
  const approvalKpis = [
    {
      key: "TOTAL",
      label: "Total Invoices",
      subLabel: null,
      value: kpis.totalInvoices,
      icon: FolderKanban,
      color: "bg-[#0A0082] text-white",
      active: statusFilter === "ALL",
      isTotal: true,
    },
    {
      key: "GENERATED",
      label: "Generated",
      subLabel: null,
      value: kpis.generatedCount,
      icon: CheckCircle2,
      color: "bg-emerald-600 text-white",
      active: statusFilter === "GENERATED",
    },
    {
      key: "PENDING_APPROVAL",
      label: "Pending Approval",
      subLabel: null,
      value: kpis.pendingApprovalCount,
      icon: Clock,
      color: "bg-amber-500 text-white",
      active: statusFilter === "PENDING_APPROVAL",
    },
    {
      key: "APPROVED",
      label: "Approved",
      subLabel: null,
      value: kpis.approvedCount,
      icon: CheckCircle2,
      color: "bg-teal-600 text-white",
      active: statusFilter === "APPROVED",
    },
    {
      key: "REJECTED",
      label: "Rejected",
      subLabel: null,
      value: kpis.rejectedCount,
      icon: XCircle,
      color: "bg-rose-600 text-white",
      active: statusFilter === "REJECTED",
    },
  ];

  const invoiceStatusKpis = [
    {
      key: "READY_FOR_INVOICE",
      label: "Ready for Invoice",
      subLabel: null,
      value: kpis.readyForInvoiceCount,
      icon: FileText,
      color: "bg-amber-500 text-white",
      active: statusFilter === "READY_FOR_INVOICE",
    },
    {
      key: "INVOICED",
      label: "Invoiced",
      subLabel: null,
      value: kpis.invoicedCount,
      icon: Send,
      color: "bg-blue-600 text-white",
      active: statusFilter === "INVOICED",
    },
  ];

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredInvoices.length / PAGE_SIZE));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedInvoices = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return filteredInvoices.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredInvoices, currentPage]);

  const handleConfirmSubmit = async () => {
    if (!submitTarget) return;
    const invId = submitTarget.invoiceId || submitTarget.billingSnapshotId || submitTarget.snapshotId;
    if (!invId) {
      showStatusToast("Invoice identifier is missing.", "error");
      return;
    }
    setSubmitLoading(true);
    try {
      await submitInvoiceForApproval(invId);
      showStatusToast("Invoice submitted for approval successfully.", "success");
      setSubmitTarget(null);
      await loadData();
    } catch (err) {
      const msg = getInvoiceErrorMessage(err, "Failed to submit invoice for approval.");
      showStatusToast(msg, "error");
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleConfirmSend = async () => {
    if (!sendTarget) return;
    const invId = sendTarget.invoiceId || sendTarget.billingSnapshotId || sendTarget.snapshotId;
    if (!invId) {
      showStatusToast("Invoice identifier is missing.", "error");
      setSendTarget(null);
      return;
    }
    setSendLoading(true);
    try {
      let backendResult = null;
      try {
        backendResult = await sendInvoiceToClient(invId);
      } catch (apiErr) {
        console.error("[InvoiceGeneration] Error sending invoice to client:", apiErr);
        const msg = getInvoiceErrorMessage(apiErr, "Failed to send invoice to client.");
        showStatusToast(msg, "error");
        setSendTarget(null);
        return;
      }

      const clientEmail =
        backendResult?.recipientEmail ||
        backendResult?.email ||
        sendTarget.email ||
        sendTarget.clientEmail ||
        null;

      saveDemoDelivery(invId, {
        deliveryStatus: DEMO_DELIVERY_STATUS.SENT_TO_CLIENT,
        sentAt: new Date().toISOString(),
        sentBy: DEMO_SENT_BY,
        recipientEmail: clientEmail,
      });
      setDemoDeliveryMap(loadDemoDeliveryMap());
      showStatusToast(
        backendResult?.message ||
          `Invoice ${sendTarget.invoiceNumber || invId} sent${clientEmail ? ` to ${clientEmail}` : ""} successfully.`,
        "success"
      );
      setSendTarget(null);
    } catch (err) {
      const msg = getInvoiceErrorMessage(err, "Failed to send invoice to client.");
      showStatusToast(msg, "error");
    } finally {
      setSendLoading(false);
    }
  };

  if (loading && !refreshing) {
    return (
      <div className="flex h-80 items-center justify-center">
        <Loader
          size="lg"
          text="Loading Invoice Generation Workspace..."
        />
      </div>
    );
  }

  const tableHeaders = [
    "Invoice / Snapshot",
    "Client",
    "Project",
    "Billing Period",
    "Invoice Date",
    "Due Date",
    "Currency",
    "Grand Total",
    "Status",
    "Actions",
  ];

  const tableColumns = [
    "invoiceNumber",
    "client",
    "project",
    "billingPeriod",
    "invoiceDate",
    "dueDate",
    "currency",
    "grandTotal",
    "status",
    "actions",
  ];

  const tableAlignments = {
    invoiceNumber: "left",
    client: "left",
    project: "left",
    billingPeriod: "left",
    invoiceDate: "left",
    dueDate: "left",
    currency: "left",
    grandTotal: "left",
    status: "center",
    actions: "center",
  };

  const tableRows = paginatedInvoices.map((item) => {
    const isReady = item.workspaceStatus === "READY_FOR_INVOICE";
    const st = (item.workspaceStatus || item.invoiceStatus || "").toUpperCase();

    const iid =
      item.invoiceId ||
      item.billingSnapshotId ||
      item.snapshotId;

    const delivery =
      demoDeliveryMap[iid] || {
        deliveryStatus: DEMO_DELIVERY_STATUS.NOT_SENT,
      };

    const isSent =
      delivery.deliveryStatus ===
      DEMO_DELIVERY_STATUS.SENT_TO_CLIENT;

    return {
      onRowClick: () => (isReady ? handleGenerateInvoice(item) : handleViewInvoice(item)),

      invoiceNumber: (
        <div className="text-left">
          {item.invoiceNumber ? (
            <span className="font-mono font-bold text-indigo-700">
              {item.invoiceNumber}
            </span>
          ) : (
            <span className="font-mono font-medium text-slate-400">
              —
            </span>
          )}

          {item.snapshotNumber && (
            <div className={`text-xs font-mono ${isReady ? "text-indigo-600 font-semibold" : "text-slate-400"}`}>
              {item.snapshotNumber}
            </div>
          )}
        </div>
      ),

      client: (
        <div className="text-left font-semibold text-slate-800">
          {item.clientName || "—"}
        </div>
      ),

      project: (
        <div className="text-left">
          <div className="font-bold text-slate-900">
            {item.projectName || "—"}
          </div>

          {item.projectCode && (
            <div className="text-xs font-mono text-slate-400">
              {item.projectCode}
            </div>
          )}
        </div>
      ),

      billingPeriod: (
        <div className="flex items-center justify-center font-medium text-slate-700">
          {item.billingPeriod || "—"}
        </div>
      ),

      invoiceDate: (
        <div className="flex items-center justify-center font-medium text-slate-700">
          {item.invoiceDate
            ? formatDisplayDate(item.invoiceDate)
            : "—"}
        </div>
      ),

      dueDate: (
        <div className="flex items-center justify-center font-medium text-slate-700">
          {item.dueDate
            ? formatDisplayDate(item.dueDate)
            : "—"}
        </div>
      ),

      currency: (
        <div className="flex items-center justify-center font-semibold text-slate-700">
          {item.currency || "USD"}
        </div>
      ),

      grandTotal: (
        <div className="text-right font-mono font-bold text-slate-900">
          {formatCurrency(
            item.grandTotal || item.amount || 0,
            item.currency || "USD"
          )}
        </div>
      ),

      status: (
        <div className="flex flex-col items-center justify-center gap-1">
          <StatusBadge
            label={item.workspaceStatus}
            size="sm"
          />

          {st === "REJECTED" && (
            <span
              className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                item.correctionRequired
                  ? "bg-rose-50 text-rose-700 border-rose-200"
                  : "bg-emerald-50 text-emerald-700 border-emerald-200"
              }`}
            >
              {item.correctionRequired
                ? "Correction Required"
                : "Ready to Resubmit"}
            </span>
          )}
        </div>
      ),

      actions: (
        <div className="flex items-center justify-center">
          <ActionMenu
            items={[
              {
                label: "Generate Invoice",
                icon: <FileText className="h-4 w-4 text-indigo-600" />,
                hidden: !isReady,
                onClick: () => handleGenerateInvoice(item),
              },
              {
                label: "View Invoice",
                icon: <Eye className="h-4 w-4 text-slate-600" />,
                hidden: isReady,
                onClick: () => handleViewInvoice(item),
              },
              {
                label: "Submit for Approval",
                icon: <CheckCircle2 className="h-4 w-4 text-indigo-600" />,
                hidden: st !== "GENERATED",
                onClick: () => setSubmitTarget(item),
              },
              {
                label: isSent ? "Resend to Client" : "Send to Client",
                icon: <MailCheck className="h-4 w-4 text-emerald-600" />,
                hidden: st !== "APPROVED",
                onClick: () => setSendTarget(item),
              },
              {
                label: "Review Rejection",
                icon: <AlertCircle className="h-4 w-4 text-rose-600" />,
                hidden: st !== "REJECTED",
                danger: true,
                onClick: () => handleViewInvoice(item),
              },
            ]}
          />
        </div>
      ),
    };
  });

  return (
    <div className="w-full space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Invoice Generation"
        subtitle="Workspace containing invoice-ready billing candidates and created invoices."
        actions={
          <Button
            variant="outline"
            size="small"
            onClick={() => loadData(true)}
            disabled={refreshing}
          >
            <RefreshCw
              className={`mr-1.5 h-3.5 w-3.5 ${
                refreshing ? "animate-spin" : ""
              }`}
            />
            Refresh
          </Button>
        }
      />

      {/* Inline Error Notice if data fetch failed */}
      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 shadow-sm">
          <AlertCircle className="h-5 w-5 flex-shrink-0 text-rose-600 mt-0.5" />

          <div className="flex-1 space-y-1">
            <div className="font-bold text-rose-900">
              Failed to Load Invoices
            </div>

            <div>{error}</div>
          </div>

          <Button
            size="small"
            variant="outline"
            onClick={() => loadData(true)}
            className="text-xs bg-white text-rose-700 border-rose-300 hover:bg-rose-50 font-semibold shrink-0"
          >
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Retry
          </Button>
        </div>
      )}

      {/* 2. Grouped KPI Sections — divided into Approval Status and Invoice Status */}
      <div className="space-y-3">
        {/* Section 1: Approval Status */}
        <div className="space-y-1.5">
          <h3 className="text-sm font-bold text-slate-800 px-0.5 select-none">
            Approval Status
          </h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {approvalKpis.map((kpi) => (
              <button
                key={kpi.key}
                type="button"
                onClick={() => handleKpiClick(kpi.key)}
                className="w-full rounded-xl text-left transition-transform active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
              >
                <ARKPICard
                  label={kpi.label}
                  subLabel={kpi.subLabel}
                  value={loading ? "…" : kpi.value}
                  icon={<kpi.icon className="h-5 w-5" />}
                  color={kpi.color}
                  active={kpi.active}
                  className="h-full w-full"
                />
              </button>
            ))}
          </div>
        </div>

        {/* Section 2: Invoice Status */}
        <div className="space-y-1.5">
          <h3 className="text-sm font-bold text-slate-800 px-0.5 select-none">
            Invoice Status
          </h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {invoiceStatusKpis.map((kpi) => (
              <button
                key={kpi.key}
                type="button"
                onClick={() => handleKpiClick(kpi.key)}
                className="w-full rounded-xl text-left transition-transform active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
              >
                <ARKPICard
                  label={kpi.label}
                  subLabel={kpi.subLabel}
                  value={loading ? "…" : kpi.value}
                  icon={<kpi.icon className="h-5 w-5" />}
                  color={kpi.color}
                  active={kpi.active}
                  className="h-full w-full"
                />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Invoice Pipeline Section */}
      <PageCard>
        {/* Title */}
        <div className="px-4 pt-4 sm:px-5">
          <h2 className="text-sm font-semibold text-slate-900">
            Invoice Pipeline
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Track invoice candidates and approval status from invoice generation through approval.
          </p>
        </div>

        {/* Pipeline Stage Tabs */}
        <div role="tablist" aria-label="Invoice Pipeline Stages" className="mt-3 flex items-center gap-1 overflow-x-auto overflow-y-hidden px-2 shadow-[inset_0_-1px_0_0_#e2e8f0] sm:px-3">
          {renderTab("ALL", "All", kpis.allCount)}
          <span className="mx-2 h-4 w-px shrink-0 bg-slate-200" aria-hidden="true" />
          {PIPELINE_STAGES.map((s, idx) => (
            <React.Fragment key={s.key}>
              {idx > 0 && (
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-300" aria-hidden="true" />
              )}
              {renderTab(s.key, s.label, kpis[s.countKey])}
            </React.Fragment>
          ))}
        </div>

        {/* Search Toolbar — placed inside the pipeline card */}
        <div className="px-4 py-3 sm:px-5">
          <div className="relative w-full lg:max-w-md">
            <SearchInput
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by invoice number, project, client, snapshot..."
            />
          </div>
        </div>

        {/* Invoice Queue Table */}
        <div className="border-t border-slate-100 p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800">
              Invoice Queue
            </h3>

            <span className="text-xs text-slate-400 font-medium">
              {filteredInvoices.length}{" "}
              {filteredInvoices.length === 1
                ? "Record"
                : "Records"}
            </span>
          </div>

          <ARTable
            headers={tableHeaders}
            columns={tableColumns}
            rows={tableRows}
            alignments={tableAlignments}
            emptyMessage={
              searchQuery.trim()
                ? "No invoices match your search."
                : PIPELINE_EMPTY_MESSAGES[statusFilter] || "No invoice records available"
            }
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
      </PageCard>

      {/* Submit for Approval Modal */}
      <ConfirmationModal
        isOpen={Boolean(submitTarget)}
        title="Submit Invoice for Approval"
        message={
          submitTarget
            ? `Are you sure you want to submit invoice ${submitTarget.invoiceNumber || "this invoice"} for approval? It will transition to PENDING_APPROVAL and be routed to the approver.`
            : ""
        }
        confirmText="Submit"
        variant="primary"
        isLoading={submitLoading}
        onCancel={() => !submitLoading && setSubmitTarget(null)}
        onConfirm={handleConfirmSubmit}
      />

      {/* Send to Client Modal */}
      <ConfirmationModal
        isOpen={Boolean(sendTarget)}
        title="Send Invoice to Client"
        message={
          sendTarget
            ? `Are you sure you want to deliver invoice ${sendTarget.invoiceNumber || "this invoice"} to ${sendTarget.clientName || "the client"}${sendTarget.email || sendTarget.clientEmail ? ` (${sendTarget.email || sendTarget.clientEmail})` : " (recipient email will be resolved from client information)"}?`
            : ""
        }
        confirmText="Send to Client"
        variant="primary"
        isLoading={sendLoading}
        onCancel={() => !sendLoading && setSendTarget(null)}
        onConfirm={handleConfirmSend}
      />
    </div>
  );
}
