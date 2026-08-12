import React from "react";
import { Plus, X } from "lucide-react";
import Button from "@/components/Button/Button";

const newLimitRow = () => ({ key: Math.random().toString(36).slice(2), currencyId: "", limitAmount: "" });

export { newLimitRow };

export default function CurrencyLimitEditor({ currencyOptions = [], limits = [], onChange, disabled = false }) {
  const addLimit = () => onChange([...limits, newLimitRow()]);
  const updateLimit = (key, field, value) =>
    onChange(limits.map((l) => (l.key === key ? { ...l, [field]: value } : l)));
  const removeLimit = (key) => onChange(limits.filter((l) => l.key !== key));

  return (
    <div className="space-y-2">
      {limits.length === 0 ? (
        <p className="text-xs text-gray-400">No currency limits added yet.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {limits.map((limit) => (
            <div
              key={limit.key}
              className="flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 py-1.5 pl-3 pr-2"
            >
              <select
                value={limit.currencyId}
                onChange={(e) => updateLimit(limit.key, "currencyId", e.target.value)}
                disabled={disabled}
                className="bg-transparent text-sm font-semibold text-gray-700 outline-none"
              >
                <option value="">Currency</option>
                {currencyOptions.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="Amount"
                value={limit.limitAmount}
                onChange={(e) => updateLimit(limit.key, "limitAmount", e.target.value)}
                disabled={disabled}
                className="w-24 bg-transparent text-sm text-gray-800 outline-none"
              />
              <button
                type="button"
                onClick={() => removeLimit(limit.key)}
                disabled={disabled}
                className="rounded-full p-0.5 text-gray-400 transition hover:bg-gray-200 hover:text-gray-600"
                aria-label="Remove currency limit"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
      <Button type="button" variant="outline" size="small" onClick={addLimit} disabled={disabled}>
        <Plus size={14} /> Add Currency Limit
      </Button>
    </div>
  );
}
