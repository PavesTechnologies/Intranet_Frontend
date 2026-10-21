import { useState } from "react";
import { FileSpreadsheet, Receipt, Layers } from "lucide-react";
import BillingSummaryGrid from "./BillingSummaryGrid";
import TimesheetDataTable from "./TimesheetDataTable";
import ExpenseDataTable from "./ExpenseDataTable";
import CommercialCalculationCard from "./CommercialCalculationCard";
import BillingReadinessCard from "./BillingReadinessCard";
import PendingTimesheetsModal from "./PendingTimesheetsModal";
import { sumCostBasis, sumAmount } from "../../services/billingDataAcquisitionService";

/**
 * Body of a Billing Snapshot:
 * - Overview metadata (including Expense Billing: Enabled/Disabled)
 * - Billing Items: Source Timesheets and Expenses sections with flexible view switcher
 * - Control rail: Billing Readiness and Commercial Value calculation cards
 */
export default function SnapshotWorkspace({
  config,
  acquisitionResults,
  acquiring,
  onAcquire,
  onRemindPM,
  remindingPM = false,
}) {
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [activeView, setActiveView] = useState("all"); // "all" | "timesheets" | "expenses"

  const isExpenseEligible = Boolean(config?.expenseBillingEligible);

  const timesheetRecords =
    acquisitionResults?.labor?.records || config?.existingSnapshot?.timesheets || config?.existingSnapshot?.laborRecords || [];
  const laborAmount =
    acquisitionResults?.labor?.amount !== undefined
      ? Number(acquisitionResults.labor.amount)
      : typeof config?.existingSnapshot?.laborAmount === "number"
      ? Number(config.existingSnapshot.laborAmount)
      : timesheetRecords.length > 0
      ? sumAmount(timesheetRecords)
      : Number(config?.existingSnapshot?.subtotal ?? 0);

  const expenseRecords =
    acquisitionResults?.expense?.records ||
    config?.existingSnapshot?.expenseRecords ||
    config?.existingSnapshot?.expenses ||
    config?.existingSnapshot?.handedOffExpenses ||
    [];
  const expenseAmount =
    acquisitionResults?.expense?.amount !== undefined
      ? Number(acquisitionResults.expense.amount)
      : typeof config?.existingSnapshot?.expenseAmount === "number"
      ? Number(config.existingSnapshot.expenseAmount)
      : Array.isArray(expenseRecords) && expenseRecords.length > 0
      ? sumCostBasis(expenseRecords)
      : 0;

  const pendingTimesheets = acquisitionResults?.labor?.readiness?.pendingTimesheets || [];

  return (
    <div className="space-y-5">
      {/* Snapshot Overview */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
          Snapshot Overview
        </h2>
        <BillingSummaryGrid config={config} />
      </section>

      {/* Financial Operations Workspace */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 items-start">
        {/* Left: Billing Items (dominant working area) */}
        <div className="lg:col-span-8 min-w-0 space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Billing Items
            </h2>

            {/* View switcher tabs: All Items | Timesheets | Expenses */}
            <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setActiveView("all")}
                className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                  activeView === "all"
                    ? "bg-white text-indigo-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Layers className="h-3.5 w-3.5" />
                <span>All Items</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveView("timesheets")}
                className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                  activeView === "timesheets"
                    ? "bg-white text-indigo-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                <span>Timesheets ({timesheetRecords.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveView("expenses")}
                className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                  activeView === "expenses"
                    ? "bg-white text-indigo-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Receipt className="h-3.5 w-3.5" />
                <span>
                  Expenses (
                  {isExpenseEligible
                    ? expenseRecords.length > 0
                      ? expenseRecords.length
                      : expenseAmount > 0
                      ? `${config?.currency || "USD"} ${expenseAmount.toLocaleString()}`
                      : "0"
                    : "Off"}
                  )
                </span>
              </button>
            </div>
          </div>

          {/* Section 1: Source Timesheets */}
          {(activeView === "all" || activeView === "timesheets") && (
            <TimesheetDataTable
              records={timesheetRecords}
              currency={config.currency}
              loading={acquiring}
              billingType={config.billingType}
              billingStatus={config.billingStatus}
            />
          )}

          {/* Section 2: Expenses (displayed alongside Source Timesheets) */}
          {(activeView === "all" || activeView === "expenses") && (
            <ExpenseDataTable
              records={expenseRecords}
              amount={expenseAmount}
              currency={config.currency}
              loading={acquiring}
              billingStatus={acquisitionResults?.billingStatus || config?.billingStatus}
              isExpenseEligible={isExpenseEligible}
              error={
                acquisitionResults?.expense?.error ||
                (config?.billingStatus === "ACQUISITION_FAILED" || acquisitionResults?.billingStatus === "ACQUISITION_FAILED"
                  ? acquisitionResults?.message || config?.message
                  : null)
              }
              onRetry={onAcquire}
            />
          )}
        </div>

        {/* Right: Readiness + Commercial Value (sticky control rail) */}
        <aside className="lg:col-span-4 space-y-4 lg:sticky lg:top-6 self-start">
          <BillingReadinessCard
            config={config}
            acquisitionResults={acquisitionResults}
            onViewPending={() => setShowPendingModal(true)}
            onRemindPM={onRemindPM}
            reminding={remindingPM}
          />

          <CommercialCalculationCard
            laborAmount={laborAmount}
            expenseAmount={isExpenseEligible ? expenseAmount : 0}
            adjustments={0}
            currency={config.currency}
          />
        </aside>
      </div>

      <PendingTimesheetsModal
        isOpen={showPendingModal}
        onClose={() => setShowPendingModal(false)}
        pendingTimesheets={pendingTimesheets}
        config={config}
        onRemindPM={onRemindPM}
        reminding={remindingPM}
      />
    </div>
  );
}
