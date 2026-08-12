import React, { useMemo, useState } from "react";
import { FlaskConical, CheckCircle2, AlertTriangle, Ban } from "lucide-react";

/**
 * A concrete "try it" worked example distinct from the plain-language
 * RulePreviewCard — lets the admin punch in a sample value and see exactly
 * which outcome (pass / warn / block) it produces, computed purely from the
 * builder's current in-progress state (nothing sent to the backend).
 */
export default function RuleEvaluationExample({ ruleType, conditionsMode, ruleValue, limits, enforcementType, currencyOptions }) {
  const [sampleAmount, setSampleAmount] = useState("");
  const [sampleCurrencyId, setSampleCurrencyId] = useState(limits?.[0]?.currencyId || "");
  const [sampleDays, setSampleDays] = useState("");

  const flatLimit = ruleType === "AMOUNT_LIMIT" && conditionsMode === "flat" ? Number(ruleValue) : null;
  const perCurrencyLimit = useMemo(() => {
    if (ruleType !== "AMOUNT_LIMIT" || conditionsMode !== "perCurrency") return null;
    const match = (limits || []).find((l) => l.currencyId === sampleCurrencyId);
    return match ? Number(match.limitAmount) : null;
  }, [ruleType, conditionsMode, limits, sampleCurrencyId]);

  const EnforcementIcon = enforcementType === "BLOCK" ? Ban : AlertTriangle;
  const enforcementColor = enforcementType === "BLOCK" ? "text-red-700 bg-red-50 border-red-200" : "text-amber-700 bg-amber-50 border-amber-200";

  let result = null;
  if (ruleType === "AMOUNT_LIMIT") {
    const limit = conditionsMode === "flat" ? flatLimit : perCurrencyLimit;
    if (sampleAmount !== "" && limit != null && !Number.isNaN(limit)) {
      result = Number(sampleAmount) > limit ? "trigger" : "pass";
    }
  } else if (ruleType === "BACKDATED_DAYS") {
    if (sampleDays !== "" && ruleValue) {
      result = Number(sampleDays) > Number(ruleValue) ? "trigger" : "pass";
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">
        <FlaskConical size={13} /> Evaluation Example
      </h3>

      {ruleType === "AMOUNT_LIMIT" ? (
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <div>
            <label className="mb-1 block text-xs text-gray-500">Sample expense amount</label>
            <input
              type="number"
              min="0"
              value={sampleAmount}
              onChange={(e) => setSampleAmount(e.target.value)}
              placeholder="e.g. 2000"
              className="w-32 rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm outline-none focus:border-[#0A0082] focus:ring-2 focus:ring-[#0A0082]/20"
            />
          </div>
          {conditionsMode === "perCurrency" && (
            <div>
              <label className="mb-1 block text-xs text-gray-500">Currency</label>
              <select
                value={sampleCurrencyId}
                onChange={(e) => setSampleCurrencyId(e.target.value)}
                className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm outline-none focus:border-[#0A0082]"
              >
                <option value="">Select...</option>
                {(limits || [])
                  .filter((l) => l.currencyId)
                  .map((l) => (
                    <option key={l.currencyId} value={l.currencyId}>
                      {currencyOptions.find((c) => c.value === l.currencyId)?.label || l.currencyId}
                    </option>
                  ))}
              </select>
            </div>
          )}
        </div>
      ) : ruleType === "BACKDATED_DAYS" ? (
        <div className="mt-3">
          <label className="mb-1 block text-xs text-gray-500">Sample days late</label>
          <input
            type="number"
            min="0"
            value={sampleDays}
            onChange={(e) => setSampleDays(e.target.value)}
            placeholder="e.g. 8"
            className="w-32 rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm outline-none focus:border-[#0A0082] focus:ring-2 focus:ring-[#0A0082]/20"
          />
        </div>
      ) : (
        <p className="mt-2 text-xs text-gray-500">
          This rule triggers automatically whenever its condition is met — there's no numeric threshold to test against.
        </p>
      )}

      {result === "pass" && (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs font-medium text-green-700">
          <CheckCircle2 size={14} /> Within limit — no action taken.
        </div>
      )}
      {result === "trigger" && (
        <div className={`mt-3 flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium ${enforcementColor}`}>
          <EnforcementIcon size={14} /> Would {enforcementType === "BLOCK" ? "block" : "warn on"} this expense.
        </div>
      )}
    </div>
  );
}
