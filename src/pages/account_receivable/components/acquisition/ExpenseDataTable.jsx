import { useState, useMemo } from "react";
import {
  ArrowUpDown,
  Info,
  Receipt,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Clock,
  RefreshCw,
  FileX,
} from "lucide-react";
import StatusBadge from "../../../../components/status/statusbadge";
import Loader from "../../../../components/ui/Loader";
import SearchInput from "../../../../components/filter/Searchbar";
import Button from "../../../../components/Button/Button";
import { sumCostBasis } from "../../services/billingDataAcquisitionService";

/**
 * Expenses section displayed alongside Source Timesheets in Billing Items.
 * Displays acquired expense records from the AR backend integration, displaying
 * costBasis as the authoritative billable amount without React-side recalculation.
 *
 * Implements 5 explicit lifecycle states:
 *   1. Expense billing disabled
 *   2. Not yet acquired
 *   3. Acquisition failed (with retry option)
 *   4. Successfully acquired with no eligible expenses
 *   5. Acquired with expense records
 */
export default function ExpenseDataTable({
  records = [],
  amount = 0,
  currency = "USD",
  loading = false,
  billingStatus = "NOT_ACQUIRED",
  isExpenseEligible = true,
  error = null,
  onRetry = null,
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState("expenseDate");
  const [sortAsc, setSortAsc] = useState(true);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
    }
  };

  const filteredAndSorted = useMemo(() => {
    let result = (records || []).filter((r) => {
      if (!searchTerm) return true;
      const q = searchTerm.toLowerCase().trim();
      const cat = String(r.category || "").toLowerCase();
      const desc = String(r.description || "").toLowerCase();
      const rep = String(r.reportNumber || "").toLowerCase();
      const emp = String(r.employee || "").toLowerCase();
      const merch = String(r.merchant || "").toLowerCase();
      const proj = String(r.project || "").toLowerCase();
      const lineId = String(r.lineItemId || r.sourceReferenceId || "").toLowerCase();
      return (
        cat.includes(q) ||
        desc.includes(q) ||
        rep.includes(q) ||
        emp.includes(q) ||
        merch.includes(q) ||
        proj.includes(q) ||
        lineId.includes(q)
      );
    });

    result.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (sortField === "costBasis" || sortField === "amount" || sortField === "receiptCount") {
        const numA = Number(valA) || 0;
        const numB = Number(valB) || 0;
        return sortAsc ? numA - numB : numB - numA;
      }

      if (typeof valA === "string") valA = valA.toLowerCase();
      if (typeof valB === "string") valB = valB.toLowerCase();

      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });

    return result;
  }, [records, searchTerm, sortField, sortAsc]);

  const totalBillableCostBasis = useMemo(() => {
    if (records && records.length > 0) {
      return sumCostBasis(records);
    }
    return Number(amount || 0);
  }, [records, amount]);

  const isAcquiredStatus = [
    "READY",
    "READY_TO_TAX",
    "READY_FOR_TAX",
    "TAX_COMPLETED",
    "IN_TAX",
    "INVOICED",
    "ALREADY_BILLED",
  ].includes(String(billingStatus || "").toUpperCase());

  // --- STATE 0: LOADING ---
  if (loading) {
    return (
      <div
        data-testid="expenses-loading-state"
        className="flex min-h-[220px] flex-col items-center justify-center space-y-3 rounded-xl border border-slate-200 bg-white p-8 shadow-sm text-center"
      >
        <Loader />
        <p className="text-xs font-medium text-slate-500">
          Retrieving eligible expenses from Expense Management integration...
        </p>
      </div>
    );
  }

  // --- STATE 1: EXPENSE BILLING DISABLED ---
  if (!isExpenseEligible) {
    return (
      <div
        data-testid="expenses-disabled-state"
        className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3"
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-slate-400" />
            <h3 className="text-sm font-semibold text-slate-700">Expenses</h3>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-500">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
            Disabled
          </span>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 text-center space-y-1.5">
          <FileX className="mx-auto h-6 w-6 text-slate-400" />
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">
            Expense Billing Disabled
          </h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Expense Management billing is not enabled for this project configuration. Only timesheet labor charges will be acquired and billed.
          </p>
          <p className="text-[11px] text-slate-400 pt-1">
            To enable expense billing, update the setting in <strong>Project Billing Setup → Step 3 (Invoice Controls)</strong>.
          </p>
        </div>
      </div>
    );
  }

  // --- STATE 3: ACQUISITION FAILED / INCOMPLETE DATA ---
  const isFailedStatus =
    billingStatus === "ACQUISITION_FAILED" ||
    billingStatus === "FAILED" ||
    billingStatus === "ERROR" ||
    Boolean(error);

  if (isFailedStatus) {
    const isFxPolicyError =
      /expense-fx|currency-conversion|conversion\s*policy|exchange-rate\s*policy|rounding-mode|rate-date-basis/i.test(
        String(error || "")
      );

    const isMissingData =
      !isFxPolicyError &&
      /not\s*provided|not\s*returned|expense\s*data\s*incomplete/i.test(String(error || ""));

    const testId = isFxPolicyError
      ? "expenses-fx-error-state"
      : isMissingData
      ? "expenses-incomplete-state"
      : "expenses-failed-state";

    const errorTitle = isFxPolicyError
      ? "Currency Conversion Policy Required"
      : isMissingData
      ? "Expense Data Incomplete"
      : "Expense Acquisition Failed";

    const badgeLabel = isFxPolicyError
      ? "Configuration Required"
      : isMissingData
      ? "Incomplete Data"
      : "Acquisition Failed";

    return (
      <div
        data-testid={testId}
        className={`rounded-xl border ${
          isMissingData ? "border-amber-200" : "border-rose-200"
        } bg-white p-5 shadow-sm space-y-3`}
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Receipt className={`h-4 w-4 ${isMissingData ? "text-amber-600" : "text-rose-600"}`} />
            <h3 className="text-sm font-semibold text-slate-900">Expenses</h3>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full ${
              isMissingData ? "bg-amber-50 text-amber-700 ring-amber-600/20" : "bg-rose-50 text-rose-700 ring-rose-600/20"
            } px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${isMissingData ? "bg-amber-500" : "bg-rose-500"}`} />
            {badgeLabel}
          </span>
        </div>
        <div
          className={`rounded-lg border ${
            isMissingData ? "border-amber-200 bg-amber-50/70" : "border-rose-200 bg-rose-50/70"
          } p-4 text-center space-y-2`}
        >
          <AlertTriangle className={`mx-auto h-6 w-6 ${isMissingData ? "text-amber-600" : "text-rose-600"}`} />
          <h4
            className={`text-xs font-bold ${
              isMissingData ? "text-amber-900" : "text-rose-900"
            } uppercase tracking-wide`}
          >
            {errorTitle}
          </h4>
          <p className={`text-xs ${isMissingData ? "text-amber-700" : "text-rose-700"} max-w-md mx-auto`}>
            {error ||
              "We could not retrieve expense data for this billing period. Please check backend integration connectivity and retry."}
          </p>
          {onRetry && (
            <div className="pt-2">
              <Button
                variant={isMissingData ? "secondary" : "danger"}
                size="sm"
                onClick={onRetry}
                className="inline-flex items-center gap-1.5 text-xs"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Retry Acquisition
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- STATE 2: NOT YET ACQUIRED ---
  if (!isAcquiredStatus && records.length === 0 && amount === 0) {
    return (
      <div
        data-testid="expenses-not-acquired-state"
        className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3"
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-amber-600" />
            <h3 className="text-sm font-semibold text-slate-900">Expenses</h3>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-600/20">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            Not Yet Acquired
          </span>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-4 text-center space-y-1.5">
          <Clock className="mx-auto h-6 w-6 text-amber-600" />
          <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wide">
            Expenses Not Yet Acquired
          </h4>
          <p className="text-xs text-amber-800 max-w-md mx-auto">
            Source expenses have not been acquired for this billing period yet. Click <strong>Acquire Snapshot</strong> above to retrieve eligible expenses from Expense Management.
          </p>
        </div>
      </div>
    );
  }

  // --- STATE 4: SUCCESSFULLY ACQUIRED WITH NO ELIGIBLE EXPENSES ---
  if (isAcquiredStatus && records.length === 0 && amount === 0) {
    return (
      <div
        data-testid="expenses-empty-state"
        className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3"
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-emerald-600" />
            <h3 className="text-sm font-semibold text-slate-900">Expenses</h3>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
            No Eligible Expenses
          </span>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-5 text-center space-y-1.5">
          <CheckCircle2 className="mx-auto h-6 w-6 text-emerald-600" />
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">
            No Eligible Expenses Found
          </h4>
          <p className="text-xs text-slate-600 max-w-md mx-auto">
            Billing acquisition completed successfully. No approved, unbilled expenses were found for this project during the selected billing period.
          </p>
        </div>
      </div>
    );
  }

  // --- STATE 5: ACQUIRED WITH EXPENSE RECORDS (or summary total) ---
  return (
    <div
      data-testid="expenses-table-section"
      className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      {/* Header & Controls */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          <Receipt className="h-4 w-4 text-indigo-600" />
          <h3 className="text-sm font-semibold text-slate-900">Expenses</h3>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Acquired
          </span>
        </div>

        <div className="flex items-center gap-3">
          {records.length > 0 && (
            <div className="relative w-56">
              <SearchInput
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search category, merchant, report..."
              />
            </div>
          )}
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1 font-mono text-xs font-semibold text-slate-700">
            {records.length > 0 ? `${records.length} record${records.length !== 1 ? "s" : ""}` : "Summary Total"}{" "}
            ({currency}{" "}
            {totalBillableCostBasis.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
            )
          </div>
        </div>
      </div>

      {/* When line-item records exist: Render complete table */}
      {records.length > 0 ? (
        <div className="max-h-[550px] w-full overflow-x-auto overflow-y-auto rounded-xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-xs">
            <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50">
              <tr className="text-slate-600">
                <th
                  onClick={() => handleSort("expenseDate")}
                  className="cursor-pointer select-none px-4 py-3 text-left font-semibold transition-colors hover:bg-slate-100"
                >
                  <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                    <span>Expense Date</span>
                    <ArrowUpDown
                      className={`h-3.5 w-3.5 flex-shrink-0 ${
                        sortField === "expenseDate" ? "text-indigo-600" : "text-slate-400"
                      }`}
                    />
                  </span>
                </th>
                <th
                  onClick={() => handleSort("reportNumber")}
                  className="cursor-pointer select-none px-4 py-3 text-left font-semibold transition-colors hover:bg-slate-100"
                >
                  <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                    <span>Report #</span>
                    <ArrowUpDown
                      className={`h-3.5 w-3.5 flex-shrink-0 ${
                        sortField === "reportNumber" ? "text-indigo-600" : "text-slate-400"
                      }`}
                    />
                  </span>
                </th>
                <th className="px-4 py-3 text-left font-semibold">
                  <span className="whitespace-nowrap">Category</span>
                </th>
                <th className="px-4 py-3 text-left font-semibold">
                  <span className="whitespace-nowrap">Description</span>
                </th>
                <th className="px-4 py-3 text-left font-semibold">
                  <span className="whitespace-nowrap">Merchant</span>
                </th>
                <th className="px-4 py-3 text-left font-semibold">
                  <span className="whitespace-nowrap">Employee</span>
                </th>
                <th
                  onClick={() => handleSort("costBasis")}
                  className="cursor-pointer select-none px-4 py-3 text-left font-semibold transition-colors hover:bg-slate-100"
                >
                  <span className="inline-flex items-center justify-end gap-1.5 whitespace-nowrap">
                    <span>Billable Amount (Cost Basis)</span>
                    <ArrowUpDown
                      className={`h-3.5 w-3.5 flex-shrink-0 ${
                        sortField === "costBasis" ? "text-indigo-600" : "text-slate-400"
                      }`}
                    />
                  </span>
                </th>
                <th className="px-4 py-3 text-center font-semibold">
                  <span className="whitespace-nowrap">Receipts</span>
                </th>
                <th className="px-4 py-3 text-center font-semibold">
                  <span className="whitespace-nowrap">Status</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredAndSorted.map((rec, idx) => (
                <tr key={rec.id || idx} className="transition-colors hover:bg-slate-50">
                  <td className="px-4 py-2.5 font-mono text-slate-700 whitespace-nowrap">
                    <div>{rec.expenseDate || "—"}</div>
                    {rec.handedOffDate && (
                      <div className="text-[10px] text-slate-400 font-sans">
                        Handoff: {rec.handedOffDate}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs font-medium text-slate-700 whitespace-nowrap">
                    <div>{rec.reportNumber || "—"}</div>
                    {rec.syncId && (
                      <div className="text-[10px] text-slate-400 font-mono">
                        Sync: {rec.syncId}
                      </div>
                    )}
                    {rec.lineItemId && (
                      <div className="text-[10px] text-slate-400 font-mono">
                        Line: {rec.lineItemId}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2.5 font-semibold text-slate-900 whitespace-nowrap">
                    {rec.category || "—"}
                  </td>
                  <td
                    className="max-w-[220px] px-4 py-2.5 text-slate-600"
                    title={rec.description}
                  >
                    <div className="truncate">{rec.description || "—"}</div>
                    {(rec.handoffRemarks || (Array.isArray(rec.supersededSyncIds) && rec.supersededSyncIds.length > 0)) && (
                      <div className="mt-1 flex items-start gap-1 rounded border border-amber-200 bg-amber-50/90 p-1 text-[11px] text-amber-800">
                        <AlertTriangle className="h-3 w-3 flex-shrink-0 text-amber-600 mt-0.5" />
                        <div className="line-clamp-2">
                          <span className="font-semibold">Correction:</span>{" "}
                          {rec.handoffRemarks || "Updated handoff event"}
                          {Array.isArray(rec.supersededSyncIds) && rec.supersededSyncIds.length > 0 && (
                            <span className="ml-1 text-[10px] text-amber-700 font-mono">
                              (Superseded: {rec.supersededSyncIds.join(", ")})
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-slate-600 whitespace-nowrap">
                    {rec.merchant || "—"}
                  </td>
                  <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap">
                    {rec.employee || "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right whitespace-nowrap">
                    <div className="font-mono tabular-nums font-semibold text-indigo-900">
                      {rec.isConversionMissing ? (
                        <span className="text-amber-800">
                          {rec.currency || rec.sourceCurrency || "—"}{" "}
                          {Number(rec.costBasis ?? rec.amount ?? 0).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      ) : rec.currency ? (
                        <span>
                          {rec.currency}{" "}
                          {Number(rec.costBasis ?? rec.amount ?? 0).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      ) : (
                        <span className="font-sans text-xs text-slate-400 italic">
                          Currency unavailable
                        </span>
                      )}
                    </div>
                    {rec.isConversionMissing && (
                      <div
                        className="text-[10px] font-sans font-medium text-amber-700 mt-0.5"
                        title={`Unconverted source amount in ${rec.sourceCurrency || "source currency"}`}
                      >
                        (Unconverted &bull; {rec.sourceCurrency || "Source"} &rarr; {currency})
                      </div>
                    )}
                    {rec.originalAmount !== null && rec.originalAmount !== undefined && (
                      <div
                        className="text-[11px] font-mono text-slate-500 mt-0.5"
                        title="Original employee-paid expense amount (audit only)"
                      >
                        Orig: {rec.originalCurrency || ""}{" "}
                        {Number(rec.originalAmount).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </div>
                    )}
                    {rec.conversionApplied && rec.exchangeRate !== null && rec.exchangeRate !== undefined && (
                      <div
                        className="text-[10px] font-sans text-indigo-700 font-medium mt-0.5"
                        title="Authoritative exchange rate supplied by backend"
                      >
                        Fx: {rec.exchangeRate}
                        {rec.exchangeRateSource ? ` (${rec.exchangeRateSource})` : rec.rateSource ? ` (${rec.rateSource})` : ""}
                        {rec.exchangeRateDate ? ` • ${rec.exchangeRateDate}` : rec.rateDate ? ` • ${rec.rateDate}` : ""}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-center whitespace-nowrap">
                    <span className="inline-flex items-center gap-1 font-mono text-xs text-slate-500">
                      <FileText className="h-3 w-3 text-slate-400" />
                      {rec.receiptCount || 0}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-center whitespace-nowrap">
                    <div className="flex flex-col items-center gap-1">
                      <StatusBadge
                        label={rec.isCorrection ? "Corrected" : (rec.approvalStatus || "Handed Off")}
                        size="sm"
                      />
                      {rec.isCorrection && (
                        <span className="inline-flex items-center gap-0.5 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 border border-amber-200">
                          <AlertTriangle className="h-2.5 w-2.5 text-amber-600" />
                          Correction
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* Summary Total only (when backend returned expenseAmount without line items) */
        <div className="rounded-lg border border-indigo-200 bg-indigo-50/60 p-4 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wide text-indigo-950">
              Acquired Expense Total
            </span>
            <span className="font-mono text-sm font-bold text-indigo-900">
              {currency} {Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <p className="text-xs text-indigo-800">
            Expense charges have been verified and integrated into the snapshot total. Line-item expense details are recorded on the snapshot in the database.
          </p>
        </div>
      )}

      <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
        <Info className="h-3 w-3 flex-shrink-0" />
        <span>
          Expenses display the verified cost basis (gross amount less recoverable input tax). AR will calculate output tax during the tax calculation step.
        </span>
      </div>
    </div>
  );
}
