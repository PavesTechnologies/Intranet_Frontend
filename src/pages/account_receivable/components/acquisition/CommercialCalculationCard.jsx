import { Calculator, Sparkles } from "lucide-react";

export default function CommercialCalculationCard({
  laborAmount = 0,
  expenseAmount = 0,
  adjustments = 0,
  currency = "INR",
}) {
  const subtotal = Number(laborAmount) + Number(expenseAmount) + Number(adjustments);
  const grandTotal = subtotal;

  const lineItems = [
    { label: "Billable Hours", value: laborAmount },
    { label: "Expenses", value: expenseAmount },
  ];

  return (
    <div className="flex h-full flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="space-y-3">
        <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
          <Calculator className="h-3.5 w-3.5" /> Commercial Calculation
        </span>

        <div className="space-y-2 text-sm">
          {lineItems.map((li) => (
            <div key={li.label} className="flex items-center justify-between text-slate-600">
              <span>{li.label}</span>
              <span className="font-mono font-semibold text-slate-800">
                {currency} {Number(li.value).toLocaleString()}
              </span>
            </div>
          ))}

          <div className="flex items-center justify-between border-t border-slate-100 pt-2 font-semibold text-slate-800">
            <span>Subtotal</span>
            <span className="font-mono text-slate-900">
              {currency} {subtotal.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-lg bg-indigo-50 p-4">
        <span className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-indigo-500">
          <Sparkles className="h-3 w-3" /> Grand Total
        </span>
        <div className="mt-1 font-mono text-2xl font-bold tracking-tight text-indigo-900">
          {currency} {grandTotal.toLocaleString()}
        </div>
      </div>
    </div>
  );
}
