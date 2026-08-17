import { Layers, Calendar, DollarSign, CreditCard, ShieldCheck, Tag } from "lucide-react";

const BILLING_TYPE_LABELS = {
  TIME_MATERIAL: "Time & Material",
  FIXED_PRICE: "Fixed Price",
  MILESTONE: "Milestone",
  RECURRING: "Recurring",
};

const frequencyLabel = (freq) => {
  if (!freq) return "—";
  return freq.charAt(0) + freq.slice(1).toLowerCase();
};

export default function BillingSummaryGrid({ config = {} }) {
  const isTM =
    config.billingType === "TIME_MATERIAL" ||
    config.billingType === "Timesheet Based" ||
    config.billingType === "Time & Material";

  const fields = [
    {
      label: "Billing Type",
      value: BILLING_TYPE_LABELS[config.billingType] || config.billingType || "—",
      icon: Layers,
    },
    {
      label: "Billing Frequency",
      value: frequencyLabel(config.billingFrequency),
      icon: Calendar,
    },
    {
      label: "Rate Model",
      value: isTM ? "Standard Flat Rate" : "Standard Retainer Schedule",
      icon: Tag,
    },
    {
      label: "Billing Currency",
      value: config.currency || "INR",
      icon: DollarSign,
      isMono: true,
    },
    {
      label: "Payment Terms",
      value: config.paymentTerms || "Net 30 Days",
      icon: CreditCard,
    },
    {
      label: "Tax Region",
      value: config.taxRegion || "Domestic (GST 18%)",
      icon: ShieldCheck,
    },
  ];

  return (
    <div className="rounded-2xl bg-white p-5 border border-slate-200/90 shadow-sm space-y-3">
      <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-2">
        <Layers className="h-4 w-4 text-indigo-600" />
        Enterprise Setup Parameters
      </h3>

      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-6 text-xs bg-slate-50/70 p-4 rounded-xl border border-slate-200/80">
        {fields.map((f, i) => (
          <div key={i} className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block flex items-center gap-1">
              <f.icon className="h-3 w-3 text-slate-400" />
              {f.label}
            </span>
            <span
              className={`font-bold text-slate-900 block truncate ${
                f.isMono ? "font-mono text-indigo-700 font-extrabold" : ""
              }`}
            >
              {f.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
