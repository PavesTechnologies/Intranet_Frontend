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
      label: "Frequency",
      value: frequencyLabel(config.billingFrequency),
      icon: Calendar,
    },
    {
      label: "Rate Model",
      value: isTM ? "Standard Flat Rate" : "Standard Retainer Schedule",
      icon: Tag,
    },
    {
      label: "Currency",
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
    <div className="flex flex-wrap gap-x-5 gap-y-2">
      {fields.map((f, i) => (
        <div key={i} className="flex items-center gap-1.5 text-xs">
          <f.icon className="h-3 w-3 flex-shrink-0 text-slate-400" />
          <span className="text-slate-400">{f.label}:</span>
          <span
            className={`font-semibold text-slate-800 ${f.isMono ? "font-mono tabular-nums text-indigo-700" : ""}`}
          >
            {f.value}
          </span>
        </div>
      ))}
    </div>
  );
}
