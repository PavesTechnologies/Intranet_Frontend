import { useMemo, useState } from "react";
import { FolderKanban, Coins, Wallet, Receipt, Pencil, Search, ChevronRight } from "lucide-react";

import { PageCard, PageCardContent } from "../../../../components/Cards/PageCard";
import Modal from "../../../../components/Modal/modal";
import { BILLING_MODE_LABELS } from "../../data/wizardOptions";

const RATE_DISPLAY_LIMIT = 5;
const RATE_PREVIEW_COUNT = 4;

const RATE_PERIOD_SUFFIX = { HOURLY: "/ hr", DAILY: "/ day", WEEKLY: "/ wk" };
const RATE_PERIOD_LABEL = { HOURLY: "Hourly", DAILY: "Daily", WEEKLY: "Weekly" };

function formatBoolean(flag) {
  return flag ? "Enabled" : "Disabled";
}

function formatDisplayDate(isoValue) {
  if (!isoValue || !/^\d{4}-\d{2}-\d{2}$/.test(isoValue)) return isoValue;
  const date = new Date(`${isoValue}T00:00:00`);
  if (Number.isNaN(date.getTime())) return isoValue;
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function formatMoney(value, currency) {
  if (value === "" || value === null || value === undefined) return null;
  const num = Number(value);
  if (Number.isNaN(num)) return String(value);
  const formatted = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(num);
  return currency ? `${currency} ${formatted}` : formatted;
}

function ratePeriodSuffix(period) {
  if (!period) return "";
  return RATE_PERIOD_SUFFIX[period] || `/ ${String(period).toLowerCase()}`;
}

function ratePeriodLabel(period) {
  if (!period) return "—";
  return RATE_PERIOD_LABEL[period] || period;
}

function rateDateRange(role) {
  if (!role.effectiveFrom && !role.effectiveTo) return null;
  return `${role.effectiveFrom ? formatDisplayDate(role.effectiveFrom) : "—"} – ${
    role.effectiveTo ? formatDisplayDate(role.effectiveTo) : "Ongoing"
  }`;
}

// The commercial section's "Effective From/To" reflect the active pricing
// model's own date fields — there is no single top-level billingConfig date,
// and role-based rates carry per-role dates instead of one shared period.
function getCommercialEffectiveDates(billingConfig) {
  const { billingType, billingMode } = billingConfig;

  if (billingType === "TIME_MATERIAL" && (billingMode === "STANDARD" || !billingMode)) {
    return {
      from: billingConfig.timeAndMaterial?.effectiveFrom || null,
      to: billingConfig.timeAndMaterial?.effectiveTo || null,
    };
  }
  if (billingType === "RECURRING" && billingMode === "MONTHLY_RETAINER") {
    return { from: billingConfig.monthlyRetainer?.billingStartDate || null, to: null };
  }
  if (billingType === "RECURRING" && billingMode === "SUBSCRIPTION") {
    return {
      from: billingConfig.subscription?.startDate || null,
      to: billingConfig.subscription?.endDate || null,
    };
  }
  return { from: null, to: null };
}

function SectionShell({ icon, title, stepId, onEdit, children }) {
  const Icon = icon;
  return (
    <PageCard className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
      <PageCardContent className="p-0">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/60 px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0A0082]/8 text-[#0A0082]">
              <Icon className="h-4 w-4" />
            </span>
            <h3 className="text-sm font-bold tracking-wide text-slate-900">{title}</h3>
          </div>
          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(stepId)}
              className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 transition-colors hover:bg-indigo-100"
            >
              <Pencil className="h-3 w-3" /> Edit
            </button>
          )}
        </div>
        <div className="px-5">{children}</div>
      </PageCardContent>
    </PageCard>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-2.5 text-sm last:border-0">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-semibold text-slate-800">{value || "—"}</span>
    </div>
  );
}

function ReviewSection({ icon, title, stepId, onEdit, rows }) {
  return (
    <SectionShell icon={icon} title={title} stepId={stepId} onEdit={onEdit}>
      <div>
        {rows.map((row, index) => (
          <InfoRow key={`${row.label}-${index}`} label={row.label} value={row.value} />
        ))}
      </div>
    </SectionShell>
  );
}

function PricingTable({ rows }) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-100">
      <table className="w-full text-sm">
        <tbody className="divide-y divide-slate-100">
          {rows.map((row, index) => (
            <tr key={`${row.label}-${index}`}>
              <td className="w-1/2 px-4 py-2 text-slate-500">{row.label}</td>
              <td className="w-1/2 px-4 py-2 text-right font-semibold text-slate-800">
                {row.value ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RoleRatesTable({ roles, currency }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-100">
      <table className="w-full text-sm">
        <colgroup>
          <col className="w-[26%]" />
          <col className="w-[20%]" />
          <col className="w-[18%]" />
          <col className="w-[36%]" />
        </colgroup>
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50/60 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            <th className="px-4 py-3">Role</th>
            <th className="px-4 py-3">Rate</th>
            <th className="px-4 py-3">Frequency</th>
            <th className="px-4 py-3">Effective Period</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {roles.map((role, index) => (
            <tr key={`${role.role}-${index}`}>
              <td className="px-4 py-3.5 font-semibold text-slate-800">{role.role || "—"}</td>
              <td className="px-4 py-3.5 font-bold text-slate-900">{formatMoney(role.rate, currency) || "—"}</td>
              <td className="px-4 py-3.5 text-slate-600">{ratePeriodLabel(role.ratePeriod)}</td>
              <td className="px-4 py-3.5 whitespace-nowrap text-slate-500">{rateDateRange(role) || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RoleRatesDrawer({ isOpen, onClose, roles, currency }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return roles;
    const q = query.trim().toLowerCase();
    return roles.filter((role) => (role.role || "").toLowerCase().includes(q));
  }, [roles, query]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`All rates (${roles.length})`}
      bodyClassName="p-0"
      maxHeight="max-h-[82vh]"
      panelStyle={{ width: "78vw", maxWidth: "1400px" }}
    >
      <div className="border-b border-slate-100 p-5">
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search role..."
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm shadow-sm outline-none transition focus:border-[#0A0082] focus:ring-2 focus:ring-[#0A0082]/20"
          />
        </div>
      </div>
      <div className="max-h-[62vh] overflow-y-auto p-5">
        {filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">No roles match &quot;{query}&quot;.</p>
        ) : (
          <RoleRatesTable roles={filtered} currency={currency} />
        )}
      </div>
    </Modal>
  );
}

function RoleRatesList({ roles, currency }) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  if (roles.length === 0) {
    return <InfoRow label="Roles Configured" value="—" />;
  }

  if (roles.length <= RATE_DISPLAY_LIMIT) {
    return <RoleRatesTable roles={roles} currency={currency} />;
  }

  return (
    <div className="space-y-2.5 pb-2.5">
      <RoleRatesTable roles={roles.slice(0, RATE_PREVIEW_COUNT)} currency={currency} />
      <button
        type="button"
        onClick={() => setDrawerOpen(true)}
        className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-300 py-2 text-sm font-semibold text-[#0A0082] transition-colors hover:bg-[#0A0082]/5"
      >
        View all {roles.length} rates <ChevronRight className="h-3.5 w-3.5" />
      </button>
      <RoleRatesDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} roles={roles} currency={currency} />
    </div>
  );
}

export default function ReviewActivateStep({ wizardData, onEditStep }) {
  const { projectInfo = {}, billingConfig = {}, controls = {} } = wizardData;

  const currency = projectInfo.projectBudgetCurrency || projectInfo.currency || "";

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
  const roleRateRows = (billingConfig.timeAndMaterial?.roles || []).filter(
    (roleRate) => roleRate.role || roleRate.rate
  );
  const standardRate = billingConfig.timeAndMaterial || {};
  const standardRateDateRange = rateDateRange(standardRate);
  const commercialEffectiveDates = getCommercialEffectiveDates(billingConfig);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ReviewSection
          icon={FolderKanban}
          title="Project"
          stepId={1}
          onEdit={onEditStep}
          rows={[
            { label: "Client", value: projectInfo.clientName },
            { label: "Project", value: projectInfo.projectName },
            { label: "Project Code", value: projectInfo.projectCode },
            {
              label: "Duration",
              value: projectInfo.startDate
                ? `${formatDisplayDate(projectInfo.startDate)} to ${formatDisplayDate(projectInfo.endDate) || "Ongoing"}`
                : null,
            },
            { label: "Project Budget", value: formatMoney(projectInfo.projectBudget, currency) },
          ]}
        />

        <ReviewSection
          icon={Coins}
          title="Commercial"
          stepId={2}
          onEdit={onEditStep}
          rows={[
            { label: "Billing Type", value: billingTypeLabel },
            { label: "Billing Frequency", value: billingFrequencyLabel },
            { label: "Currency", value: currency },
            { label: "Effective From", value: formatDisplayDate(commercialEffectiveDates.from) },
            {
              label: "Effective To",
              value: commercialEffectiveDates.from
                ? formatDisplayDate(commercialEffectiveDates.to) || "Ongoing"
                : null,
            },
          ]}
        />
      </div>

      {/* Full form width so role-based rate tables have room to breathe instead of scrolling horizontally. */}
      <SectionShell icon={Wallet} title="Pricing" stepId={2} onEdit={onEditStep}>
        <div className="space-y-3 py-3.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
              {billingTypeLabel}
            </span>
            {pricingModel && ["TIME_MATERIAL", "RECURRING"].includes(billingConfig.billingType) && (
              <span className="text-xs font-medium text-slate-400">
                {BILLING_MODE_LABELS[pricingModel] || pricingModel}
              </span>
            )}
          </div>

          {billingConfig.billingType === "TIME_MATERIAL" &&
            (pricingModel === "STANDARD" || !pricingModel) && (
              <PricingTable
                rows={[
                  {
                    label: "Standard Rate",
                    value: `${formatMoney(standardRate.rate, currency) || "—"} ${ratePeriodSuffix(standardRate.ratePeriod)}`,
                  },
                  { label: "Effective Period", value: standardRateDateRange },
                ]}
              />
            )}

          {billingConfig.billingType === "TIME_MATERIAL" && pricingModel === "ROLE_BASED" && (
            <RoleRatesList roles={roleRateRows} currency={currency} />
          )}

          {billingConfig.billingType === "FIXED_PRICE" && (() => {
            const fixedPrice = billingConfig.fixedPrice || {};
            const contractValue = Number(fixedPrice.totalContractValue) || 0;
            const retentionPercent = Number(fixedPrice.retentionPercent) || 0;
            const hasRetention = Boolean(fixedPrice.retentionPercent) && retentionPercent > 0;
            const retentionAmount = hasRetention ? contractValue * (retentionPercent / 100) : 0;
            const billableAmount = contractValue - retentionAmount;
            const advanceReceived = Number(fixedPrice.advanceReceived) || 0;
            const hasAdvance = Boolean(fixedPrice.advanceReceived) && advanceReceived > 0;
            const remainingReceivable = billableAmount - (hasAdvance ? advanceReceived : 0);
            const isOneTime = billingConfig.billingFrequency === "ONE_TIME";

            return (
              <PricingTable
                rows={[
                  { label: "Contract Value", value: formatMoney(fixedPrice.totalContractValue, currency) },
                  { label: "Retention %", value: hasRetention ? `${retentionPercent}%` : "—" },
                  {
                    label: "Retention Amount",
                    value: hasRetention ? `-${formatMoney(retentionAmount, currency)}` : formatMoney(0, currency),
                  },
                  { label: "Billable Amount", value: formatMoney(billableAmount, currency) },
                  {
                    label: "Advance Received",
                    value: hasAdvance ? `-${formatMoney(advanceReceived, currency)}` : formatMoney(0, currency),
                  },
                  { label: "Remaining Receivable", value: formatMoney(remainingReceivable, currency) },
                  {
                    label: "Billing Frequency / Billing Event",
                    value: `${billingFrequencyLabel} — ${isOneTime ? "Single (One-Time)" : "Scheduled per billing frequency"}`,
                  },
                  ...(fixedPrice.effectiveFrom || fixedPrice.effectiveTo
                    ? [
                        {
                          label: "Effective Period",
                          value: `${formatDisplayDate(fixedPrice.effectiveFrom) || "—"} - ${
                            formatDisplayDate(fixedPrice.effectiveTo) || "Ongoing"
                          }`,
                        },
                      ]
                    : []),
                  ...(fixedPrice.remarks ? [{ label: "Remarks", value: fixedPrice.remarks }] : []),
                ]}
              />
            );
          })()}

          {billingConfig.billingType === "MILESTONE" && (
            <PricingTable rows={[{ label: "Milestones", value: `${(billingConfig.milestones || []).length} defined` }]} />
          )}

          {billingConfig.billingType === "RECURRING" && billingConfig.billingMode === "MONTHLY_RETAINER" && (
            <PricingTable
              rows={[
                { label: "Monthly Retainer Amount", value: formatMoney(billingConfig.monthlyRetainer?.amount, currency) },
                {
                  label: "Auto Invoice Generation",
                  value: formatBoolean(billingConfig.monthlyRetainer?.autoInvoiceGeneration),
                },
              ]}
            />
          )}

          {billingConfig.billingType === "RECURRING" && billingConfig.billingMode === "SUBSCRIPTION" && (
            <PricingTable
              rows={[
                { label: "Subscription Amount", value: formatMoney(billingConfig.subscription?.amount, currency) },
                { label: "Billing Cycle", value: billingConfig.subscription?.billingCycle },
                { label: "Auto Renewal", value: formatBoolean(billingConfig.subscription?.autoRenewal) },
              ]}
            />
          )}
        </div>
      </SectionShell>

      <ReviewSection
        icon={Receipt}
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
                : null,
          },
          ...(controls.autoInvoiceGeneration === true
            ? [{ label: "Generation Day", value: controls.invoiceGenerationDay }]
            : []),
          { label: "Payment Terms", value: controls.paymentTermName || controls.paymentTerms || controls.paymentTermId },
          { label: "Tax Region", value: controls.taxRegionName || controls.taxRegionId },
          { label: "Expense Billing", value: controls.expenseBillingEligible ? "Eligible" : "Not Eligible" },
        ]}
      />
    </div>
  );
}
