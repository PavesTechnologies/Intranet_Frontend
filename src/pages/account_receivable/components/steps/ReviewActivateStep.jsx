import { PageCard, PageCardContent } from "../../../../components/Cards/PageCard";
import { Fonts } from "../../../../components/Fonts/Fonts";
import {
  BILLING_TYPE_LABELS,
  BILLING_MODE_LABELS,
  BILLING_FREQUENCIES,
  TAX_PREFERENCE_OPTIONS,
  PAYMENT_TERMS_OPTIONS,
  APPROVAL_WORKFLOW_OPTIONS,
  FINANCE_REVIEWER_OPTIONS,
  FINANCE_APPROVER_OPTIONS,
  INVOICE_NUMBER_SERIES_OPTIONS,
} from "../../data/wizardOptions";

function labelFor(options, value) {
  return options.find((option) => option.value === value)?.label || value || "—";
}

function formatBoolean(flag) {
  return flag ? "Enabled" : "Disabled";
}

function formatDisplayDate(isoValue) {
  if (!isoValue || !/^\d{4}-\d{2}-\d{2}$/.test(isoValue)) return isoValue;
  const date = new Date(`${isoValue}T00:00:00`);
  if (Number.isNaN(date.getTime())) return isoValue;
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function ReviewSection({ title, rows }) {
  return (
    <PageCard className="border-slate-200">
      <PageCardContent className="p-6">
        <h3 className={Fonts.heading4}>{title}</h3>
        <div className="mt-4 grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
          {rows.map((row) => (
            <div key={row.label} className="flex items-center justify-between text-sm">
              <span className="text-slate-500">{row.label}</span>
              <span className="font-medium text-slate-900">{row.value || "—"}</span>
            </div>
          ))}
        </div>
      </PageCardContent>
    </PageCard>
  );
}

export default function ReviewActivateStep({ wizardData }) {
  const { setupMode, projectInfo = {}, billingConfig = {}, controls = {} } = wizardData;

  const billingTypeLabel = BILLING_TYPE_LABELS[billingConfig.billingType] || "—";
  const billingFrequencyLabel = labelFor(BILLING_FREQUENCIES, billingConfig.billingFrequency);

  return (
    <div className="space-y-6">
      <div>
        <h2 className={Fonts.heading4}>Review &amp; Activate</h2>
        <p className="mt-1 text-sm text-slate-500">
          Review the configuration below before activating this billing setup.
        </p>
      </div>

      <ReviewSection
        title="Project Information"
        rows={[
          { label: "Client", value: projectInfo.clientName },
          { label: "Project", value: projectInfo.projectName },
          { label: "Project Code", value: projectInfo.projectCode },
          {
            label: "Project Source",
            value: setupMode === "EXISTING" ? "Enterprise" : "Standalone",
          },
          { label: "Contract Reference", value: projectInfo.contractNumber || projectInfo.contractReference },
          { label: "Currency", value: projectInfo.currency },
          { label: "Project Start Date", value: formatDisplayDate(projectInfo.startDate) },
          { label: "Project End Date", value: formatDisplayDate(projectInfo.endDate) },
        ]}
      />

      <ReviewSection
        title="Billing Configuration"
        rows={[
          { label: "Billing Type", value: billingTypeLabel },
          ...(billingConfig.billingType === "RECURRING"
            ? [{ label: "Billing Mode", value: BILLING_MODE_LABELS[billingConfig.billingMode] || "—" }]
            : []),
          { label: "Billing Frequency", value: billingFrequencyLabel },
          ...(billingConfig.billingType === "TIME_MATERIAL"
            ? [
                { label: "Billing Rate", value: billingConfig.timeAndMaterial?.billingRate },
                { label: "Minimum Billing Hours", value: billingConfig.timeAndMaterial?.minimumBillingHours },
              ]
            : []),
          ...(billingConfig.billingType === "FIXED_PRICE"
            ? [{ label: "Total Contract Value", value: billingConfig.fixedPrice?.totalContractValue }]
            : []),
          ...(billingConfig.billingType === "MILESTONE"
            ? [{ label: "Milestones", value: `${(billingConfig.milestones || []).length} defined` }]
            : []),
          ...(billingConfig.billingType === "RECURRING" && billingConfig.billingMode === "MONTHLY_RETAINER"
            ? [
                { label: "Monthly Retainer Amount", value: billingConfig.monthlyRetainer?.amount },
                { label: "Auto Invoice Generation", value: formatBoolean(billingConfig.monthlyRetainer?.autoInvoiceGeneration) },
              ]
            : []),
          ...(billingConfig.billingType === "RECURRING" && billingConfig.billingMode === "SUBSCRIPTION"
            ? [
                { label: "Subscription Amount", value: billingConfig.subscription?.amount },
                { label: "Billing Cycle", value: billingConfig.subscription?.billingCycle },
                { label: "Auto Renewal", value: formatBoolean(billingConfig.subscription?.autoRenewal) },
              ]
            : []),
        ]}
      />

      <ReviewSection
        title="Financial Controls"
        rows={[
          { label: "Tax Preference", value: labelFor(TAX_PREFERENCE_OPTIONS, controls.taxPreference) },
          { label: "Retention %", value: controls.retentionPercent },
          { label: "Credit Limit", value: controls.creditLimit },
          { label: "Payment Terms", value: labelFor(PAYMENT_TERMS_OPTIONS, controls.paymentTerms) },
          { label: "Invoice Number Series", value: labelFor(INVOICE_NUMBER_SERIES_OPTIONS, controls.invoiceNumberSeries) },
          { label: "Auto Invoice Generation", value: formatBoolean(controls.autoInvoiceGeneration) },
        ]}
      />

      <ReviewSection
        title="Workflow"
        rows={[
          { label: "Approval Workflow", value: labelFor(APPROVAL_WORKFLOW_OPTIONS, controls.approvalWorkflow) },
          { label: "Finance Reviewer", value: labelFor(FINANCE_REVIEWER_OPTIONS, controls.financeReviewer) },
          { label: "Finance Approver", value: labelFor(FINANCE_APPROVER_OPTIONS, controls.financeApprover) },
        ]}
      />
    </div>
  );
}
