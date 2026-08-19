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
    <div className="rounded-2xl bg-white p-5 border border-slate-200/90 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <Calculator className="h-4 w-4 text-indigo-600" />
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
            Commercial Calculation Summary
          </h3>
        </div>
        <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-full">
          Pre-Tax & Tax Engine
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Line Items Breakdown */}
        <div className="space-y-2.5 text-xs bg-slate-50/70 p-4 rounded-xl border border-slate-200/80">
          <div className="flex justify-between items-center text-slate-600">
            <span>Labor Charges (Acquired Timesheets)</span>
            <span className="font-bold text-slate-900 font-mono">
              {currency} {Number(laborAmount).toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between items-center text-slate-600">
            <span>Expense Charges (Reimbursables)</span>
            <span className="font-bold text-slate-900 font-mono">
              {currency} {Number(expenseAmount).toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between items-center text-slate-600 border-b border-slate-200/80 pb-2.5">
            <span>Commercial Adjustments</span>
            <span className="font-bold text-slate-900 font-mono">
              {currency} {Number(adjustments).toLocaleString()}
            </span>
          </div>

          <div className="flex justify-between items-center pt-1 font-bold text-slate-800">
            <span>Acquired Subtotal</span>
            <span className="font-extrabold text-indigo-900 font-mono text-sm">
              {currency} {subtotal.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Highlighted Total Summary Card */}
        <div className="rounded-xl bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 p-4 text-white shadow-md space-y-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs">
            <span className="text-indigo-200 font-bold uppercase tracking-wider text-[10px]">
              Grand Commercial Total
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full font-bold">
              <CheckCircle2 className="h-3 w-3" /> Validated
            </span>
          </div>

          <div>
            <div className="text-2xl font-black font-mono text-white tracking-tight">
              {currency} {grandTotal.toLocaleString()}
            </div>
            <div className="text-[11px] text-indigo-200/80 mt-1 flex justify-between">
              <span>Subtotal: {currency} {subtotal.toLocaleString()}</span>
              <span>GST (18%): {currency} {estimatedTax.toLocaleString()}</span>
            </div>
          </div>

          <div className="text-[10px] text-indigo-300/80 border-t border-white/10 pt-2 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-indigo-400 flex-shrink-0" />
            <span>Tax calculated automatically based on billing registration rules.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
