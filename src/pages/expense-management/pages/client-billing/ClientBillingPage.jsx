import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Inbox, FileCheck2, Receipt, Building2, RotateCcw, Wallet, BadgeCheck } from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb/Breadcrumb";
import PageHeader from "@/components/ui/PageHeader";
import FilterCard from "@/components/ui/FilterCard";
import StatCard from "@/components/Cards/StatCard";
import Button from "@/components/Button/Button";
import LoadingSpinner from "@/components/LoadingSpinner";
import GenericTable from "@/components/Table/table";
import SearchInput from "@/components/filter/Searchbar";
import Modal from "@/components/Modal/modal";
import FormInput from "@/components/forms/FormInput";
import { showStatusToast } from "@/components/toastfy/toast";
import PolicyEmptyState from "@/pages/expense-management/components/policy/common/PolicyEmptyState";
import EmployeeLabel from "@/pages/expense-management/approval-engine/components/EmployeeLabel";
import { formatMoney, formatDate, formatDateTime } from "@/pages/expense-management/approval-engine/constants/approvalLabels";
import { useEligibleExpenses, useHandedOff, useHandoffSummary, useMarkHandedOff } from "./hooks/useInvoiceHandoff";
import Pagination from "@/components/Pagination/pagination";

// Both lists are read in full (up to the server's cap of 100 each) and shown as one table, so one pager covers them.
const LIST_FETCH_SIZE = 100;
const COMBINED_PAGE_SIZE = 10;

const READY = "READY";
const HANDED_OFF = "HANDED_OFF";

const projectLabel = (item) => (item.projectCode ? `${item.projectCode} — ${item.projectName}` : "—");

const dayOf = (value) => (value ? String(value).slice(0, 10) : "");

/** Time used to order a row: the handoff time for handed-off rows, the expense date for ready rows. */
const sortTime = (item) => new Date(item.__status === HANDED_OFF ? item.handedOffAt : item.expenseDate).getTime() || 0;

const StatusBadge = ({ status }) =>
  status === HANDED_OFF ? (
    <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
      Handed off
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-semibold text-indigo-800">
      Ready to hand off
    </span>
  );

/**
 * Client Billing: finance-verified, client-billable expenses. Ready expenses are handed to the invoicing team here, and
 * handed-off expenses stay in the same table with a status badge. Independent of employee reimbursement (AP Payments).
 */
export default function ClientBillingPage() {
  const [page, setPage] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Handoff modal: `target` is the expense; `reprocess` is set when handing off again from the handed-off rows.
  const [target, setTarget] = useState(null);
  const [invoiceReference, setInvoiceReference] = useState("");
  const [reprocess, setReprocess] = useState(false);
  const [reprocessReason, setReprocessReason] = useState("");
  const [duplicateNotice, setDuplicateNotice] = useState("");

  const summaryQuery = useHandoffSummary();
  const readyQuery = useEligibleExpenses({}, 0, LIST_FETCH_SIZE);
  const historyQuery = useHandedOff(0, LIST_FETCH_SIZE);
  const markHandedOff = useMarkHandedOff();

  const summary = summaryQuery.data;

  const matchesSearch = (item) => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return [item.reportNumber, item.employeeId, item.resolvedClientName, item.projectName, item.projectCode, item.categoryName, item.description]
      .some((v) => String(v || "").toLowerCase().includes(q));
  };

  const matchesDates = (item) => {
    const day = dayOf(item.__status === HANDED_OFF ? item.handedOffAt : item.expenseDate);
    if (!day) return !startDate && !endDate;
    if (startDate && day < startDate) return false;
    if (endDate && day > endDate) return false;
    return true;
  };

  // One sequence: ready rows and handed-off rows, newest first, after search and date filters.
  const combined = useMemo(() => {
    const ready = (readyQuery.data?.content || []).map((item) => ({ ...item, __status: READY }));
    const handed = (historyQuery.data?.content || []).map((item) => ({ ...item, __status: HANDED_OFF }));
    return [...ready, ...handed]
      .filter((item) => matchesSearch(item) && matchesDates(item))
      .sort((a, b) => sortTime(b) - sortTime(a));
    // matchesSearch / matchesDates read only the filter values listed below.
  }, [readyQuery.data, historyQuery.data, searchTerm, startDate, endDate]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalRows = combined.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / COMBINED_PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const winStart = safePage * COMBINED_PAGE_SIZE;
  const winEnd = winStart + COMBINED_PAGE_SIZE;
  const visibleRows = combined.slice(winStart, winEnd);

  // A new search or date range starts again from the first page.
  useEffect(() => {
    setPage(0);
  }, [searchTerm, startDate, endDate]);

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

  const rowFor = (item) => {
    const handed = item.__status === HANDED_OFF;
    return {
      status: <StatusBadge status={item.__status} />,
      date: <span className="whitespace-nowrap text-xs text-gray-700">{handed ? formatDateTime(item.handedOffAt) : formatDate(item.expenseDate)}</span>,
      client: <span className="text-xs text-gray-800">{item.resolvedClientName || "No client"}</span>,
      project: <span className="text-xs text-gray-700">{projectLabel(item)}</span>,
      employee: <EmployeeLabel employeeId={item.employeeId} />,
      expense: (
        <div className="leading-tight">
          <span className="text-xs font-medium text-gray-800">{item.categoryName || "—"}</span>
          {!handed && item.description && <span className="block max-w-[220px] truncate text-[11px] text-gray-500">{item.description}</span>}
          {handed && item.remarks && <span className="block text-[11px] text-amber-700">{item.remarks}</span>}
        </div>
      ),
      report: <span className="font-mono text-xs text-gray-600">{item.reportNumber}</span>,
      amount: (
        <span className="font-mono text-xs font-semibold text-gray-900">
          {formatMoney(handed ? item.baseAmount : item.costBasis ?? item.baseAmount, item.baseCurrencyCode)}
        </span>
      ),
      invoiceRef: handed && item.invoiceReference ? (
        <span className="font-mono text-xs text-gray-800">{item.invoiceReference}</span>
      ) : (
        <span className="text-xs text-gray-400">{handed ? "Not given" : "—"}</span>
      ),
      action: handed ? (
        <Button size="small" variant="outline" onClick={() => openHandoff(item, { again: true })}>
          <RotateCcw size={13} className="mr-1" /> Hand off again
        </Button>
      ) : (
        <Button size="small" variant="primary" onClick={() => openHandoff(item)}>
          <FileCheck2 size={13} className="mr-1" /> Hand off
        </Button>
      ),
    };
  };

  const listQueries = [readyQuery, historyQuery];
  const isLoading = listQueries.some((q) => q.isLoading);
  const isError = listQueries.some((q) => q.isError);

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <Breadcrumb items={[{ label: "Expense Management", to: "/expense-management/dashboard" }, { label: "Client Billing" }]} />

      <PageHeader
        icon={Receipt}
        title="Client Billing"
        subtitle="Expenses employees incurred for a client project. Once Finance has verified them, hand them to the invoicing team so the client can be billed."
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Ready to hand off"
          value={summary ? summary.readyCount : "—"}
          subtitle="Expenses waiting"
          icon={FileCheck2}
          textColor="text-indigo-700"
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
        <StatCard
          title="Handed off"
          value={summary ? summary.handedOffCount : "—"}
          subtitle="All time"
          icon={BadgeCheck}
          textColor="text-emerald-700"
        />
      </div>

      <FilterCard title="Search & filters" description="Search and dates filter every expense in the table below.">
        <div className="w-full sm:max-w-sm">
          <SearchInput value={searchTerm} onSearch={(val) => setSearchTerm(val || "")} placeholder="Report, employee, project, category..." />
        </div>
        <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
          From
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="h-9 rounded-lg border border-gray-300 px-2.5 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </label>
        <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
          To
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="h-9 rounded-lg border border-gray-300 px-2.5 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </label>
        {(startDate || endDate) && (
          <Button size="small" variant="outline" onClick={() => { setStartDate(""); setEndDate(""); }}>
            Clear dates
          </Button>
        )}
      </FilterCard>

      {isError ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 py-10 text-center px-4">
          <AlertTriangle className="h-6 w-6 text-rose-500" />
          <p className="text-sm font-semibold text-rose-700">Couldn't load the client billing list.</p>
          <Button size="small" variant="outline" className="mt-2" onClick={() => listQueries.forEach((q) => q.refetch())}>
            Retry
          </Button>
        </div>
      ) : isLoading ? (
        <div className="flex items-center justify-center rounded-xl border border-gray-200 bg-white py-16">
          <LoadingSpinner text="Loading…" />
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
          {totalRows === 0 ? (
            <PolicyEmptyState
              icon={<Inbox className="h-10 w-10" />}
              title="Nothing to show yet."
              description="Client-billable expenses show up here as soon as Finance verifies them."
            />
          ) : (
            <div className="w-full overflow-x-auto">
              <GenericTable
                headers={["Status", "Date", "Client", "Project", "Employee", "Expense", "Report", "Amount", "Invoice ref.", "Action"]}
                columns={["status", "date", "client", "project", "employee", "expense", "report", "amount", "invoiceRef", "action"]}
                rows={visibleRows.map(rowFor)}
              />
            </div>
          )}
          {totalRows > 0 && (
            <div className="mt-4 flex flex-col items-center gap-2 border-t border-gray-100 pt-3 sm:flex-row sm:justify-between">
              <p className="text-xs text-gray-500">
                Showing {winStart + 1}–{Math.min(winEnd, totalRows)} of {totalRows}
              </p>
              <Pagination
                currentPage={safePage + 1}
                totalPages={totalPages}
                onPrevious={() => setPage(Math.max(safePage - 1, 0))}
                onNext={() => setPage(Math.min(safePage + 1, totalPages - 1))}
              />
            </div>
          )}
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
                This records that the invoicing team now has this expense to bill the client. It doesn't pay the employee or send anything to the client.
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
