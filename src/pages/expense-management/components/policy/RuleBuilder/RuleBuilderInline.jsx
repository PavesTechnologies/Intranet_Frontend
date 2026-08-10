import React from "react";
import { Trash2 } from "lucide-react";
import Button from "@/components/Button/Button";
import StepFlow from "@/pages/expense-management/components/policy/common/StepFlow";
import { useRuleBuilder } from "@/pages/expense-management/components/policy/RuleBuilder/useRuleBuilder";
import RuleEvaluationExample from "@/pages/expense-management/components/policy/RuleBuilder/RuleEvaluationExample";

/**
 * The flagship inline builder for the standalone Policy Rules page — same
 * useRuleBuilder hook as the drawer variant, rendered directly in the
 * workspace's right panel instead of a slide-over, with a sticky save bar
 * and a live Evaluation Example beneath the step flow.
 */
export default function RuleBuilderInline({ bundleOptions, rule, categoryOptions, currencyOptions, onSubmit, submitting, onDelete, canDelete }) {
  const { steps, formError, handleSubmit, state } = useRuleBuilder({
    fixedBundle: null,
    bundleOptions,
    rule,
    categoryOptions,
    currencyOptions,
    onSubmit,
    submitting,
  });

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
        <div>
          <h2 className="text-lg font-bold text-[#0a174e]">{rule ? "Edit Rule" : "New Rule"}</h2>
          <p className="text-sm text-gray-500">{rule ? `Editing "${rule.policyName}"` : "Define a condition and its consequence."}</p>
        </div>
        {rule && canDelete && (
          <Button type="button" variant="outline" size="small" className="text-red-600 hover:bg-red-50" onClick={() => onDelete(rule)}>
            <Trash2 size={14} /> Delete
          </Button>
        )}
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
        <StepFlow steps={steps} />
        <RuleEvaluationExample
          ruleType={state.ruleType}
          conditionsMode={state.conditionsMode}
          ruleValue={state.ruleValue}
          limits={state.limits}
          enforcementType={state.enforcementType}
          currencyOptions={currencyOptions}
        />
      </div>

      <div className="border-t border-gray-100 px-5 py-4">
        {formError && <p className="mb-2 text-xs font-medium text-red-600">{formError}</p>}
        <div className="flex justify-end">
          <Button type="button" variant="primary" loading={submitting} loadingText="Saving..." disabled={submitting} onClick={handleSubmit}>
            {rule ? "Save Rule" : "Create Rule"}
          </Button>
        </div>
      </div>
    </div>
  );
}
