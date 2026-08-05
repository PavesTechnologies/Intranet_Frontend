import { useState } from "react";
import { Info, Wrench, Boxes } from "lucide-react";

import Button from "../../../../components/Button/Button";
import FormDatePicker from "../../../../components/forms/FormDatePicker";
import Modal from "../../../../components/ui/Modal";
import { Fonts } from "../../../../components/Fonts/Fonts";
import ToggleSwitch from "../ToggleSwitch";
import RadioCardGroup from "../RadioCardGroup";
import { PRORATION_RULE_OPTIONS } from "../../data/wizardOptions";

export default function ToolBillingStep({ value = {}, onChange }) {
  const [drawer, setDrawer] = useState(null);
  const allowedByPms = value.allowToolBillingFromPMS !== false;

  const update = (patch) => onChange({ ...value, ...patch });

  return (
    <div className="space-y-6">
      <div>
        <h2 className={Fonts.heading4}>Tool &amp; Software Billing</h2>
        <p className="mt-1 text-sm text-slate-500">
          Project-level configuration for Epic 4 tool and software billing. This applies regardless of
          the billing type chosen in the previous step.
        </p>
      </div>

      {!allowedByPms && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <span>Tool billing is disabled in the enterprise contract configuration.</span>
        </div>
      )}

      <fieldset disabled={!allowedByPms} className={!allowedByPms ? "opacity-60" : ""}>
        <div className="space-y-5 rounded-xl border border-slate-200 p-5">
          <ToggleSwitch
            label="Enable Tool Billing"
            description="Allow this project to bill clients for tool and software usage."
            checked={Boolean(value.enableToolBilling)}
            onChange={(checked) => update({ enableToolBilling: checked })}
            disabled={!allowedByPms}
          />

          <div>
            <h3 className="mb-3 text-sm font-semibold text-slate-900">Default Proration Rule</h3>
            <RadioCardGroup
              name="defaultProrationRule"
              options={PRORATION_RULE_OPTIONS}
              value={value.defaultProrationRule || "NONE"}
              onChange={(next) => update({ defaultProrationRule: next })}
              columns={3}
              disabled={!allowedByPms}
            />
          </div>

          <ToggleSwitch
            label="Allow One-Time Charges"
            description="Permit one-time tool onboarding or setup charges to be billed."
            checked={Boolean(value.allowOneTimeCharges)}
            onChange={(checked) => update({ allowOneTimeCharges: checked })}
            disabled={!allowedByPms}
          />

          <ToggleSwitch
            label="Allow Recurring Charges"
            description="Permit recurring subscription-style tool charges to be billed."
            checked={Boolean(value.allowRecurringCharges)}
            onChange={(checked) => update({ allowRecurringCharges: checked })}
            disabled={!allowedByPms}
          />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormDatePicker
              label="Tool Billing Start Date"
              name="toolBillingStartDate"
              value={value.toolBillingStartDate || ""}
              onChange={(event) => update({ toolBillingStartDate: event.target.value })}
            />
            <FormDatePicker
              label="Tool Billing End Date"
              name="toolBillingEndDate"
              value={value.toolBillingEndDate || ""}
              onChange={(event) => update({ toolBillingEndDate: event.target.value })}
              min={value.toolBillingStartDate || undefined}
            />
          </div>
        </div>
      </fieldset>

      <div className="flex flex-wrap gap-3">
        <Button variant="outline" onClick={() => setDrawer("catalog")}>
          <Wrench className="h-4 w-4" /> Manage Tool Catalog
        </Button>
        <Button variant="outline" onClick={() => setDrawer("assignments")}>
          <Boxes className="h-4 w-4" /> Manage Project Tool Assignments
        </Button>
      </div>

      <Modal
        isOpen={Boolean(drawer)}
        onClose={() => setDrawer(null)}
        title={drawer === "catalog" ? "Manage Tool Catalog" : "Manage Project Tool Assignments"}
        width="480px"
      >
        <div className="flex min-h-[200px] flex-col items-center justify-center text-center">
          <p className="text-sm font-medium text-slate-700">
            {drawer === "catalog" ? "Tool Catalog management" : "Project Tool Assignment management"}
          </p>
          <p className="mt-1 max-w-xs text-xs text-slate-500">
            This workspace will be available once the Tool Catalog and Tool Assignment modules are built.
          </p>
        </div>
      </Modal>
    </div>
  );
}
