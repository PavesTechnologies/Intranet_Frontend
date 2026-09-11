import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Clock,
  CheckCircle2,
  XCircle,
  DollarSign,
  Search,
  Filter,
  RefreshCw,
  Eye,
  ArrowRight,
  FileText,
  FileCheck,
} from "lucide-react";

import PageHeader from "../../../components/ui/PageHeader";
import { PageCard, PageCardContent } from "../../../components/Cards/PageCard";
import Button from "../../../components/Button/Button";
import Loader from "../../../components/ui/Loader";
import StatusBadge from "../../../components/status/statusbadge";
import { showStatusToast } from "../../../components/toastfy/toast";
import ARTable from "../components/common/ARTable";
import { formatCurrency, formatDisplayDate, formatDisplayDateTime } from "../utils/format";
import {
  getInvoiceApprovalWorkspace,
  getInvoiceErrorMessage,
} from "../services/invoiceService";

const INVOICE_GENERATION_PATH = "/account-receivable/invoice-generation";

export default function InvoiceApproval() {
  const navigate = useNavigate();

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

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

  // Filtered invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const st = (inv.status || inv.invoiceStatus || "").toUpperCase();

      // Status filter
      if (statusFilter !== "ALL") {
        if (st !== statusFilter) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const num = (inv.invoiceNumber || "").toLowerCase();
        const client = (inv.clientName || "").toLowerCase();
        const project = (inv.projectName || "").toLowerCase();
        const snapNum = (inv.billingSnapshotNumber || inv.snapshotNumber || "").toLowerCase();

        const matches =
          num.includes(q) ||
          client.includes(q) ||
          project.includes(q) ||
          snapNum.includes(q);

        if (!matches) return false;
      }

      return true;
    });
  }, [invoices, statusFilter, searchQuery]);

  // Persistent KPIs calculated directly from workspace records
  const kpis = useMemo(() => {
    const totalInvoices = invoices.length;

    const pendingApproval = invoices.filter(
      (inv) => (inv.status || inv.invoiceStatus || "").toUpperCase() === "PENDING_APPROVAL"
    ).length;

    const approved = invoices.filter(
      (inv) => (inv.status || inv.invoiceStatus || "").toUpperCase() === "APPROVED"
    ).length;

    const rejected = invoices.filter(
      (inv) => (inv.status || inv.invoiceStatus || "").toUpperCase() === "REJECTED"
    ).length;

    // Total Approval Value calculated strictly by summing persisted grandTotal values
    const totalApprovalValue = invoices.reduce(
      (sum, inv) => sum + (Number(inv.grandTotal) || 0),
      0
    );

    const primaryCurrency = invoices[0]?.currency || invoices[0]?.currencyCode || "USD";

    return {
      totalInvoices,
      pendingApproval,
      approved,
      rejected,
      totalApprovalValue,
      currency: primaryCurrency,
    };
  }, [invoices]);

  const handleReviewInvoice = (inv) => {
    const targetSnapshotId = inv.billingSnapshotId || inv.snapshotId || inv.invoiceId;
    if (!targetSnapshotId) {
      showStatusToast("Identifier is missing for this invoice.", "error");
      return;
    }
    navigate(`/account-receivable/invoices/${targetSnapshotId}`);
  };

  if (loading && !refreshing) {
    return (
      <div className="flex h-80 items-center justify-center">
        <Loader size="lg" text="Loading Invoice Approval Dashboard..." />
      </div>
    );
  }

  // Error State with Retry
  if (error && !loading && invoices.length === 0) {
    return (
      <div className="w-full space-y-6">
        <PageHeader
          title="Invoice Approval"
          subtitle="Review, approve, and track invoices through the invoice approval lifecycle."
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadData(true)}
              disabled={refreshing}
            >
              <RefreshCw
                className={`mr-1.5 h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
              />
              Retry
            </Button>
          }
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

  // Genuine Empty State: zero workflow records exist
  if (!loading && invoices.length === 0) {
    return (
      <div className="w-full space-y-6">
        <PageHeader
          title="Invoice Approval"
          subtitle="Review, approve, and track invoices through the invoice approval lifecycle."
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadData(true)}
              disabled={refreshing}
            >
              <RefreshCw
                className={`mr-1.5 h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          }
        />

        {/* Persistent Zero State KPIs */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 shadow-sm">
            <div className="flex items-center justify-between text-slate-600">
              <span className="text-[11px] font-bold uppercase tracking-wider">Total Invoices</span>
              <FileText className="h-4 w-4 text-slate-500" />
            </div>
            <div className="mt-2 text-2xl font-extrabold text-slate-900">0</div>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 shadow-sm">
            <div className="flex items-center justify-between text-amber-700">
              <span className="text-[11px] font-bold uppercase tracking-wider">Pending Approval</span>
              <Clock className="h-4 w-4 text-amber-600" />
            </div>
            <div className="mt-2 text-2xl font-extrabold text-amber-900">0</div>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-sm">
            <div className="flex items-center justify-between text-emerald-700">
              <span className="text-[11px] font-bold uppercase tracking-wider">Approved</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="mt-2 text-2xl font-extrabold text-emerald-900">0</div>
          </div>

          <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-4 shadow-sm">
            <div className="flex items-center justify-between text-rose-700">
              <span className="text-[11px] font-bold uppercase tracking-wider">Rejected</span>
              <XCircle className="h-4 w-4 text-rose-600" />
            </div>
            <div className="mt-2 text-2xl font-extrabold text-rose-900">0</div>
          </div>

          <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-4 shadow-sm col-span-2 sm:col-span-1 lg:col-span-1">
            <div className="flex items-center justify-between text-indigo-700">
              <span className="text-[11px] font-bold uppercase tracking-wider">Total Approval Value</span>
              <DollarSign className="h-4 w-4 text-indigo-600" />
            </div>
            <div className="mt-2 text-2xl font-extrabold font-mono text-indigo-950">
              {formatCurrency(0, "USD")}
            </div>
          </div>
        </div>

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

  const tableHeaders = [
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

  const tableColumns = [
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

  const tableRows = filteredInvoices.map((item) => {
    const isPending = (item.status || item.invoiceStatus || "").toUpperCase() === "PENDING_APPROVAL";

    return {
      onRowClick: () => handleReviewInvoice(item),
      invoiceNumber: (
        <div className="text-left">
          <span className="font-mono font-bold text-indigo-700">
            {item.invoiceNumber || "—"}
          </span>
          {(item.billingSnapshotNumber || item.snapshotNumber) && (
            <div className="text-xs font-mono text-slate-400">
              {item.billingSnapshotNumber || item.snapshotNumber}
            </div>
          )}
        </div>
      ),
      client: (
        <span className="font-semibold text-slate-800">
          {item.clientName || "—"}
        </span>
      ),
      project: (
        <div className="text-left">
          <div className="font-bold text-slate-900">
            {item.projectName || "—"}
          </div>
        </div>
      ),
      billingPeriod: (
        <span className="font-medium text-slate-700">
          {item.billingPeriod || "—"}
        </span>
      ),
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
        <StatusBadge
          label={item.status || item.invoiceStatus || "PENDING_APPROVAL"}
          size="sm"
        />
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
          <span className="font-semibold text-slate-800">
            {item.lastAction || "—"}
          </span>
          {item.lastActionAt && (
            <div className="text-[11px] text-slate-400">
              {formatDisplayDateTime(item.lastActionAt)}
            </div>
          )}
        </div>
      ),
      action: isPending ? (
        <Button
          size="sm"
          variant="primary"
          onClick={(e) => {
            e.stopPropagation();
            handleReviewInvoice(item);
          }}
          className="bg-[#0A0082] hover:bg-[#0A0082]/90 text-white text-xs font-semibold"
        >
          <Eye className="mr-1.5 h-3.5 w-3.5" />
          Review Invoice
        </Button>
      ) : (
        <Button
          size="sm"
          variant="outline"
          onClick={(e) => {
            e.stopPropagation();
            handleReviewInvoice(item);
          }}
          className="text-xs text-indigo-700 border-indigo-200 hover:bg-indigo-50 font-semibold"
        >
          <Eye className="mr-1.5 h-3.5 w-3.5" />
          View Invoice
        </Button>
      ),
    };
  });

  return (
    <div className="w-full space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Invoice Approval"
        subtitle="Review, approve, and track invoices through the invoice approval lifecycle."
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadData(true)}
            disabled={refreshing}
          >
            <RefreshCw
              className={`mr-1.5 h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        }
      />

      {/* Persistent KPI Section */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {/* 1. Total Invoices */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-600">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Total Invoices
            </span>
            <FileText className="h-4 w-4 text-slate-500" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900">
            {kpis.totalInvoices}
          </div>
        </div>

        {/* 2. Pending Approval */}
        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 shadow-sm">
          <div className="flex items-center justify-between text-amber-700">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Pending Approval
            </span>
            <Clock className="h-4 w-4 text-amber-600" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-amber-900">
            {kpis.pendingApproval}
          </div>
        </div>

        {/* 3. Approved */}
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-sm">
          <div className="flex items-center justify-between text-emerald-700">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Approved
            </span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-emerald-900">
            {kpis.approved}
          </div>
        </div>

        {/* 4. Rejected */}
        <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-4 shadow-sm">
          <div className="flex items-center justify-between text-rose-700">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Rejected
            </span>
            <XCircle className="h-4 w-4 text-rose-600" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-rose-900">
            {kpis.rejected}
          </div>
        </div>

        {/* 5. Total Approval Value */}
        <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-4 shadow-sm col-span-2 sm:col-span-1 lg:col-span-1">
          <div className="flex items-center justify-between text-indigo-700">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Total Approval Value
            </span>
            <DollarSign className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-indigo-950 font-mono">
            {formatCurrency(kpis.totalApprovalValue, kpis.currency)}
          </div>
        </div>
      </div>

      {/* Controls & Dashboard Table */}
      <PageCard>
        <PageCardContent className="space-y-4 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by invoice number, project, client, or snapshot..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-slate-200 pl-9 pr-4 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                <Filter className="h-3.5 w-3.5" /> Status:
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="PENDING_APPROVAL">Pending Approval</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
          </div>

          <ARTable
            headers={tableHeaders}
            columns={tableColumns}
            rows={tableRows}
            emptyMessage="No matching invoices found for the selected criteria."
          />
        </PageCardContent>
      </PageCard>
    </div>
  );
}
