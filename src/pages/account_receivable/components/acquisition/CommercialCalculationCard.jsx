import { Calculator, Sparkles, ArrowRight, Info, Loader2, CheckCircle2 } from "lucide-react";
import Button from "../../../../components/Button/Button";

export default function CommercialCalculationCard({
  laborAmount = 0,
  expenseAmount = 0,
  adjustments = 0,
  currency = "USD",
  onContinueToTax,
  isAcquired = false,
  billingStatus = "NOT_ACQUIRED",
  disabled = false,
  calculatingTax = false,
}) {
  const subtotal = Number(laborAmount) + Number(expenseAmount) + Number(adjustments);
  const grandTotal = subtotal;

  const lineItems = [
    { label: "Billable Hours", value: laborAmount },
    { label: "Expenses", value: expenseAmount },
    { label: "Adjustments", value: adjustments },
  ];

  const normalizedStatus = (billingStatus || "").toUpperCase();
  const isReadyForTax =
    normalizedStatus === "READY_TO_TAX" ||
    normalizedStatus === "READY_FOR_TAX" ||
    normalizedStatus === "READY" ||
    isAcquired;
  const isInTax = normalizedStatus === "IN_TAX" || calculatingTax;
  const isTaxCompleted = normalizedStatus === "TAX_COMPLETED";

  const isButtonEnabled = (isReadyForTax || isTaxCompleted) && !disabled && !isInTax;

  const getDisabledReason = () => {
    switch (normalizedStatus) {
      case "NOT_ACQUIRED":
        return "Acquire the billing snapshot before proceeding.";
      case "VALIDATING":
      case "IN_PROGRESS":
        return "Billing readiness is being processed.";
      case "PARTIALLY_READY":
      case "PENDING_APPROVAL":
        return "Complete the pending timesheet approvals before proceeding.";
      case "NO_BILLABLE_DATA":
      case "NO_DATA":
        return "No billable data is available for this billing period.";
      case "CONFIGURATION_REQUIRED":
      case "SETUP_REQUIRED":
        return "Complete the billing configuration before proceeding.";
      case "ALREADY_BILLED":
        return "This billing period has already been invoiced.";
      case "ACQUISITION_FAILED":
        return "Resolve the acquisition issue before proceeding.";
      case "IN_TAX":
        return "Tax calculation is currently in progress.";
      default:
        return "Complete billing validation before proceeding to tax calculation.";
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
      <div className="space-y-2.5">
        <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600">
          <Calculator className="h-4 w-4 text-indigo-600" /> Commercial Value
        </span>

        <div className="space-y-1.5 text-xs">
          {lineItems.map((li) => (
            <div key={li.label} className="flex items-center justify-between text-slate-600">
              <span>{li.label}</span>
              <span className="font-mono font-semibold text-slate-800">
                {currency} {Number(li.value).toLocaleString()}
              </span>
            </div>
          ))}

          <div className="flex items-center justify-between border-t border-slate-100 pt-1.5 font-bold text-slate-800 text-xs">
            <span>Subtotal</span>
            <span className="font-mono text-slate-900">
              {currency} {subtotal.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-2.5 pt-1">
        <div className="rounded-lg bg-indigo-50/80 border border-indigo-100 p-2.5">
          <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-indigo-600">
            <Sparkles className="h-3 w-3" /> Grand Total
          </span>
          <div className="mt-0.5 font-mono text-xl font-extrabold tracking-tight text-indigo-900">
            {currency} {grandTotal.toLocaleString()}
          </div>
        </div>

        <div className="space-y-2">
          {isTaxCompleted ? (
            <>
              <button
                type="button"
                disabled
                className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-slate-100 py-2 px-3 text-xs font-semibold text-slate-500 cursor-not-allowed"
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-slate-400" />
                Tax Calculation Completed
              </button>

              <Button
                variant="primary"
                className="w-full justify-center text-xs py-2 font-bold shadow-sm bg-indigo-600 hover:bg-indigo-700 text-white"
                onClick={onContinueToTax}
              >
                View Tax Calculation <ArrowRight className="ml-1 inline h-3.5 w-3.5" />
              </Button>
            </>
          ) : (
            <Button
              variant="success"
              className="w-full justify-center text-xs py-2 font-bold shadow-sm"
              onClick={onContinueToTax}
              disabled={!isButtonEnabled}
            >
              {isInTax ? (
                <>
                  <Loader2 className="mr-1.5 inline h-3.5 w-3.5 animate-spin" />
                  Calculating Tax...
                </>
              ) : (
                <>
                  Proceed to Tax Calculation <ArrowRight className="ml-1 inline h-3.5 w-3.5" />
                </>
              )}
            </Button>
          )}

          {!isReadyForTax && !isTaxCompleted && (
            <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium px-0.5 pt-0.5">
              <Info className="h-3 w-3 flex-shrink-0 text-slate-400" />
              <span className="truncate">{getDisabledReason()}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
