import React from "react";
import Button from "@/components/Button/Button";
import PolicyDrawer, { DRAWER_WIDTH_CREATE, DRAWER_WIDTH_EDIT } from "@/pages/expense-management/components/policy/common/PolicyDrawer";
import StepFlow from "@/pages/expense-management/components/policy/common/StepFlow";
import { useRuleBuilder } from "@/pages/expense-management/components/policy/RuleBuilder/useRuleBuilder";

/**
 * Drawer wrapper around the shared useRuleBuilder hook — used from the
 * Bundle Workspace's Add/Edit Rule quick action. The standalone Policy
 * Rules page uses the same hook inline (no drawer) instead of duplicating
 * this logic.
 */
export default function RuleBuilderDrawer({ open, onClose, fixedBundle, bundleOptions = [], rule, categoryOptions = [], currencyOptions = [], onSubmit, submitting }) {
  const { steps, formError, handleSubmit } = useRuleBuilder({ open, fixedBundle, bundleOptions, rule, categoryOptions, currencyOptions, onSubmit, submitting });

  return (
    <PolicyDrawer
      open={open}
      onClose={onClose}
      title={rule ? "Edit Rule" : "New Rule"}
      subtitle={fixedBundle ? `For "${fixedBundle.policyName}"` : "Define a condition and its consequence."}
      widthClassName={rule ? DRAWER_WIDTH_EDIT : DRAWER_WIDTH_CREATE}
      footer={
        <div className="flex flex-col gap-2">
          {formError && <p className="text-xs font-medium text-red-600">{formError}</p>}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button type="button" variant="primary" loading={submitting} loadingText="Saving..." disabled={submitting} onClick={handleSubmit} className="w-full sm:w-auto">
              {rule ? "Save Rule" : "Create Rule"}
            </Button>
          </div>
        </div>
      }
    >
      <StepFlow steps={steps} />
    </PolicyDrawer>
  );
}
