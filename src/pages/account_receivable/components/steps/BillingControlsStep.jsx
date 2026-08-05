import FormInput from "../../../../components/forms/FormInput";
import FormSelect from "../../../../components/forms/FormSelect";
import { PageCard, PageCardContent } from "../../../../components/Cards/PageCard";
import { Fonts } from "../../../../components/Fonts/Fonts";
import ToggleSwitch from "../ToggleSwitch";
import {
  TAX_PREFERENCE_OPTIONS,
  PAYMENT_TERMS_OPTIONS,
  APPROVAL_WORKFLOW_OPTIONS,
  FINANCE_REVIEWER_OPTIONS,
  FINANCE_APPROVER_OPTIONS,
  INVOICE_NUMBER_SERIES_OPTIONS,
} from "../../data/wizardOptions";

const TAX_TREATMENT_OPTIONS = [
  { value: "INCLUSIVE", label: "Tax Inclusive" },
  { value: "EXCLUSIVE", label: "Tax Exclusive" },
];

function ControlGroup({ title, children }) {
  return (
    <PageCard className="border-slate-200">
      <PageCardContent className="p-6">
        <h3 className={Fonts.heading4}>{title}</h3>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">{children}</div>
      </PageCardContent>
    </PageCard>
  );
}

export default function BillingControlsStep({ value = {}, onChange }) {
  const update = (patch) => onChange({ ...value, ...patch });

  return (
    <div className="space-y-6">
      <div>
        <h2 className={Fonts.heading4}>Billing Elements &amp; Controls</h2>
        <p className="mt-1 text-sm text-slate-500">
          Configure tax treatment, financial controls, approval workflow, and invoice settings.
        </p>
      </div>

      <ControlGroup title="Tax">
        <FormSelect
          label="Tax Preference"
          name="taxPreference"
          value={value.taxPreference || ""}
          onChange={(event) => update({ taxPreference: event.target.value })}
          options={TAX_PREFERENCE_OPTIONS}
        />
        <FormInput
          label="Tax Registration Number"
          name="taxRegistrationNumber"
          value={value.taxRegistrationNumber || ""}
          onChange={(event) => update({ taxRegistrationNumber: event.target.value })}
          placeholder="e.g. GSTIN29AAACB1234F1Z5"
        />
        <div className="md:col-span-2">
          <FormSelect
            label="Tax Inclusive / Exclusive"
            name="taxInclusive"
            value={value.taxInclusive || "EXCLUSIVE"}
            onChange={(event) => update({ taxInclusive: event.target.value })}
            options={TAX_TREATMENT_OPTIONS}
            className="max-w-xs"
          />
        </div>
      </ControlGroup>

      <ControlGroup title="Financial Controls">
        <FormInput
          label="Retention %"
          name="retentionPercent"
          type="number"
          value={value.retentionPercent || ""}
          onChange={(event) => update({ retentionPercent: event.target.value })}
          placeholder="e.g. 5"
        />
        <FormInput
          label="Credit Limit"
          name="creditLimit"
          type="number"
          value={value.creditLimit || ""}
          onChange={(event) => update({ creditLimit: event.target.value })}
          placeholder="e.g. 2500000"
        />
        <FormSelect
          label="Payment Terms"
          name="paymentTerms"
          value={value.paymentTerms || ""}
          onChange={(event) => update({ paymentTerms: event.target.value })}
          options={PAYMENT_TERMS_OPTIONS}
        />
      </ControlGroup>

      <ControlGroup title="Workflow">
        <FormSelect
          label="Approval Workflow"
          name="approvalWorkflow"
          value={value.approvalWorkflow || ""}
          onChange={(event) => update({ approvalWorkflow: event.target.value })}
          options={APPROVAL_WORKFLOW_OPTIONS}
        />
        <FormSelect
          label="Finance Reviewer"
          name="financeReviewer"
          value={value.financeReviewer || ""}
          onChange={(event) => update({ financeReviewer: event.target.value })}
          options={FINANCE_REVIEWER_OPTIONS}
        />
        <FormSelect
          label="Finance Approver"
          name="financeApprover"
          value={value.financeApprover || ""}
          onChange={(event) => update({ financeApprover: event.target.value })}
          options={FINANCE_APPROVER_OPTIONS}
        />
      </ControlGroup>

      <ControlGroup title="Invoice Settings">
        <FormSelect
          label="Invoice Number Series"
          name="invoiceNumberSeries"
          value={value.invoiceNumberSeries || ""}
          onChange={(event) => update({ invoiceNumberSeries: event.target.value })}
          options={INVOICE_NUMBER_SERIES_OPTIONS}
        />
        <FormInput
          label="Invoice Generation Day"
          name="invoiceGenerationDay"
          type="number"
          min="1"
          max="31"
          value={value.invoiceGenerationDay || ""}
          onChange={(event) => update({ invoiceGenerationDay: event.target.value })}
          placeholder="e.g. 1"
        />
        <div className="md:col-span-2">
          <ToggleSwitch
            label="Auto Invoice Generation"
            description="Automatically generate invoice drafts on the configured invoice generation day."
            checked={Boolean(value.autoInvoiceGeneration)}
            onChange={(checked) => update({ autoInvoiceGeneration: checked })}
          />
        </div>
      </ControlGroup>
    </div>
  );
}
