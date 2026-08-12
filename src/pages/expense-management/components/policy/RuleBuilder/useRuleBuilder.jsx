import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Ban } from "lucide-react";
import Select from "react-select";
import FormInput from "@/components/forms/FormInput";
import FormDatePicker from "@/components/forms/FormDatePicker";
import CurrencyLimitEditor, { newLimitRow } from "@/pages/expense-management/components/policy/RuleBuilder/CurrencyLimitEditor";
import RulePreviewCard from "@/pages/expense-management/components/policy/RuleBuilder/RulePreviewCard";
import { RULE_TYPES, RULE_TYPE_META } from "@/pages/expense-management/components/policy/common/policyEnums";

export const customSelectStyles = {
  control: (base, state) => ({
    ...base,
    borderRadius: "0.5rem",
    borderColor: state.isFocused ? "#3b82f6" : "#d1d5db",
    boxShadow: state.isFocused ? "0 0 0 2px rgba(59, 130, 246, 0.5)" : "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
    padding: "0.125rem 0.25rem",
    minHeight: "42px",
    backgroundColor: "#ffffff",
    "&:hover": { borderColor: state.isFocused ? "#3b82f6" : "#d1d5db" },
  }),
  menu: (base) => ({ ...base, zIndex: 9999 }),
};

const emptyState = () => ({
  bundleId: "",
  ruleType: "AMOUNT_LIMIT",
  categoryId: "",
  policyName: "",
  conditionsMode: "flat",
  ruleValue: "",
  limits: [newLimitRow()],
  effectiveFrom: "",
  effectiveTo: "",
  enforcementType: "WARN",
  severity: "WARN",
});

/**
 * All Rule Builder state, validation, and step-content construction, shared
 * between the drawer (Bundle Workspace's Add/Edit Rule) and the inline
 * builder (the standalone Policy Rules page) so neither re-derives the same
 * ~350 lines of steps/validation logic.
 */
export function useRuleBuilder({ open = true, fixedBundle, bundleOptions = [], rule, categoryOptions = [], currencyOptions = [], onSubmit, submitting }) {
  const [state, setState] = useState(emptyState());
  const [formError, setFormError] = useState("");

  const set = (patch) => setState((prev) => ({ ...prev, ...patch }));

  useEffect(() => {
    if (!open) return;

    if (rule) {
      const isAmountLimit = rule.ruleType === "AMOUNT_LIMIT";
      const hasPerCurrencyLimits = Array.isArray(rule.limits) && rule.limits.length > 0;
      setState({
        bundleId: fixedBundle ? fixedBundle.policyId : rule.policyBundleId || "",
        ruleType: rule.ruleType || "AMOUNT_LIMIT",
        categoryId: rule.categoryId || "",
        policyName: rule.policyName || "",
        conditionsMode: isAmountLimit && hasPerCurrencyLimits ? "perCurrency" : "flat",
        ruleValue: rule.ruleValue || "",
        limits: hasPerCurrencyLimits
          ? rule.limits.map((l) => ({
              key: Math.random().toString(36).slice(2),
              currencyId: l.currencyId || "",
              limitAmount: l.limitAmount ?? "",
            }))
          : [newLimitRow()],
        effectiveFrom: rule.effectiveFrom || "",
        effectiveTo: rule.effectiveTo || "",
        enforcementType: rule.enforcementType || "WARN",
        severity: rule.severity || (rule.ruleType === "DUPLICATE_EXPENSE" ? "INFO" : "WARN"),
      });
    } else {
      setState({ ...emptyState(), bundleId: fixedBundle ? fixedBundle.policyId : "" });
    }
    setFormError("");
  }, [open, rule, fixedBundle]);

  const handleRuleTypeChange = (ruleType) => {
    set({
      ruleType,
      conditionsMode: "flat",
      ruleValue: "",
      limits: [newLimitRow()],
      severity: ruleType === "DUPLICATE_EXPENSE" ? "INFO" : "WARN",
    });
  };

  const selectedCategory = categoryOptions.find((c) => c.value === state.categoryId) || null;
  const selectedBundleOption = bundleOptions.find((b) => b.value === state.bundleId) || null;

  const previewLimits = useMemo(
    () =>
      state.limits.map((l) => ({
        limitAmount: l.limitAmount,
        currencyLabel: currencyOptions.find((c) => c.value === l.currencyId)?.label || "",
      })),
    [state.limits, currencyOptions]
  );

  const handleSubmit = () => {
    if (!fixedBundle && !state.bundleId) return setFormError("Select a policy bundle to continue.");
    if (!state.categoryId) return setFormError("Select a category to continue.");
    if (!state.policyName.trim()) return setFormError("Give this rule a name.");

    const payload = {
      policyBundleId: state.bundleId,
      categoryId: state.categoryId,
      policyName: state.policyName.trim(),
      ruleType: state.ruleType,
      ruleValue: null,
      severity: state.severity,
      enforcementType: state.enforcementType,
      effectiveFrom: state.effectiveFrom || null,
      effectiveTo: state.effectiveTo || null,
      status: rule?.status || "ACTIVE",
      limits: null,
    };

    if (state.ruleType === "AMOUNT_LIMIT") {
      if (state.conditionsMode === "perCurrency") {
        const validLimits = state.limits.filter((l) => l.currencyId && l.limitAmount !== "" && Number(l.limitAmount) >= 0);
        if (validLimits.length === 0) return setFormError("Add at least one currency limit.");
        payload.limits = validLimits.map((l) => ({ currencyId: l.currencyId, limitAmount: Number(l.limitAmount) }));
      } else {
        if (state.ruleValue === "" || Number(state.ruleValue) < 0) return setFormError("Enter a valid limit amount.");
        payload.ruleValue = String(state.ruleValue);
      }
    } else if (state.ruleType === "BACKDATED_DAYS") {
      if (state.ruleValue === "" || Number(state.ruleValue) <= 0) return setFormError("Enter a valid number of days.");
      payload.ruleValue = String(state.ruleValue);
    }

    setFormError("");
    onSubmit(payload);
  };

  const steps = [];

  if (!fixedBundle) {
    steps.push({
      title: "Policy Bundle",
      description: "Which bundle should this rule belong to?",
      content: (
        <Select
          options={bundleOptions}
          value={selectedBundleOption}
          onChange={(opt) => set({ bundleId: opt ? opt.value : "" })}
          placeholder="Select policy bundle..."
          isSearchable
          styles={customSelectStyles}
          isDisabled={submitting}
        />
      ),
    });
  }

  steps.push({
    title: "Rule Type",
    description: "What kind of condition should this rule check for?",
    content: (
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {RULE_TYPES.map((type) => {
          const meta = RULE_TYPE_META[type];
          const Icon = meta.Icon;
          const selected = state.ruleType === type;
          return (
            <button
              key={type}
              type="button"
              onClick={() => handleRuleTypeChange(type)}
              disabled={submitting}
              className={`flex items-start gap-2.5 rounded-lg border p-3 text-left transition ${
                selected ? "border-[#0A0082] bg-[#0A0082]/5 ring-1 ring-[#0A0082]/30" : "border-gray-200 hover:bg-gray-50"
              }`}
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                  selected ? "bg-[#0A0082] text-white" : "bg-gray-100 text-gray-500"
                }`}
              >
                <Icon size={15} />
              </span>
              <span className="min-w-0">
                <span className={`block text-sm font-semibold ${selected ? "text-[#0A0082]" : "text-gray-800"}`}>{meta.label}</span>
                <span className="mt-0.5 block text-xs text-gray-400">{meta.description}</span>
              </span>
            </button>
          );
        })}
      </div>
    ),
  });

  steps.push({
    title: "Category",
    description: "Which expense category does this rule apply to?",
    content: (
      <>
        <Select
          options={categoryOptions}
          value={selectedCategory}
          onChange={(opt) => set({ categoryId: opt ? opt.value : "" })}
          placeholder="Select expense category..."
          isSearchable
          styles={customSelectStyles}
          isDisabled={submitting}
        />
        <div className="mt-3">
          <FormInput
            label="Rule Name"
            name="policyName"
            placeholder="e.g. Meals cap"
            value={state.policyName}
            onChange={(e) => set({ policyName: e.target.value })}
            requiredMark
            disabled={submitting}
          />
        </div>
      </>
    ),
  });

  steps.push({
    title: "Conditions",
    description:
      state.ruleType === "BACKDATED_DAYS"
        ? "How many days after the expense date should this rule trigger?"
        : "Optionally scope this rule to an effective date range.",
    content: (
      <div className="space-y-3">
        {state.ruleType === "BACKDATED_DAYS" && (
          <FormInput
            label="Days Threshold"
            name="ruleValue"
            type="number"
            min="1"
            placeholder="e.g. 5"
            value={state.ruleValue}
            onChange={(e) => set({ ruleValue: e.target.value })}
            disabled={submitting}
            requiredMark
          />
        )}
        {state.ruleType !== "AMOUNT_LIMIT" && state.ruleType !== "BACKDATED_DAYS" && (
          <p className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500">{RULE_TYPE_META[state.ruleType].description}</p>
        )}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FormDatePicker label="Effective From" name="effectiveFrom" value={state.effectiveFrom} onChange={(e) => set({ effectiveFrom: e.target.value })} />
          <FormDatePicker label="Effective To" name="effectiveTo" value={state.effectiveTo} onChange={(e) => set({ effectiveTo: e.target.value })} />
        </div>
      </div>
    ),
  });

  if (state.ruleType === "AMOUNT_LIMIT") {
    steps.push({
      title: "Currency Limits",
      description: "Use one flat limit (converted to base currency), or set a specific limit per currency.",
      content: (
        <div className="space-y-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => set({ conditionsMode: "flat" })}
              disabled={submitting}
              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                state.conditionsMode === "flat" ? "border-[#0A0082] bg-[#0A0082]/5 text-[#0A0082]" : "border-gray-200 text-gray-500"
              }`}
            >
              Flat Limit
            </button>
            <button
              type="button"
              onClick={() => set({ conditionsMode: "perCurrency" })}
              disabled={submitting}
              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                state.conditionsMode === "perCurrency" ? "border-[#0A0082] bg-[#0A0082]/5 text-[#0A0082]" : "border-gray-200 text-gray-500"
              }`}
            >
              Per-Currency Limits
            </button>
          </div>
          {state.conditionsMode === "flat" ? (
            <FormInput
              label="Limit Amount"
              name="ruleValue"
              type="number"
              min="0"
              step="0.01"
              placeholder="e.g. 1500"
              value={state.ruleValue}
              onChange={(e) => set({ ruleValue: e.target.value })}
              disabled={submitting}
            />
          ) : (
            <CurrencyLimitEditor currencyOptions={currencyOptions} limits={state.limits} onChange={(limits) => set({ limits })} disabled={submitting} />
          )}
        </div>
      ),
    });
  }

  steps.push({
    title: "Enforcement",
    description: "Choose what happens when this rule is triggered, and how it's tagged.",
    content: (
      <div className="space-y-4">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => set({ enforcementType: "WARN" })}
            disabled={submitting}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold transition ${
              state.enforcementType === "WARN" ? "border-amber-300 bg-amber-50 text-amber-700" : "border-gray-200 text-gray-500 hover:bg-gray-50"
            }`}
          >
            <AlertTriangle size={16} /> Warn
          </button>
          <button
            type="button"
            onClick={() => set({ enforcementType: "BLOCK" })}
            disabled={submitting}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold transition ${
              state.enforcementType === "BLOCK" ? "border-red-300 bg-red-50 text-red-700" : "border-gray-200 text-gray-500 hover:bg-gray-50"
            }`}
          >
            <Ban size={16} /> Block
          </button>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-gray-500">Severity tag</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => set({ severity: "WARN" })}
              disabled={submitting}
              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                state.severity === "WARN" ? "border-[#0A0082] bg-[#0A0082]/5 text-[#0A0082]" : "border-gray-200 text-gray-500"
              }`}
            >
              Warn
            </button>
            <button
              type="button"
              onClick={() => set({ severity: "INFO" })}
              disabled={submitting}
              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                state.severity === "INFO" ? "border-[#0A0082] bg-[#0A0082]/5 text-[#0A0082]" : "border-gray-200 text-gray-500"
              }`}
            >
              Info
            </button>
          </div>
        </div>
      </div>
    ),
  });

  steps.push({
    title: "Preview",
    isLast: true,
    content: (
      <RulePreviewCard
        ruleType={state.ruleType}
        categoryLabel={selectedCategory?.label}
        ruleValue={state.ruleValue}
        limits={previewLimits}
        enforcementType={state.enforcementType}
        severity={state.severity}
        bundleLabel={fixedBundle ? fixedBundle.policyName : selectedBundleOption?.label}
      />
    ),
  });

  return { steps, formError, handleSubmit, state };
}
