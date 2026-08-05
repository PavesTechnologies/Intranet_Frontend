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
import RadioCardGroup from "../RadioCardGroup";
import ToggleSwitch from "../ToggleSwitch";
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

function ReadOnlyField({ label, value }) {
  return <FormInput label={label} value={value || "—"} disabled onChange={() => {}} />;
}

function BillingSummaryHeader({ projectInfo }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ReadOnlyField
          label="Billing Type"
          value={BILLING_TYPE_LABELS[projectInfo.billingType] || projectInfo.billingType}
        />
        <ReadOnlyField
          label="Billing Mode"
          value={BILLING_MODE_LABELS[projectInfo.billingMode] || projectInfo.billingMode}
        />
        <ReadOnlyField label="Billing Frequency" value={frequencyLabel(projectInfo.billingFrequency)} />
        <ReadOnlyField label="Currency" value={projectInfo.currency} />
      </div>
      <p className="mt-3 text-xs text-slate-500">
        These values are set by the enterprise project and cannot be changed from this step.
      </p>
    </div>
  );
}

function TimeAndMaterialForm({ value = {}, onChange, currency, billingFrequency }) {
  const update = (patch) => onChange({ ...value, ...patch });

  return (
    <div className="space-y-4">
      <h2 className={Fonts.heading4}>Time &amp; Material Billing Configuration</h2>

      <SectionCard title="Rate Configuration">
        <FormSelect
          label="Rate Card"
          name="rateCard"
          value={value.rateCard || ""}
          onChange={(event) => update({ rateCard: event.target.value })}
          options={RATE_CARD_OPTIONS}
        />
        <FormInput
          label="Billing Rate (per hour)"
          name="billingRate"
          type="number"
          value={value.billingRate || ""}
          onChange={(event) => update({ billingRate: event.target.value })}
          placeholder="e.g. 1800"
        />
        <ReadOnlyField label="Currency" value={currency} />
        <FormDatePicker
          label="Rate Effective From"
          name="rateEffectiveFrom"
          value={value.rateEffectiveFrom || ""}
          onChange={(event) => update({ rateEffectiveFrom: event.target.value })}
        />
      </SectionCard>

      <SectionCard title="Time Rules">
        <FormSelect
          label="Overtime Rule"
          name="overtimeRule"
          value={value.overtimeRule || "NONE"}
          onChange={(event) => update({ overtimeRule: event.target.value })}
          options={OVERTIME_RULE_OPTIONS}
        />
        <FormInput
          label="Minimum Billing Hours"
          name="minimumBillingHours"
          type="number"
          value={value.minimumBillingHours || ""}
          onChange={(event) => update({ minimumBillingHours: event.target.value })}
          placeholder="e.g. 8"
        />
        <FormInput
          label="Maximum Billable Hours per Day"
          name="maximumBillableHoursPerDay"
          type="number"
          value={value.maximumBillableHoursPerDay || ""}
          onChange={(event) => update({ maximumBillableHoursPerDay: event.target.value })}
          placeholder="e.g. 10"
        />
        <FormSelect
          label="Rounding Rule"
          name="roundingRule"
          value={value.roundingRule || "NONE"}
          onChange={(event) => update({ roundingRule: event.target.value })}
          options={ROUNDING_RULE_OPTIONS}
        />
      </SectionCard>

      <div className="rounded-xl border border-slate-200 p-5">
        <h3 className="mb-4 text-sm font-semibold text-slate-900">Billing Basis</h3>
        <div className="space-y-4">
          <ToggleSwitch
            label="Bill approved timesheets only"
            checked={value.billApprovedTimesheetsOnly !== false}
            onChange={(checked) => update({ billApprovedTimesheetsOnly: checked })}
          />
          <ToggleSwitch
            label="Include overtime"
            checked={Boolean(value.includeOvertime)}
            onChange={(checked) => update({ includeOvertime: checked })}
          />
          <ToggleSwitch
            label="Include leave/holiday hours"
            checked={Boolean(value.includeLeaveHours)}
            onChange={(checked) => update({ includeLeaveHours: checked })}
          />
        </div>
      </div>

      <SectionCard title="Invoice Schedule">
        <ReadOnlyField label="Billing Frequency" value={frequencyLabel(billingFrequency)} />
        <FormInput
          label="Billing Cut-off Day"
          name="billingCutoffDay"
          type="number"
          min="1"
          max="31"
          value={value.billingCutoffDay || ""}
          onChange={(event) => update({ billingCutoffDay: event.target.value })}
          placeholder="e.g. 25"
        />
      </SectionCard>
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

export default function BillingConfigurationStep({ value = {}, onChange, setupMode, projectInfo = {} }) {
  const isExisting = setupMode === "EXISTING";
  const billingType = value.billingType || "";
  const billingMode = value.billingMode || "";
  const billingFrequency = value.billingFrequency || "";
  const currency = projectInfo?.currency || "";

  // Existing/integrated projects treat billingType/billingMode/billingFrequency as
  // synchronized master data from Step 2 — keep billingConfig in sync so Review/Summary
  // read from one consistent place regardless of setup mode, without letting the user edit it here.
  useEffect(() => {
    if (!isExisting || !projectInfo?.projectId) return;
    if (
      value.billingType === projectInfo.billingType &&
      value.billingMode === projectInfo.billingMode &&
      value.billingFrequency === projectInfo.billingFrequency
    ) {
      return;
    }
    onChange({
      ...value,
      billingType: projectInfo.billingType,
      billingMode: projectInfo.billingMode,
      billingFrequency: projectInfo.billingFrequency,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isExisting, projectInfo?.projectId, projectInfo?.billingType, projectInfo?.billingMode, projectInfo?.billingFrequency]);

  const update = (patch) => onChange({ ...value, ...patch });
  const updateSection = (section, patch) => update({ [section]: patch });

  if (isExisting && !projectInfo?.projectId) {
    return (
      <div className="space-y-4">
        <div className="h-5 w-48 animate-pulse rounded bg-slate-200" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-[42px] w-full animate-pulse rounded-lg bg-slate-200" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className={Fonts.heading4}>Billing Configuration</h2>
        <p className="mt-1 text-sm text-slate-500">
          {isExisting
            ? "This project's billing type is set by the enterprise project and cannot be changed here."
            : "Choose how this project will be billed and set the commercial terms for that type."}
        </p>
      </div>

      {isExisting ? (
        <BillingSummaryHeader projectInfo={projectInfo} />
      ) : (
        <>
          <div>
            <h3 className="mb-3 text-sm font-semibold text-slate-900">Billing Type</h3>
            <RadioCardGroup
              name="billingType"
              options={BILLING_TYPES}
              value={billingType}
              onChange={(next) => update({ billingType: next, billingMode: next === "RECURRING" ? billingMode : "" })}
            />
          </div>

          {billingType === "RECURRING" && (
            <div>
              <h3 className="mb-3 text-sm font-semibold text-slate-900">Billing Mode</h3>
              <RadioCardGroup
                name="billingMode"
                options={RECURRING_BILLING_MODE_OPTIONS}
                value={billingMode}
                onChange={(next) => update({ billingMode: next })}
                columns={2}
              />
            </div>
          )}

          <div>
            <h3 className="mb-3 text-sm font-semibold text-slate-900">Billing Frequency</h3>
            <RadioCardGroup
              name="billingFrequency"
              options={BILLING_FREQUENCIES}
              value={billingFrequency}
              onChange={(next) => update({ billingFrequency: next })}
              columns={4}
            />
          </div>
        </>
      )}

      {billingType === "TIME_MATERIAL" && (
        <TimeAndMaterialForm
          value={value.timeAndMaterial}
          onChange={(next) => updateSection("timeAndMaterial", next)}
          currency={currency}
          billingFrequency={billingFrequency}
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
  );
}
