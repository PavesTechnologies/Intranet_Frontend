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
import Pagination from "../../../components/Pagination/pagination";
import ConfirmationModal from "../../../components/confirmation_modal/ConfirmationModal";
import { showStatusToast } from "../../../components/toastfy/toast";
import ARTable from "../components/common/ARTable";
import ActionMenu from "../components/common/ActionMenu";

import { formatCurrency, formatDisplayDate } from "../utils/format";
import {
  getInvoices,
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

export default function InvoiceGeneration() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const [invoices, setInvoices] = useState([]);
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
    }

    if (type === "GENERATED") {
      setStatusFilter("GENERATED");
    }
  };

  // Route forwarder: if snapshotId is provided as a query parameter or state,
  // forward to the dedicated workflow
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
      const { invoices: fetchedInvoices, summary } = await getInvoices();

      setInvoices(fetchedInvoices || []);
      setBackendSummary(summary || null);

      // Re-sync demo delivery map on each data refresh
      setDemoDeliveryMap(loadDemoDeliveryMap());

      if (isManualRefresh) {
        showStatusToast(
          "Invoice generation queue refreshed.",
          "success"
        );
      }
    } catch (err) {
      console.error("[InvoiceGeneration] Error loading invoices:", err);

      const message = getInvoiceErrorMessage(
        err,
        "Failed to load invoices."
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

  const handleViewInvoice = (inv) => {
    const targetId =
      inv.billingSnapshotId ||
      inv.snapshotId ||
      inv.invoiceId;

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
        totalInvoices:
          backendSummary.totalInvoices ?? invoices.length,

        generatedInvoices:
          backendSummary.generatedInvoices ??
          invoices.filter(
            (i) =>
              (i.invoiceStatus || "").toUpperCase() ===
              "GENERATED"
          ).length,

        totalInvoicedAmount:
          backendSummary.totalInvoicedAmount ?? 0,

        currency: invoices[0]?.currency || "USD",
      };
    }

    const totalInvoices = invoices.length;

    const generatedInvoices = invoices.filter(
      (i) =>
        (i.invoiceStatus || "").toUpperCase() ===
        "GENERATED"
    ).length;

    const totalInvoicedAmount = invoices.reduce(
      (sum, inv) =>
        sum + (Number(inv.grandTotal) || 0),
      0
    );

    const primaryCurrency =
      invoices[0]?.currency || "USD";

    return {
      totalInvoices,
      generatedInvoices,
      totalInvoicedAmount,
      currency: primaryCurrency,
    };
  }, [invoices, backendSummary]);

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
    "Invoice Number",
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
    billingPeriod: "center",
    invoiceDate: "center",
    dueDate: "center",
    currency: "center",
    grandTotal: "right",
    status: "center",
    actions: "center",
  };

  const tableRows = paginatedInvoices.map((item) => {
    const st = (item.invoiceStatus || "").toUpperCase();

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
        <div className="text-left font-semibold text-slate-800">
          {item.clientName || "Account Management"}
        </div>
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
            item.grandTotal || 0,
            item.currency || "USD"
          )}
        </div>
      ),

      status: (
        <div className="flex flex-col items-center justify-center gap-1">
          <StatusBadge
            label={item.invoiceStatus || "GENERATED"}
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
                label: "View Invoice",
                icon: <Eye className="h-4 w-4 text-slate-600" />,
                onClick: () => handleViewInvoice(item),
              },

              {
                label: "Submit for Approval",
                icon: <CheckCircle2 className="h-4 w-4 text-indigo-600" />,
                hidden: st !== "GENERATED",
                onClick: () => setSubmitTarget(item),
              },

              {
                label: isSent
                  ? "Resend to Client"
                  : "Send to Client",
                icon: <MailCheck className="h-4 w-4 text-emerald-600" />,
                hidden: st !== "APPROVED",
                onClick: () => {
                  setSendTarget(item);
                },
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
        subtitle="Workspace containing generated invoices created from completed tax calculations."
        action={
          <Button
            variant="outline"
            size="sm"
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
            size="sm"
            variant="outline"
            onClick={() => loadData(true)}
            className="text-xs bg-white text-rose-700 border-rose-300 hover:bg-rose-50 font-semibold shrink-0"
          >
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Retry
          </Button>
        </div>
      )}

      {/* KPI Section */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Total Invoices */}
        <button
          type="button"
          onClick={() => handleKpiClick("TOTAL")}
          className="text-left rounded-xl transition-transform active:scale-[0.99] focus:outline-none"
        >
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:shadow-md cursor-pointer">
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
        </button>

        {/* Generated Invoices */}
        <button
          type="button"
          onClick={() => handleKpiClick("GENERATED")}
          className="text-left rounded-xl transition-transform active:scale-[0.99] focus:outline-none"
        >
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-sm transition-all hover:shadow-md cursor-pointer">
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
        </button>

        {/* Total Invoiced Amount */}
        <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-4 shadow-sm">
          <div className="flex items-center justify-between text-indigo-700">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-700">
              Total Invoiced Amount
            </span>

            <DollarSign className="h-4 w-4 text-indigo-600" />
          </div>

          <div className="mt-2 text-2xl font-extrabold text-indigo-950 font-mono">
            {formatCurrency(
              kpis.totalInvoicedAmount,
              kpis.currency
            )}
          </div>
        </div>
      </div>

      {/* Controls & Invoice Queue Table */}
      <PageCard>
        <PageCardContent className="space-y-4 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />

              <input
                type="text"
                placeholder="Search by invoice number, project, client, or snapshot..."
                value={searchQuery}
                onChange={(e) =>
                  setSearchQuery(e.target.value)
                }
                className="w-full rounded-lg border border-slate-200 pl-9 pr-4 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                <Filter className="h-3.5 w-3.5" />
                Status:
              </div>

              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value)
                }
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="ALL">
                  All Statuses
                </option>

                <option value="GENERATED">
                  Invoice Generated
                </option>

                <option value="PENDING_APPROVAL">
                  Pending Approval
                </option>

                <option value="APPROVED">
                  Approved
                </option>

                <option value="REJECTED">
                  Rejected
                </option>
              </select>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-3 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800">
                Invoice Queue
              </h3>

              <span className="text-xs text-slate-400 font-medium">
                {filteredInvoices.length}{" "}
                {filteredInvoices.length === 1
                  ? "Invoice"
                  : "Invoices"}
              </span>
            </div>

            <ARTable
              headers={tableHeaders}
              columns={tableColumns}
              rows={tableRows}
              alignments={tableAlignments}
              emptyMessage={
                searchQuery ||
                statusFilter !== "ALL"
                  ? "No invoices match your search or filter."
                  : "No invoices generated yet"
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
        </PageCardContent>
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