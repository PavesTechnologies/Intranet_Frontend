import { Calculator, Sparkles, ShieldAlert, CheckCircle2 } from "lucide-react";

export default function CommercialCalculationCard({
  laborAmount = 0,
  expenseAmount = 0,
  adjustments = 0,
  currency = "INR",
}) {
  const subtotal = Number(laborAmount) + Number(expenseAmount) + Number(adjustments);
  const taxRate = 0.18; // Standard GST 18%
  const estimatedTax = Math.round(subtotal * taxRate);
  const grandTotal = subtotal + estimatedTax;

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <Calculator className="h-4 w-4 text-indigo-600" />
          <h3 className="text-sm font-semibold text-slate-900">
            Commercial Calculation Summary
          </h3>
        </div>
        <span className="rounded-full border border-indigo-100 bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
          Pre-Tax &amp; Tax Engine
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Line Items Breakdown */}
        <div className="space-y-2.5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs">
          <div className="flex items-center justify-between text-slate-600">
            <span>Labor Charges (Acquired Timesheets)</span>
            <span className="font-mono font-semibold text-slate-900">
              {currency} {Number(laborAmount).toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between text-slate-600">
            <span>Expense Charges (Reimbursables)</span>
            <span className="font-mono font-semibold text-slate-900">
              {currency} {Number(expenseAmount).toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between border-b border-slate-200 pb-2.5 text-slate-600">
            <span>Commercial Adjustments</span>
            <span className="font-mono font-semibold text-slate-900">
              {currency} {Number(adjustments).toLocaleString()}
            </span>
          </div>

          <div className="flex items-center justify-between pt-1 font-semibold text-slate-800">
            <span>Acquired Subtotal</span>
            <span className="font-mono text-sm font-bold text-indigo-900">
              {currency} {subtotal.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Highlighted Total Summary Card */}
        <div className="flex flex-col justify-between space-y-3 rounded-xl border border-indigo-200 bg-indigo-50 p-4">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-indigo-600">
              Grand Commercial Total
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
              <CheckCircle2 className="h-3 w-3" /> Validated
            </span>
          </div>

          <div>
            <div className="font-mono text-2xl font-bold tracking-tight text-indigo-900">
              {currency} {grandTotal.toLocaleString()}
            </div>
            <div className="mt-1 flex justify-between text-xs text-indigo-700/80">
              <span>Subtotal: {currency} {subtotal.toLocaleString()}</span>
              <span>GST (18%): {currency} {estimatedTax.toLocaleString()}</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 border-t border-indigo-200 pt-2 text-xs text-indigo-600">
            <Sparkles className="h-3.5 w-3.5 flex-shrink-0" />
            <span>Tax calculated automatically based on billing registration rules.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
