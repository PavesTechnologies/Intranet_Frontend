import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import {
  FileText,
  RefreshCw,
  Search,
  CheckCircle2,
  Layers,
  DollarSign,
  Filter,
  Eye,
  AlertCircle,
  MailCheck,
} from "lucide-react";

import PageHeader from "../../../components/ui/PageHeader";
import { PageCard, PageCardContent } from "../../../components/Cards/PageCard";
import Button from "../../../components/Button/Button";
import Loader from "../../../components/ui/Loader";
import StatusBadge from "../../../components/status/statusbadge";
import { showStatusToast } from "../../../components/toastfy/toast";
import ARTable from "../components/common/ARTable";
import { formatCurrency, formatDisplayDate } from "../utils/format";
import {
  getInvoices,
  getInvoiceErrorMessage,
} from "../services/invoiceService";
import { loadDemoDeliveryMap, DEMO_DELIVERY_STATUS } from "../utils/invoiceDemoData";

export default function InvoiceGeneration() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const [invoices, setInvoices] = useState([]);
  const [backendSummary, setBackendSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Demo delivery map: invoiceId → { deliveryStatus, sentAt, sentBy }
  // Loaded from localStorage on mount and after each refresh
  const [demoDeliveryMap, setDemoDeliveryMap] = useState(() => loadDemoDeliveryMap());

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Route forwarder: if snapshotId is provided as a query parameter or state, forward to the dedicated workflow
  const targetSnapshotId = searchParams.get("snapshotId") || location.state?.snapshotId || null;

  useEffect(() => {
    if (targetSnapshotId) {
      navigate(`/account-receivable/invoice-generation/${targetSnapshotId}`, {
        replace: true,
        state: { from: "invoice-generation", source: "invoice-generation" },
      });
    }
  }, [targetSnapshotId, navigate]);

  const loadData = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    setLoading(true);
    setError(null);

    try {
      const { invoices: fetchedInvoices, summary } = await getInvoices();
      setInvoices(fetchedInvoices || []);
      setBackendSummary(summary || null);
      // Re-sync demo delivery map on each data refresh
      setDemoDeliveryMap(loadDemoDeliveryMap());

      if (isManualRefresh) {
        showStatusToast("Invoice generation queue refreshed.", "success");
      }
    } catch (err) {
      console.error("[InvoiceGeneration] Error loading invoices:", err);
      const message = getInvoiceErrorMessage(err, "Failed to load invoices.");
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

  const handleViewInvoice = (inv) => {
    const targetId = inv.billingSnapshotId || inv.snapshotId || inv.invoiceId;
    if (!targetId) {
      showStatusToast("Identifier is missing for this invoice.", "error");
      return;
    }
    navigate(`/account-receivable/invoices/${targetId}`, {
      state: { from: "invoice-generation", source: "invoice-generation" },
    });
  };

  // Filtered invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const st = (inv.invoiceStatus || "").toUpperCase();

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
        const snapNum = (inv.snapshotNumber || "").toLowerCase();

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

  // Invoice KPIs
  const kpis = useMemo(() => {
    if (backendSummary) {
      return {
        totalInvoices: backendSummary.totalInvoices ?? invoices.length,
        generatedInvoices:
          backendSummary.generatedInvoices ??
          invoices.filter((i) => (i.invoiceStatus || "").toUpperCase() === "GENERATED").length,
        totalInvoicedAmount: backendSummary.totalInvoicedAmount ?? 0,
        currency: invoices[0]?.currency || "USD",
      };
    }

    const totalInvoices = invoices.length;
    const generatedInvoices = invoices.filter(
      (i) => (i.invoiceStatus || "").toUpperCase() === "GENERATED"
    ).length;

    const totalInvoicedAmount = invoices.reduce(
      (sum, inv) => sum + (Number(inv.grandTotal) || 0),
      0
    );

    const primaryCurrency = invoices[0]?.currency || "USD";

    return {
      totalInvoices,
      generatedInvoices,
      totalInvoicedAmount,
      currency: primaryCurrency,
    };
  }, [invoices, backendSummary]);

  // If redirecting to dedicated workflow
  if (targetSnapshotId) {
    return (
      <div className="flex h-80 items-center justify-center">
        <Loader size="lg" text="Loading invoice..." />
      </div>
    );
  }

  if (loading && !refreshing) {
    return (
      <div className="flex h-80 items-center justify-center">
        <Loader size="lg" text="Loading Invoice Generation Workspace..." />
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
    "Currency",
    "Grand Total",
    "Status",
    "Action",
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
    "action",
  ];

  const tableRows = filteredInvoices.map((item) => {
    return {
      onRowClick: () => handleViewInvoice(item),
      invoiceNumber: (
        <div className="text-left">
          <span className="font-mono font-bold text-indigo-700">
            {item.invoiceNumber || "—"}
          </span>
          {item.snapshotNumber && (
            <div className="text-xs font-mono text-slate-400">
              {item.snapshotNumber}
            </div>
          )}
        </div>
      ),
      client: (
        <span className="font-semibold text-slate-800">
          {item.clientName || "Account Management"}
        </span>
      ),
      project: (
        <div className="text-left">
          <div className="font-bold text-slate-900">
            {item.projectName || "Website Redesign"}
          </div>
          {item.projectCode && (
            <div className="text-xs font-mono text-slate-400">
              {item.projectCode}
            </div>
          )}
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
      currency: (
        <span className="font-semibold text-slate-700">
          {item.currency || "USD"}
        </span>
      ),
      grandTotal: (
        <span className="font-mono font-bold text-slate-900">
          {formatCurrency(item.grandTotal || 0, item.currency || "USD")}
        </span>
      ),
      status: (
        <div className="flex flex-col items-start gap-1">
          <StatusBadge
            label={item.invoiceStatus || "GENERATED"}
            size="sm"
          />
          {(item.invoiceStatus || "").toUpperCase() === "REJECTED" && (
            <span
              className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                item.correctionRequired
                  ? "bg-rose-50 text-rose-700 border-rose-200"
                  : "bg-emerald-50 text-emerald-700 border-emerald-200"
              }`}
            >
              {item.correctionRequired ? "Correction Required" : "Ready to Resubmit"}
            </span>
          )}
        </div>
      ),
      action: (() => {
        const st = (item.invoiceStatus || "").toUpperCase();
        const iid = item.invoiceId || item.billingSnapshotId || item.snapshotId;
        const delivery = demoDeliveryMap[iid] || { deliveryStatus: DEMO_DELIVERY_STATUS.NOT_SENT };
        const isSent = delivery.deliveryStatus === DEMO_DELIVERY_STATUS.SENT_TO_CLIENT;

        if (st === "GENERATED") {
          return (
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => { e.stopPropagation(); handleViewInvoice(item); }}
              className="text-xs text-indigo-700 border-indigo-200 hover:bg-indigo-50 font-semibold"
            >
              <Eye className="mr-1.5 h-3.5 w-3.5" />
              Submit for Approval
            </Button>
          );
        }

        if (st === "PENDING_APPROVAL") {
          return (
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => { e.stopPropagation(); handleViewInvoice(item); }}
              className="text-xs text-slate-600 border-slate-200 hover:bg-slate-50 font-semibold"
            >
              <Eye className="mr-1.5 h-3.5 w-3.5" />
              Awaiting Approval
            </Button>
          );
        }

        if (st === "APPROVED") {
          return (
            <div className="flex flex-col items-start gap-1">
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => { e.stopPropagation(); handleViewInvoice(item); }}
                className={`text-xs font-semibold ${
                  isSent
                    ? "border-teal-200 text-teal-700 hover:bg-teal-50"
                    : "border-teal-300 text-teal-700 hover:bg-teal-50"
                }`}
              >
                <MailCheck className="mr-1.5 h-3.5 w-3.5" />
                {isSent ? "Sent to Client" : "Send to Client"}
              </Button>
              {isSent && (
                <span className="text-[10px] text-teal-600 italic pl-0.5">Demo sent</span>
              )}
            </div>
          );
        }

        if (st === "REJECTED") {
          return (
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => { e.stopPropagation(); handleViewInvoice(item); }}
              className="text-xs text-rose-700 border-rose-300 hover:bg-rose-50 font-semibold"
            >
              <Eye className="mr-1.5 h-3.5 w-3.5" />
              Review Rejection
            </Button>
          );
        }

        return (
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => { e.stopPropagation(); handleViewInvoice(item); }}
            className="text-xs text-indigo-700 border-indigo-200 hover:bg-indigo-50 font-semibold"
          >
            <Eye className="mr-1.5 h-3.5 w-3.5" />
            View Invoice
          </Button>
        );
      })(),
    };
  });

  return (
    <div className="w-full space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Invoice Generation"
        subtitle="Workspace containing generated invoices created from completed tax calculations."
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

      {/* Inline Error Notice if data fetch failed */}
      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 shadow-sm">
          <AlertCircle className="h-5 w-5 flex-shrink-0 text-rose-600 mt-0.5" />
          <div className="flex-1 space-y-1">
            <div className="font-bold text-rose-900">Failed to Load Invoices</div>
            <div>{error}</div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => loadData(true)}
            className="text-xs bg-white text-rose-700 border-rose-300 hover:bg-rose-50 font-semibold shrink-0"
          >
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Retry
          </Button>
        </div>
      )}

      {/* KPI Section - Always visible */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Total Invoices
            </span>
            <Layers className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900">
            {kpis.totalInvoices}
          </div>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-sm">
          <div className="flex items-center justify-between text-emerald-700">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
              Generated Invoices
            </span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-emerald-900">
            {kpis.generatedInvoices}
          </div>
        </div>

        <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-4 shadow-sm">
          <div className="flex items-center justify-between text-indigo-700">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-700">
              Total Invoiced Amount
            </span>
            <DollarSign className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-indigo-950 font-mono">
            {formatCurrency(kpis.totalInvoicedAmount, kpis.currency)}
          </div>
        </div>
      </div>

      {/* Controls & Invoice Queue Table - Always visible */}
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
                <option value="GENERATED">Invoice Generated</option>
                <option value="PENDING_APPROVAL">Pending Approval</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-3 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800">Invoice Queue</h3>
              <span className="text-xs text-slate-400 font-medium">
                {filteredInvoices.length} {filteredInvoices.length === 1 ? "Invoice" : "Invoices"}
              </span>
            </div>

            <ARTable
              headers={tableHeaders}
              columns={tableColumns}
              rows={tableRows}
              emptyMessage={
                searchQuery || statusFilter !== "ALL"
                  ? "No invoices match your search or filter."
                  : "No invoices generated yet"
              }
            />
          </div>
        </PageCardContent>
      </PageCard>
    </div>
  );
}
