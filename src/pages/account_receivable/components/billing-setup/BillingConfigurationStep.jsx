import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";

import FormInput from "../../../../components/forms/FormInput";
import FormSelect from "../../../../components/forms/FormSelect";
import FormDatePicker from "../../../../components/forms/FormDatePicker";
import Button from "../../../../components/Button/Button";
import GenericTable from "../../../../components/Table/table";
import Modal from "../../../../components/ui/Modal";
import ConfirmationModal from "../../../../components/confirmation_modal/ConfirmationModal";
import StatusBadge from "../../../../components/status/statusbadge";
import { Fonts } from "../../../../components/Fonts/Fonts";
import RadioCardGroup from "../common/RadioCardGroup";
import ToggleSwitch from "../common/ToggleSwitch";
import {
  BILLING_TYPES,
  BILLING_TYPE_LABELS,
  RECURRING_BILLING_MODE_OPTIONS,
  BILLING_MODE_LABELS,
  BILLING_FREQUENCIES,
  RATE_CARD_OPTIONS,
  OVERTIME_RULE_OPTIONS,
  ROUNDING_RULE_OPTIONS,
  INVOICE_SCHEDULE_TYPE_OPTIONS,
  RECOGNITION_TRIGGER_OPTIONS,
  BILLING_CYCLE_OPTIONS,
  MILESTONE_STATUS_OPTIONS,
  CURRENCY_OPTIONS,
} from "../../data/wizardOptions";

let milestoneSeq = 0;
function nextMilestoneId() {
  milestoneSeq += 1;
  return `MS-NEW-${milestoneSeq}`;
}

function frequencyLabel(value) {
  return BILLING_FREQUENCIES.find((option) => option.value === value)?.label || value || "—";
}

function SectionCard({ title, children }) {
  return (
    <div className="rounded-xl border border-slate-200 p-5">
      <h3 className="mb-4 text-sm font-semibold text-slate-900">{title}</h3>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">{children}</div>
    </div>
  );
}

function SummaryCard({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col justify-center min-h-[72px]">
      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</span>
      <span className="text-base font-bold text-slate-900 mt-1">{value || "—"}</span>
    </div>
  );
}

function ReadOnlyField({ label, value }) {
  return <FormInput label={label} value={value || "—"} disabled onChange={() => {}} />;
}

function BillingSummaryHeader({ projectInfo }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <SummaryCard
        label="Billing Type"
        value={BILLING_TYPE_LABELS[projectInfo.billingType] || projectInfo.billingType}
      />
      <SummaryCard
        label="Billing Mode"
        value={BILLING_MODE_LABELS[projectInfo.billingMode] || projectInfo.billingMode}
      />
      <SummaryCard label="Billing Frequency" value={frequencyLabel(projectInfo.billingFrequency)} />
      <SummaryCard label="Currency" value={projectInfo.currency} />
    </div>
  );
}

function TimeAndMaterialForm({ value = {}, onChange, billingMode, currency, isExisting }) {
  const update = (patch) => onChange({ ...value, ...patch });

  // Initialize roles if empty
  const roles = value.roles || [
    { role: "Developer", rate: "" },
    { role: "Tester", rate: "" },
    { role: "Project Manager", rate: "" },
  ];

  const handleRoleChange = (index, field, val) => {
    const updatedRoles = [...roles];
    updatedRoles[index] = { ...updatedRoles[index], [field]: val };
    update({ roles: updatedRoles });
  };

  const addRole = () => {
    update({ roles: [...roles, { role: "", rate: "" }] });
  };

  const removeRole = (index) => {
    update({ roles: roles.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-6">
      {/* Rate Configuration (Dynamic Section) */}
      <div className="rounded-xl border border-slate-200 p-5">
        <h3 className="mb-4 text-sm font-semibold text-slate-900">
          Rate Configuration
        </h3>

        {billingMode === "STANDARD" && (
          <div className="max-w-md">
            <FormInput
              label="Hourly Billing Rate *"
              name="billingRate"
              type="number"
              value={value.billingRate || ""}
              onChange={(event) => update({ billingRate: event.target.value })}
              placeholder={`e.g. 1800 (${currency})`}
              disabled={isExisting}
            />
          </div>
        )}

        {billingMode === "ROLE_BASED" && (
          <div className="space-y-4">
            <div className="w-full overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-700 font-semibold">
                    <th className="px-4 py-2.5 text-left">Role</th>
                    <th className="px-4 py-2.5 text-left">Hourly Rate ({currency})</th>
                    {!isExisting && <th className="px-4 py-2.5 text-center w-20">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {roles.map((item, index) => (
                    <tr key={index}>
                      <td className="px-4 py-2">
                        <FormInput
                          value={item.role}
                          onChange={(e) => handleRoleChange(index, "role", e.target.value)}
                          placeholder="e.g. Developer"
                          disabled={isExisting}
                        />
                      </td>
                      <td className="px-4 py-2">
                        <FormInput
                          type="number"
                          value={item.rate}
                          onChange={(e) => handleRoleChange(index, "rate", e.target.value)}
                          placeholder="e.g. 1500"
                          disabled={isExisting}
                        />
                      </td>
                      {!isExisting && (
                        <td className="px-4 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => removeRole(index)}
                            className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!isExisting && (
              <button
                type="button"
                onClick={addRole}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700 hover:underline animate-fade-in"
              >
                <Plus className="h-4 w-4" /> Add Role
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function FixedPriceForm({ value = {}, onChange, currency }) {
  const update = (patch) => onChange({ ...value, ...patch });

  return (
    <div className="space-y-4">
      <h2 className={Fonts.heading4}>Fixed Price Billing Configuration</h2>

      <SectionCard title="Contract Value">
        <FormInput
          label="Total Contract Value"
          name="totalContractValue"
          type="number"
          value={value.totalContractValue || ""}
          onChange={(event) => update({ totalContractValue: event.target.value })}
          placeholder="e.g. 8500000"
        />
        <ReadOnlyField label="Currency" value={currency} />
        <FormInput
          label="Advance Received"
          name="advanceReceived"
          type="number"
          value={value.advanceReceived || ""}
          onChange={(event) => update({ advanceReceived: event.target.value })}
          placeholder="e.g. 500000"
        />
        <FormInput
          label="Retention %"
          name="retentionPercent"
          type="number"
          value={value.retentionPercent || ""}
          onChange={(event) => update({ retentionPercent: event.target.value })}
          placeholder="e.g. 5"
        />
      </SectionCard>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-slate-900">Invoice Schedule</h3>
        <RadioCardGroup
          name="invoiceScheduleType"
          options={INVOICE_SCHEDULE_TYPE_OPTIONS}
          value={value.invoiceScheduleType || ""}
          onChange={(next) => update({ invoiceScheduleType: next })}
          columns={3}
        />
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-slate-900">Recognition</h3>
        <RadioCardGroup
          name="recognitionTrigger"
          options={RECOGNITION_TRIGGER_OPTIONS}
          value={value.recognitionTrigger || ""}
          onChange={(next) => update({ recognitionTrigger: next })}
          columns={2}
        />
      </div>
    </div>
  );
}

const EMPTY_MILESTONE_FORM = { name: "", amount: "", dueDate: "", status: "PENDING" };

function MilestoneForm({ milestones = [], settings = {}, onMilestonesChange, onSettingsChange }) {
  const [modalState, setModalState] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const openAddModal = () => setModalState({ mode: "add", form: EMPTY_MILESTONE_FORM });
  const openEditModal = (milestone) =>
    setModalState({
      mode: "edit",
      id: milestone.id,
      form: {
        name: milestone.name,
        amount: milestone.amount,
        dueDate: milestone.dueDate,
        status: milestone.status || "PENDING",
      },
    });

  const handleModalFieldChange = (patch) =>
    setModalState((prev) => ({ ...prev, form: { ...prev.form, ...patch } }));

  const handleModalSave = () => {
    const { mode, id, form } = modalState;
    if (mode === "add") {
      onMilestonesChange([...milestones, { id: nextMilestoneId(), ...form }]);
    } else {
      onMilestonesChange(milestones.map((milestone) => (milestone.id === id ? { ...milestone, ...form } : milestone)));
    }
    setModalState(null);
  };

  const handleConfirmDelete = () => {
    onMilestonesChange(milestones.filter((milestone) => milestone.id !== deleteTarget.id));
    setDeleteTarget(null);
  };

  const isModalFormValid = Boolean(modalState?.form.name && modalState?.form.amount && modalState?.form.dueDate);

  const tableRows = milestones.map((milestone) => ({
    name: milestone.name,
    amount: milestone.amount,
    dueDate: milestone.dueDate,
    status: <StatusBadge label={milestone.status === "COMPLETED" ? "Completed" : "Pending"} size="sm" />,
    actions: (
      <div className="flex items-center justify-center gap-2">
        <Button variant="ghost" size="icon" title="Edit milestone" onClick={() => openEditModal(milestone)}>
          <Pencil className="h-4 w-4 text-blue-600" />
        </Button>
        <Button variant="ghost" size="icon" title="Remove milestone" onClick={() => setDeleteTarget(milestone)}>
          <Trash2 className="h-4 w-4 text-red-500" />
        </Button>
      </div>
    ),
  }));

  return (
    <div className="space-y-4">
      <h2 className={Fonts.heading4}>Milestone Billing Configuration</h2>

      <div className="rounded-xl border border-slate-200 p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">Milestones</h3>
          <Button variant="outline" size="small" onClick={openAddModal}>
            <Plus className="h-3.5 w-3.5" /> Add Milestone
          </Button>
        </div>

        {milestones.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">
            No milestones added yet. Add at least one milestone.
          </p>
        ) : (
          <div className="w-full overflow-x-auto">
            <GenericTable
              headers={["Milestone Name", "Amount", "Due Date", "Status", "Actions"]}
              columns={["name", "amount", "dueDate", "status", "actions"]}
              rows={tableRows}
            />
          </div>
        )}
      </div>

      <div className="space-y-4 rounded-xl border border-slate-200 p-5">
        <ToggleSwitch
          label="Bill only completed milestones"
          checked={Boolean(settings.billOnlyCompletedMilestones)}
          onChange={(checked) => onSettingsChange({ ...settings, billOnlyCompletedMilestones: checked })}
        />
        <ToggleSwitch
          label="Allow partial milestone billing"
          checked={Boolean(settings.allowPartialMilestoneBilling)}
          onChange={(checked) => onSettingsChange({ ...settings, allowPartialMilestoneBilling: checked })}
        />
      </div>

      <Modal
        isOpen={Boolean(modalState)}
        onClose={() => setModalState(null)}
        title={modalState?.mode === "add" ? "Add Milestone" : "Edit Milestone"}
        width="420px"
      >
        {modalState && (
          <div className="space-y-4">
            <FormInput
              label="Milestone Name"
              requiredMark
              name="name"
              value={modalState.form.name}
              onChange={(event) => handleModalFieldChange({ name: event.target.value })}
              placeholder="e.g. UAT Completion"
            />
            <FormInput
              label="Amount"
              requiredMark
              name="amount"
              type="number"
              value={modalState.form.amount}
              onChange={(event) => handleModalFieldChange({ amount: event.target.value })}
              placeholder="e.g. 1200000"
            />
            <FormDatePicker
              label="Due Date"
              name="dueDate"
              value={modalState.form.dueDate}
              onChange={(event) => handleModalFieldChange({ dueDate: event.target.value })}
            />
            {modalState.mode === "edit" && (
              <FormSelect
                label="Status"
                name="status"
                value={modalState.form.status}
                onChange={(event) => handleModalFieldChange({ status: event.target.value })}
                options={MILESTONE_STATUS_OPTIONS}
              />
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setModalState(null)}>
                Cancel
              </Button>
              <Button variant="primary" disabled={!isModalFormValid} onClick={handleModalSave}>
                Save Milestone
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmationModal
        isOpen={Boolean(deleteTarget)}
        title="Remove Milestone"
        message={deleteTarget ? `Remove milestone "${deleteTarget.name}"? This cannot be undone.` : ""}
        confirmText="Remove"
        variant="danger"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}

function MonthlyRetainerForm({ value = {}, onChange, billingFrequency }) {
  const update = (patch) => onChange({ ...value, ...patch });

  return (
    <div className="space-y-4">
      <h2 className={Fonts.heading4}>Monthly Retainer Configuration</h2>

      <SectionCard title="Retainer Terms">
        <FormInput
          label="Monthly Retainer Amount"
          name="amount"
          type="number"
          value={value.amount || ""}
          onChange={(event) => update({ amount: event.target.value })}
          placeholder="e.g. 450000"
        />
        <FormDatePicker
          label="Billing Start Date"
          name="billingStartDate"
          value={value.billingStartDate || ""}
          onChange={(event) => update({ billingStartDate: event.target.value })}
        />
        <ReadOnlyField label="Billing Frequency" value={frequencyLabel(billingFrequency)} />
        <FormInput
          label="Billing Day of Month"
          name="billingDayOfMonth"
          type="number"
          min="1"
          max="31"
          value={value.billingDayOfMonth || ""}
          onChange={(event) => update({ billingDayOfMonth: event.target.value })}
          placeholder="e.g. 1"
        />
      </SectionCard>

      <div className="space-y-4 rounded-xl border border-slate-200 p-5">
        <ToggleSwitch
          label="Auto Invoice Generation"
          checked={Boolean(value.autoInvoiceGeneration)}
          onChange={(checked) => update({ autoInvoiceGeneration: checked })}
        />
        <ToggleSwitch
          label="Pro-rate First Month"
          checked={Boolean(value.prorateFirstMonth)}
          onChange={(checked) => update({ prorateFirstMonth: checked })}
        />
      </div>
    </div>
  );
}

function SubscriptionForm({ value = {}, onChange }) {
  const update = (patch) => onChange({ ...value, ...patch });

  return (
    <div className="space-y-4">
      <h2 className={Fonts.heading4}>Subscription Billing Configuration</h2>

      <SectionCard title="Subscription Terms">
        <FormInput
          label="Subscription Plan"
          name="plan"
          value={value.plan || ""}
          onChange={(event) => update({ plan: event.target.value })}
          placeholder="e.g. Enterprise Tier"
        />
        <FormInput
          label="Subscription Amount"
          name="amount"
          type="number"
          value={value.amount || ""}
          onChange={(event) => update({ amount: event.target.value })}
          placeholder="e.g. 25000"
        />
        <FormSelect
          label="Billing Cycle"
          name="billingCycle"
          value={value.billingCycle || ""}
          onChange={(event) => update({ billingCycle: event.target.value })}
          options={BILLING_CYCLE_OPTIONS}
        />
        <FormInput
          label="Grace Period (days)"
          name="gracePeriodDays"
          type="number"
          value={value.gracePeriodDays || ""}
          onChange={(event) => update({ gracePeriodDays: event.target.value })}
          placeholder="e.g. 7"
        />
        <FormDatePicker
          label="Subscription Start Date"
          name="startDate"
          value={value.startDate || ""}
          onChange={(event) => update({ startDate: event.target.value })}
        />
        <FormDatePicker
          label="Subscription End Date"
          name="endDate"
          value={value.endDate || ""}
          onChange={(event) => update({ endDate: event.target.value })}
          min={value.startDate || undefined}
        />
      </SectionCard>

      <div className="rounded-xl border border-slate-200 p-5">
        <ToggleSwitch
          label="Auto Renewal"
          checked={Boolean(value.autoRenewal)}
          onChange={(checked) => update({ autoRenewal: checked })}
        />
      </div>
    </div>
  );
}

export default function BillingConfigurationStep({ value = {}, onChange, setupMode, projectInfo = {}, onProjectInfoChange }) {
  const isExisting = false; // Billing mode and rates are always configurable for new billing setups
  const billingType = value.billingType || "";
  const billingMode = value.billingMode || "";
  const billingFrequency = value.billingFrequency || "";
  const currency = projectInfo?.currency || "";

  const update = (patch) => onChange({ ...value, ...patch });
  const updateSection = (section, patch) => update({ [section]: patch });

  const billingTypeOptions = BILLING_TYPES.filter((type) =>
    ["TIME_MATERIAL", "MILESTONE", "RECURRING"].includes(type.value)
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="border-b border-slate-100 pb-4">
        <h2 className={Fonts.heading3}>Commercial Configuration</h2>
        <p className="mt-1 text-sm text-slate-500">
          Configure pricing, currency, and rate calculation for this billing setup.
        </p>
      </div>

      {/* Section 1: Billing scope */}
      <div className="space-y-5">

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div className="max-w-xs">
            <FormSelect
              label="Billing Currency *"
              name="currency"
              value={currency || ""}
              onChange={(e) => onProjectInfoChange({ ...projectInfo, currency: e.target.value })}
              options={CURRENCY_OPTIONS.filter((opt) => opt.value !== "")}
            />
          </div>

          <div className="md:col-span-2 space-y-2">
            <label className="block text-sm font-medium text-slate-700">
              Billing Type <span className="text-red-500">*</span>
            </label>
            <RadioCardGroup
              name="billingType"
              options={billingTypeOptions}
              value={billingType}
              onChange={(next) => {
                update({ billingType: next, billingMode: "" });
              }}
            />
          </div>

          <div className="md:col-span-2 space-y-2">
            <label className="block text-sm font-medium text-slate-700">
              Billing Frequency <span className="text-red-500">*</span>
            </label>
            <RadioCardGroup
              name="billingFrequency"
              options={BILLING_FREQUENCIES}
              value={billingFrequency}
              onChange={(next) => update({ billingFrequency: next })}
              columns={3}
            />
          </div>
        </div>
      </div>

      {/* Section 2: Pricing model (T&M or Recurring) */}
      {!isExisting && (billingType === "TIME_MATERIAL" || billingType === "RECURRING") && (
        <div className="space-y-6 pt-6 border-t border-slate-100">
          <div>
            <h3 className={Fonts.subheading}>
              Pricing model
            </h3>
          </div>

          <RadioCardGroup
            name="billingMode"
            options={
              billingType === "TIME_MATERIAL"
                ? [
                    { value: "STANDARD", label: "Standard Rate", description: "One hourly rate applies to all approved billable hours." },
                    { value: "ROLE_BASED", label: "Role-Based Rates", description: "Different hourly rates are maintained for each project role." },
                  ]
                : [
                    { value: "MONTHLY_RETAINER", label: "Monthly Retainer", description: "Bill a fixed recurring amount every billing period." },
                    { value: "SUBSCRIPTION", label: "Subscription", description: "Bill a recurring subscription fee for ongoing services." },
                  ]
            }
            value={billingMode || ""}
            onChange={(next) => update({ billingMode: next })}
            columns={2}
          />
        </div>
      )}

      {/* Rate Details / Rate Configuration (Dynamic) */}
      {(isExisting || billingMode || (billingType !== "TIME_MATERIAL" && billingType !== "RECURRING" && billingType !== "")) ? (
        <div className="space-y-6 pt-6 border-t border-slate-100">
          <div>
            <h3 className={Fonts.subheading}>
              Rate details
            </h3>
          </div>
          <div>
            {billingType === "TIME_MATERIAL" && (
              <TimeAndMaterialForm
                value={value.timeAndMaterial}
                onChange={(next) => updateSection("timeAndMaterial", next)}
                billingMode={billingMode}
                currency={currency}
                isExisting={isExisting}
              />
            )}

            {billingType === "FIXED_PRICE" && (
              <FixedPriceForm
                value={value.fixedPrice}
                onChange={(next) => updateSection("fixedPrice", next)}
                currency={currency}
              />
            )}

            {billingType === "MILESTONE" && (
              <MilestoneForm
                milestones={value.milestones}
                settings={value.milestoneSettings}
                onMilestonesChange={(next) => update({ milestones: next })}
                onSettingsChange={(next) => update({ milestoneSettings: next })}
              />
            )}

            {billingType === "RECURRING" && billingMode === "MONTHLY_RETAINER" && (
              <MonthlyRetainerForm
                value={value.monthlyRetainer}
                onChange={(next) => updateSection("monthlyRetainer", next)}
                billingFrequency={billingFrequency}
              />
            )}

            {billingType === "RECURRING" && billingMode === "SUBSCRIPTION" && (
              <SubscriptionForm value={value.subscription} onChange={(next) => updateSection("subscription", next)} />
            )}
          </div>
        </div>
      ) : (
        billingType !== "" && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/55 p-8 text-center text-slate-500">
            <p className="text-sm font-medium">Please select a Pricing Model to configure rates.</p>
          </div>
        )
      )}
    </div>
  );
}

