import { useMemo } from "react";
import { RefreshCw, X } from "lucide-react";

import FormInput from "../../../../../components/forms/FormInput";
import FormDatePicker from "../../../../../components/forms/FormDatePicker";
import Button from "../../../../../components/Button/Button";
import { Fonts } from "../../../../../components/Fonts/Fonts";
import SearchableSelect from "../../SearchableSelect";
import { BILLING_TYPE_LABELS, BILLING_MODE_LABELS, BILLING_FREQUENCIES } from "../../../data/wizardOptions";

function frequencyLabel(value) {
  return BILLING_FREQUENCIES.find((option) => option.value === value)?.label || value;
}

const CHIP_TONES = {
  positive: "bg-emerald-100 text-emerald-700",
  neutral: "bg-slate-200 text-slate-600",
  default: "bg-indigo-100 text-indigo-700",
};

function Chip({ label, tone = "default" }) {
  return (
    <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${CHIP_TONES[tone]}`}>{label}</span>
  );
}

export default function ProjectPeriodStep({
  activeConfigs,
  loadingConfigs,
  selection,
  onSelectionChange,
  billingContext,
  loadingContext,
  onLoadContext,
  onReset,
}) {
  const projectOptions = useMemo(
    () =>
      activeConfigs.map((config) => ({
        value: config.id,
        label: `${config.projectName} (${config.projectCode})`,
      })),
    [activeConfigs]
  );

  const handleProjectChange = (event) => onSelectionChange({ ...selection, configId: event.target.value });
  const handlePeriodFromChange = (event) => onSelectionChange({ ...selection, periodFrom: event.target.value });
  const handlePeriodToChange = (event) => onSelectionChange({ ...selection, periodTo: event.target.value });

  const hasSelection = Boolean(selection.configId || selection.periodFrom || selection.periodTo);

  return (
    <div className="space-y-6">
      <div>
        <h2 className={Fonts.heading4}>Project &amp; Billing Period</h2>
        <p className="mt-1 text-sm text-slate-500">
          Select an active billing configuration and the period to acquire billable transactions for.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <SearchableSelect
          label="Project"
          name="configId"
          value={selection.configId || ""}
          onChange={handleProjectChange}
          options={projectOptions}
          placeholder={loadingConfigs ? "Loading projects..." : "Select project"}
          disabled={loadingConfigs}
        />
        <FormInput label="Client" value={billingContext?.client || ""} disabled onChange={() => {}} />

        <FormInput
          label="Billing Type"
          value={billingContext ? BILLING_TYPE_LABELS[billingContext.billingType] || billingContext.billingType : ""}
          disabled
          onChange={() => {}}
        />
        <FormInput
          label="Billing Mode"
          value={billingContext ? BILLING_MODE_LABELS[billingContext.billingMode] || billingContext.billingMode : ""}
          disabled
          onChange={() => {}}
        />

        <FormInput
          label="Billing Frequency"
          value={billingContext ? frequencyLabel(billingContext.billingFrequency) : ""}
          disabled
          onChange={() => {}}
        />
        <FormInput label="Currency" value={billingContext?.currency || ""} disabled onChange={() => {}} />

        <FormDatePicker
          label="Billing Period From"
          name="periodFrom"
          value={selection.periodFrom || ""}
          onChange={handlePeriodFromChange}
        />
        <FormDatePicker
          label="Billing Period To"
          name="periodTo"
          value={selection.periodTo || ""}
          onChange={handlePeriodToChange}
          min={selection.periodFrom || undefined}
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <Button
          variant="outline"
          onClick={onLoadContext}
          loading={loadingContext}
          loadingText="Loading..."
          disabled={!selection.configId}
        >
          <RefreshCw className="h-3.5 w-3.5" /> Load Billing Context
        </Button>
        <Button variant="ghost" onClick={onReset} disabled={!hasSelection}>
          <X className="h-3.5 w-3.5" /> Reset
        </Button>
      </div>

      {billingContext && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h3 className="mb-3 text-sm font-semibold text-slate-900">Billing Context Summary</h3>
          <div className="flex flex-wrap gap-2">
            <Chip label={`Client: ${billingContext.client}`} />
            <Chip label={`Billing Type: ${BILLING_TYPE_LABELS[billingContext.billingType] || billingContext.billingType}`} />
            <Chip label={`Frequency: ${frequencyLabel(billingContext.billingFrequency)}`} />
            <Chip label={`Currency: ${billingContext.currency}`} />
            <Chip
              label={`Tool Billing: ${billingContext.toolBillingEnabled ? "Enabled" : "Disabled"}`}
              tone={billingContext.toolBillingEnabled ? "positive" : "neutral"}
            />
          </div>
        </div>
      )}
    </div>
  );
}
