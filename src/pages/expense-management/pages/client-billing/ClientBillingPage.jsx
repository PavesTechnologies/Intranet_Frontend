import React, { useMemo, useState } from "react";
import { AlertTriangle, Inbox, FileCheck2, Receipt, Building2, RotateCcw, Send, Wallet, BadgeCheck } from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb/Breadcrumb";
import PageHeader from "@/components/ui/PageHeader";
import FilterCard from "@/components/ui/FilterCard";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StatCard from "@/components/Cards/StatCard";
import Button from "@/components/Button/Button";
import LoadingSpinner from "@/components/LoadingSpinner";
import GenericTable from "@/components/Table/table";
import SearchInput from "@/components/filter/Searchbar";
import Modal from "@/components/Modal/modal";
import FormInput from "@/components/forms/FormInput";
import { showStatusToast } from "@/components/toastfy/toast";
import PolicyEmptyState from "@/pages/expense-management/components/policy/common/PolicyEmptyState";
import SelectableStatCard from "@/pages/expense-management/components/common/SelectableStatCard";
import { DEFAULT_PAGE_SIZE } from "@/pages/expense-management/components/common/pagination";
import EmployeeLabel from "@/pages/expense-management/approval-engine/components/EmployeeLabel";
import { formatMoney, formatDate, formatDateTime } from "@/pages/expense-management/approval-engine/constants/approvalLabels";
import { useEligibleExpenses, useHandedOff, useHandoffSummary, useMarkHandedOff, useRedeliverToAr } from "./hooks/useInvoiceHandoff";
import Pagination from "@/components/Pagination/pagination";

const unknownClientKey = "__none__";

const projectLabel = (item) => (item.projectCode ? `${item.projectCode} — ${item.projectName}` : "—");

/** Whether a handoff has reached AR's queue. No status = handed off before XMS sent to AR (AR pulled it). */
function ArDeliveryStatus({ item }) {
  const status = item.arDeliveryStatus;
  if (status === "SENT") {
    return (
      <span className="leading-tight">
        <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">Sent to AR</span>
        {item.arDeliveredAt && <span className="block text-[11px] text-gray-400">{formatDateTime(item.arDeliveredAt)}</span>}
      </span>
    );
  }
  if (status === "FAILED") {
    return (
      <span className="leading-tight">
        <span className="inline-flex rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-700">Not delivered</span>
        <span className="block text-[11px] text-gray-500">
          {item.arDeliveryAttempts} attempt{item.arDeliveryAttempts === 1 ? "" : "s"} · retried automatically
        </span>
        {item.arDeliveryError && (
          <span className="block max-w-[220px] truncate text-[11px] text-rose-600" title={item.arDeliveryError}>
            {item.arDeliveryError}
          </span>
        )}
      </span>
    );
  }
  if (status === "PENDING") {
    return <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">Sending…</span>;
  }
  return <span className="text-[11px] text-gray-400">Fetched by AR</span>;
}

/** Ready expenses grouped by client — AR invoices per client; project is optional per expense. */
function groupByClient(items) {
  const groups = new Map();
  items.forEach((item) => {
    const key = item.resolvedClientId || unknownClientKey;
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        clientName: item.resolvedClientName,
        currency: item.baseCurrencyCode,
        total: 0,
        items: [],
      });
    }
    const g = groups.get(key);
    g.items.push(item);
    // Clients are billed the cost basis (gross less recoverable input tax); AR adds output tax.
    g.total += Number(item.costBasis ?? item.baseAmount) || 0;
  });
  return [...groups.values()];
}

/**
 * Client Billing - hand finance-verified, client-billable expenses to the invoicing team so the
 * client can be billed (Ready to hand off), and see what's already been handed off (Handed off).
 * Independent of employee reimbursement, which AP Payments handles.
 */
export default function ClientBillingPage() {
  const [tab, setTab] = useState("ready");
  const [readyPage, setReadyPage] = useState(0);
  const [historyPage, setHistoryPage] = useState(0);
  const readySize = DEFAULT_PAGE_SIZE;
  const historySize = DEFAULT_PAGE_SIZE;
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Handoff modal: `target` is the expense; `reprocess` is set when handing off again from history.
  const [target, setTarget] = useState(null);
  const [invoiceReference, setInvoiceReference] = useState("");
  const [reprocess, setReprocess] = useState(false);
  const [reprocessReason, setReprocessReason] = useState("");
  const [duplicateNotice, setDuplicateNotice] = useState("");

  const filters = useMemo(
    () => ({ startDate: startDate || undefined, endDate: endDate || undefined }),
    [startDate, endDate]
  );

  const summaryQuery = useHandoffSummary();
  const readyQuery = useEligibleExpenses(filters, readyPage, readySize);
  const historyQuery = useHandedOff(historyPage, historySize);
  const markHandedOff = useMarkHandedOff();
  const redeliverToAr = useRedeliverToAr();
  const [resendingId, setResendingId] = useState(null);

  const resendToAr = async (item) => {
    setResendingId(item.syncId);
    try {
      const result = await redeliverToAr.mutateAsync(item.syncId);
      if (result?.arDeliveryStatus === "SENT") {
        showStatusToast(`Sent to AR: ${item.reportNumber}`, "success");
      } else {
        showStatusToast(`Still couldn't reach AR: ${result?.arDeliveryError || "unknown error"}`, "error");
      }
    } catch (err) {
      showStatusToast(err.response?.data?.message || err.message || "Failed to resend to AR.", "error");
    } finally {
      setResendingId(null);
    }
  };

  const summary = summaryQuery.data;
  const matches = (item) => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return [item.reportNumber, item.employeeId, item.resolvedClientName, item.projectName, item.projectCode, item.categoryName, item.description]
      .some((v) => String(v || "").toLowerCase().includes(q));
  };

  const readyItems = readyQuery.data?.content || [];
  const readyGroups = groupByClient(readyItems.filter(matches));
  const historyAll = historyQuery.data?.content || [];
  const historyItems = historyAll.filter(matches);

  const openHandoff = (item, { again = false } = {}) => {
    setTarget(item);
    setInvoiceReference(again ? item.invoiceReference || "" : "");
    setReprocess(again);
    setReprocessReason("");
    setDuplicateNotice("");
  };
  const closeHandoff = () => {
    if (!markHandedOff.isPending) setTarget(null);
  };

  const submitHandoff = async () => {
    if (!target) return;
    if (reprocess && !reprocessReason.trim()) {
      showStatusToast("Please give a reason for handing this expense off again.", "error");
      return;
    }
    try {
      await markHandedOff.mutateAsync({
        lineItemId: target.lineItemId,
        payload: {
          invoiceReference: invoiceReference.trim() || null,
          allowReprocess: reprocess || null,
          reason: reprocess ? reprocessReason.trim() : null,
        },
      });
      showStatusToast(`Handed off to invoicing: ${target.reportNumber}`, "success");
      setTarget(null);
    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.message || err.message || "Failed to hand off this expense.";
      if (status === 409 && !reprocess) {
        // Someone else already handed it off — offer the explicit "again" path instead of a dead end.
        setDuplicateNotice(msg);
      } else {
        showStatusToast(msg, "error");
      }
    }
  };

  const switchTab = (next) => {
    setTab(next);
    setSearchTerm("");
  };

  const activeQuery = tab === "ready" ? readyQuery : historyQuery;

  const readyRows = (items) =>
    items.map((item) => ({
      date: formatDate(item.expenseDate),
      project: <span className="text-xs text-gray-700">{projectLabel(item)}</span>,
      employee: <EmployeeLabel employeeId={item.employeeId} />,
      expense: (
        <div className="leading-tight text-left">
          <span className="text-xs font-medium text-gray-800">{item.categoryName || "—"}</span>
          {item.description && <span className="block max-w-[260px] truncate text-[11px] text-gray-500">{item.description}</span>}
        </div>
      ),
      report: <span className="font-mono text-xs text-gray-600">{item.reportNumber}</span>,
      amount: (
        <div className="leading-tight text-right">
          <span className="font-mono font-semibold text-gray-900">
            {formatMoney(item.costBasis ?? item.baseAmount, item.baseCurrencyCode)}
          </span>
          {item.costBasis != null && Number(item.costBasis) !== Number(item.baseAmount) && (
            <span className="block text-[11px] text-gray-400">
              gross {formatMoney(item.baseAmount, item.baseCurrencyCode)} · ITC {formatMoney(item.recoverableTaxAmount, item.baseCurrencyCode)}
            </span>
          )}
          {item.taxCode && <span className="block text-[11px] text-gray-400">input tax {item.taxCode}</span>}
        </div>
      ),
      receipts: (
        <span className="inline-flex items-center gap-1 text-xs text-gray-500">
          <Receipt size={13} /> {item.receiptCount}
        </span>
      ),
      action: (
        <Button size="small" variant="primary" onClick={() => openHandoff(item)}>
          <FileCheck2 size={13} className="mr-1" /> Hand off
        </Button>
      ),
    }));

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <Breadcrumb items={[{ label: "Expense Management", to: "/expense-management/dashboard" }, { label: "Client Billing" }]} />

      <PageHeader
        title="Client Billing"
        subtitle="Expenses employees incurred for a client project. Once Finance has verified them, hand them to the invoicing team so the client can be billed."
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SelectableStatCard
          title="Ready to hand off"
          value={summary ? summary.readyCount : "—"}
          subtitle="Expenses waiting"
          icon={Send}
          textColor="text-indigo-700"
          active={tab === "ready"}
          onClick={() => switchTab("ready")}
        />
        <StatCard
          title="Amount ready"
          value={summary ? formatMoney(summary.readyBaseAmount, summary.baseCurrencyCode) : "—"}
          subtitle="To be billed"
          icon={Wallet}
          textColor="text-indigo-700"
        />
        <StatCard
          title="Clients waiting"
          value={summary ? summary.readyClientCount : "—"}
          subtitle="With ready expenses"
          icon={Building2}
        />
        <SelectableStatCard
          title="Handed off"
          value={summary ? summary.handedOffCount : "—"}
          subtitle="All time"
          icon={BadgeCheck}
          textColor="text-emerald-700"
          active={tab === "history"}
          onClick={() => switchTab("history")}
        />
      </div>

      {summary?.arDeliveryFailedCount > 0 && (
        <div className="flex flex-col gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800 sm:flex-row sm:items-center sm:justify-between">
          <span className="flex items-start gap-2">
            <AlertTriangle size={15} className="mt-0.5 shrink-0" />
            {summary.arDeliveryFailedCount} handed-off expense{summary.arDeliveryFailedCount === 1 ? " hasn't" : "s haven't"} reached
            AR yet. XMS retries automatically every few minutes; you can also resend from the Handed off tab.
          </span>
          {tab !== "history" && (
            <Button size="small" variant="outline" onClick={() => switchTab("history")}>
              View handoffs
            </Button>
          )}
        </div>
      )}

      <Tabs value={tab} onValueChange={switchTab}>
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="ready">
            Ready to hand off
            <span className="ml-1.5 text-xs text-slate-400">({summary?.readyCount ?? 0})</span>
          </TabsTrigger>
          <TabsTrigger value="history">
            Handed off
            <span className="ml-1.5 text-xs text-slate-400">({summary?.handedOffCount ?? 0})</span>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <FilterCard
        title="Search & filters"
        description={tab === "ready" ? "Search filters the current page; the dates filter the whole list." : "Filters the handoffs on the current page."}
      >
        <div className="w-full sm:max-w-sm">
          <SearchInput value={searchTerm} onSearch={(val) => setSearchTerm(val || "")} placeholder="Report, employee, project, category..." />
        </div>
        {tab === "ready" && (
          <>
            <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
              From
              <input
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setReadyPage(0); }}
                className="h-9 rounded-lg border border-gray-300 px-2.5 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </label>
            <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
              To
              <input
                type="date"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setReadyPage(0); }}
                className="h-9 rounded-lg border border-gray-300 px-2.5 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </label>
            {(startDate || endDate) && (
              <Button size="small" variant="outline" onClick={() => { setStartDate(""); setEndDate(""); setReadyPage(0); }}>
                Clear dates
              </Button>
            )}
          </>
        )}
      </FilterCard>

      {activeQuery.isError ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 py-10 text-center px-4">
          <AlertTriangle className="h-6 w-6 text-rose-500" />
          <p className="text-sm font-semibold text-rose-700">Couldn't load this list.</p>
          <p className="text-xs text-rose-500 max-w-md">
            {activeQuery.error?.response?.data?.message || activeQuery.error?.message || "Please check your connection and try again."}
          </p>
          <Button size="small" variant="outline" className="mt-2" onClick={() => activeQuery.refetch()}>
            Retry
          </Button>
        </div>
      ) : activeQuery.isLoading ? (
        <div className="flex items-center justify-center rounded-xl border border-gray-200 bg-white py-16">
          <LoadingSpinner text="Loading…" />
        </div>
      ) : tab === "ready" ? (
        <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
          {readyItems.length === 0 ? (
            <PolicyEmptyState
              icon={<Inbox className="h-10 w-10" />}
              title="Nothing waiting to be handed off."
              description="Client-billable expenses show up here as soon as Finance verifies them."
            />
          ) : readyGroups.length === 0 ? (
            <PolicyEmptyState icon={<Inbox className="h-10 w-10" />} title="No expenses match the search." />
          ) : (
            <div className="space-y-4">
              {readyGroups.map((g) => (
                <section key={g.key}>
                  <div className="mb-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-2">
                      <Building2 size={15} className="shrink-0 text-indigo-500" />
                      <span className="truncate text-sm font-semibold text-slate-800">
                        {g.key === unknownClientKey ? "No client" : g.clientName || "Unnamed client"}
                      </span>
                    </div>
                    <span className="text-xs text-slate-500">
                      {g.items.length} expense{g.items.length === 1 ? "" : "s"} ·{" "}
                      <span className="font-mono font-semibold text-slate-800">{formatMoney(g.total, g.currency)}</span>
                    </span>
                  </div>
                  <div className="w-full overflow-x-auto">
                    <GenericTable
                      headers={["Date", "Project", "Employee", "Expense", "Report", "Cost basis", "Receipts", "Action"]}
                      columns={["date", "project", "employee", "expense", "report", "amount", "receipts", "action"]}
                      rows={readyRows(g.items)}
                    />
                  </div>
                </section>
              ))}
            </div>
          )}
          <div className="mt-4 flex justify-center">
            <Pagination
              currentPage={readyPage + 1}
              totalPages={readyQuery.data?.totalPages ?? 0}
              onPrevious={() => setReadyPage(Math.max(readyPage - 1, 0))}
              onNext={() => setReadyPage(Math.min(readyPage + 1, (readyQuery.data?.totalPages ?? 0) - 1))}
            />
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
          {historyAll.length === 0 ? (
            <PolicyEmptyState
              icon={<Inbox className="h-10 w-10" />}
              title="Nothing handed off yet."
              description="Expenses you hand off from the Ready tab are listed here with their invoice reference."
            />
          ) : historyItems.length === 0 ? (
            <PolicyEmptyState icon={<Inbox className="h-10 w-10" />} title="No expenses match the search." />
          ) : (
            <div className="w-full overflow-x-auto">
              <GenericTable
                headers={["Handed off", "Client", "Project", "Employee", "Expense", "Report", "Amount", "Invoice ref.", "AR delivery", "Action"]}
                columns={["handedOffAt", "client", "project", "employee", "expense", "report", "amount", "invoiceReference", "arDelivery", "action"]}
                rows={historyItems.map((item) => ({
                  handedOffAt: <span className="whitespace-nowrap text-xs text-gray-600">{formatDateTime(item.handedOffAt)}</span>,
                  client: item.resolvedClientName || "—",
                  project: projectLabel(item),
                  employee: <EmployeeLabel employeeId={item.employeeId} />,
                  expense: (
                    <div className="leading-tight">
                      <span className="text-xs font-medium text-gray-800">{item.categoryName || "—"}</span>
                      <span className="block text-[11px] text-gray-400">{formatDate(item.expenseDate)}</span>
                      {item.remarks && <span className="block text-[11px] text-amber-700">{item.remarks}</span>}
                    </div>
                  ),
                  report: <span className="font-mono text-xs text-gray-600">{item.reportNumber}</span>,
                  amount: <span className="font-mono font-semibold text-gray-900">{formatMoney(item.baseAmount, item.baseCurrencyCode)}</span>,
                  invoiceReference: item.invoiceReference ? (
                    <span className="font-mono text-xs text-gray-800">{item.invoiceReference}</span>
                  ) : (
                    <span className="text-xs text-gray-400">Not given</span>
                  ),
                  arDelivery: <ArDeliveryStatus item={item} />,
                  action: (
                    <div className="flex flex-col items-stretch gap-1.5">
                      {item.arDeliveryStatus !== "SENT" && (
                        <Button
                          size="small"
                          variant="primary"
                          onClick={() => resendToAr(item)}
                          loading={resendingId === item.syncId}
                          loadingText="Sending..."
                          disabled={resendingId !== null}
                        >
                          <Send size={13} className="mr-1" /> Resend to AR
                        </Button>
                      )}
                      <Button size="small" variant="outline" onClick={() => openHandoff(item, { again: true })}>
                        <RotateCcw size={13} className="mr-1" /> Hand off again
                      </Button>
                    </div>
                  ),
                }))}
              />
            </div>
          )}
          <div className="mt-4 flex justify-center">
            <Pagination
              currentPage={historyPage + 1}
              totalPages={historyQuery.data?.totalPages ?? 0}
              onPrevious={() => setHistoryPage(Math.max(historyPage - 1, 0))}
              onNext={() => setHistoryPage(Math.min(historyPage + 1, (historyQuery.data?.totalPages ?? 0) - 1))}
            />
          </div>
        </div>
      )}

      {target && (
        <Modal
          isOpen={!!target}
          onClose={closeHandoff}
          title={reprocess ? "Hand off again" : "Hand off to invoicing"}
          subtitle={`${target.reportNumber} · ${target.resolvedClientName || "No client"}${target.projectCode ? ` · ${target.projectCode} — ${target.projectName}` : ""}`}
          size="md"
          footer={
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={closeHandoff} disabled={markHandedOff.isPending}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={submitHandoff}
                loading={markHandedOff.isPending}
                loadingText="Handing off..."
                disabled={reprocess && !reprocessReason.trim()}
              >
                Confirm handoff
              </Button>
            </div>
          }
        >
          <div className="space-y-3">
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600">
              <div className="flex justify-between gap-3">
                <span>{target.categoryName || "Expense"} · {formatDate(target.expenseDate)}</span>
                <span className="font-mono font-semibold text-gray-900">{formatMoney(target.baseAmount, target.baseCurrencyCode)}</span>
              </div>
              <p className="mt-1.5 text-[11px] text-gray-500">
                This records that the invoicing team now has this expense to bill the client, and sends it to AR. It doesn't pay the employee or send anything to the client.
              </p>
            </div>

            <FormInput
              label="Invoice reference (optional)"
              name="invoiceReference"
              value={invoiceReference}
              onChange={(e) => setInvoiceReference(e.target.value)}
              placeholder="e.g. INV-2026-00142"
              disabled={markHandedOff.isPending}
            />

            {duplicateNotice && !reprocess && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 space-y-2">
                <p>{duplicateNotice}</p>
                <label className="flex items-center gap-2 font-medium">
                  <input type="checkbox" checked={reprocess} onChange={(e) => setReprocess(e.target.checked)} />
                  Hand it off again anyway
                </label>
              </div>
            )}

            {reprocess && (
              <FormInput
                label="Why is it being handed off again?"
                name="reprocessReason"
                value={reprocessReason}
                onChange={(e) => setReprocessReason(e.target.value)}
                placeholder="e.g. original invoice was voided and reissued"
                requiredMark
                disabled={markHandedOff.isPending}
              />
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
