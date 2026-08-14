import { PageCard, PageCardContent } from "../../../../components/Cards/PageCard";
import { Fonts } from "../../../../components/Fonts/Fonts";

function formatBoolean(flag) {
  return flag ? "Enabled" : "Disabled";
}

function formatDisplayDate(isoValue) {
  if (!isoValue || !/^\d{4}-\d{2}-\d{2}$/.test(isoValue)) return isoValue;
  const date = new Date(`${isoValue}T00:00:00`);
  if (Number.isNaN(date.getTime())) return isoValue;
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function ReviewSection({ title, rows, stepId, onEdit }) {
  return (
    <PageCard className="border border-slate-100 bg-slate-50/40 shadow-none rounded-2xl transition-all duration-300">
      <PageCardContent className="p-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-3.5">
          <h3 className="text-sm font-bold text-slate-900 tracking-wide uppercase">{title}</h3>
          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(stepId)}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors bg-blue-50 px-2 py-0.5 rounded"
            >
              Edit
            </button>
          )}
        </div>
        <div className="divide-y divide-slate-100">
          {rows.map((row, index) => (
            <div key={`${row.label}-${index}`} className="flex justify-between items-center py-2 text-sm">
              <span className="text-slate-500 font-medium">{row.label}</span>
              <span className="font-semibold text-slate-800">{row.value || "—"}</span>
            </div>
          ))}
        </div>
      </PageCardContent>
    </PageCard>
  );
}

export default function ReviewActivateStep({ wizardData, onEditStep }) {
  const { projectInfo = {}, billingConfig = {}, controls = {} } = wizardData;

  const billingTypeLabel =
    billingConfig.billingTypeName ||
    billingConfig.billingTypeLabel ||
    billingConfig.billingType ||
    "—";
  const billingFrequencyLabel =
    billingConfig.billingFrequencyName ||
    billingConfig.billingFrequencyLabel ||
    billingConfig.billingFrequency ||
    "—";
  const pricingModel = billingConfig.pricingModel || billingConfig.billingMode || "";
  const roleRateRows = (billingConfig.timeAndMaterial?.roles || [])
    .filter((roleRate) => roleRate.role || roleRate.rate)
    .map((roleRate) => ({
      label: roleRate.role || "Role Rate",
      value: [
        roleRate.rate,
        roleRate.ratePeriod,
        roleRate.effectiveFrom ? `from ${formatDisplayDate(roleRate.effectiveFrom)}` : "",
        roleRate.effectiveTo ? `to ${formatDisplayDate(roleRate.effectiveTo)}` : "",
      ].filter(Boolean).join(" | "),
    }));
  const standardRateValue = [
    billingConfig.timeAndMaterial?.rate,
    billingConfig.timeAndMaterial?.ratePeriod,
    billingConfig.timeAndMaterial?.effectiveFrom ? `from ${formatDisplayDate(billingConfig.timeAndMaterial.effectiveFrom)}` : "",
    billingConfig.timeAndMaterial?.effectiveTo ? `to ${formatDisplayDate(billingConfig.timeAndMaterial.effectiveTo)}` : "",
  ].filter(Boolean).join(" | ");

  return (
    <div className="space-y-5">
      <div className="border-b border-slate-100 pb-4">
        <h2 className={Fonts.heading3}>Review &amp; Activate</h2>
        <p className="mt-1 text-sm text-slate-500">
          Review the configuration below before activating this billing setup.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ReviewSection
          title="Project"
          stepId={1}
          onEdit={onEditStep}
          rows={[
            { label: "Client", value: projectInfo.clientName },
            { label: "Project", value: projectInfo.projectName },
            { label: "Project Code", value: projectInfo.projectCode },
            { label: "Duration", value: projectInfo.startDate ? `${formatDisplayDate(projectInfo.startDate)} to ${formatDisplayDate(projectInfo.endDate) || "Ongoing"}` : "—" },
            { label: "Currency", value: projectInfo.projectBudgetCurrency || projectInfo.currency || "—" },
            { label: "Project Budget", value: projectInfo.projectBudget !== "" && projectInfo.projectBudget !== null && projectInfo.projectBudget !== undefined ? projectInfo.projectBudget : "—" },
          ]}
        />

        <ReviewSection
          title="Commercial"
          stepId={2}
          onEdit={onEditStep}
          rows={[
            { label: "Billing Type", value: billingTypeLabel },
            { label: "Billing Frequency", value: billingFrequencyLabel },
            { label: "Effective From", value: formatDisplayDate(billingConfig.effectiveFrom) },
            { label: "Effective To", value: formatDisplayDate(billingConfig.effectiveTo) || "Ongoing" },
          ]}
        />

        <ReviewSection
          title="Pricing"
          stepId={2}
          onEdit={onEditStep}
          rows={[
            ...(["RECURRING", "TIME_MATERIAL"].includes(billingConfig.billingType)
              ? [
                  {
                    label: billingConfig.billingType === "TIME_MATERIAL" ? "Rate Model" : "Billing Mode",
                    value: pricingModel || "—",
                  },
                ]
              : []),
            ...(billingConfig.billingType === "TIME_MATERIAL"
              ? [
                  ...(pricingModel === "STANDARD" || !pricingModel
                    ? [
                        { label: "Standard Rate", value: standardRateValue },
                      ]
                    : []),
                  ...(pricingModel === "ROLE_BASED"
                    ? roleRateRows.length > 0
                      ? roleRateRows
                      : [{ label: "Roles Configured", value: "—" }]
                    : []),
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
          title="Invoice"
          stepId={3}
          onEdit={onEditStep}
          rows={[
            {
              label: "Invoice Generation",
              value:
                controls.autoInvoiceGeneration === true
                  ? "Automatic"
                  : controls.autoInvoiceGeneration === false
                  ? "Manual"
                  : "—",
            },
            ...(controls.autoInvoiceGeneration === true
              ? [{ label: "Generation Day", value: controls.invoiceGenerationDay }]
              : []),
            { label: "Payment Terms", value: controls.paymentTermName || controls.paymentTerms || controls.paymentTermId || "—" },
            { label: "Tax Region", value: controls.taxRegionName || controls.taxRegionId || "—" },
            { label: "Expense Billing", value: controls.expenseBillingEligible ? "Eligible" : "Not Eligible" },
          ]}
        />
      </div>
    </div>
  );
}
