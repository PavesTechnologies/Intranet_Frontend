import { useEffect, useRef, useState } from "react";
import { Check, Plus, Pencil, Trash2, Loader2 } from "lucide-react";

import FormInput from "../../../../components/forms/FormInput";
import FormSelect from "../../../../components/forms/FormSelect";
import FormDatePicker from "../../../../components/forms/FormDatePicker";
import Button from "../../../../components/Button/Button";
import GenericTable from "../../../../components/Table/table";
import Modal from "../../../../components/ui/Modal";
import ConfirmationModal from "../../../../components/confirmation_modal/ConfirmationModal";
import StatusBadge from "../../../../components/status/statusbadge";
import { Fonts } from "../../../../components/Fonts/Fonts";
import { showStatusToast } from "../../../../components/toastfy/toast";
import RadioCardGroup from "../common/RadioCardGroup";
import ToggleSwitch from "../common/ToggleSwitch";
import {
  RECURRING_BILLING_MODE_OPTIONS,
  INVOICE_SCHEDULE_TYPE_OPTIONS,
  RECOGNITION_TRIGGER_OPTIONS,
  MILESTONE_STATUS_OPTIONS,
  CURRENCY_OPTIONS,
} from "../../data/wizardOptions";
import {
  getActiveBillingTypes,
  getActiveBillingFrequencies,
  getTmRateCardsByBillingConfiguration,
  saveTmRateCard,
  deleteTmRateCard,
  getApiErrorMessage,
} from "../../services/billingConfigurationService";

let milestoneSeq = 0;
function nextMilestoneId() {
  milestoneSeq += 1;
  return `MS-NEW-${milestoneSeq}`;
}

function getPricingModelOptions(billingType) {
  switch (billingType) {
    case "TIME_MATERIAL":
      return [
        { value: "STANDARD", label: "Standard Rate" },
        { value: "ROLE_BASED", label: "Role-Based Rates" },
      ];
    case "RECURRING":
      return RECURRING_BILLING_MODE_OPTIONS;
    default:
      return [];
  }
}

// Half-Yearly is no longer offered; display order is fixed regardless of backend order.
const BILLING_FREQUENCY_ORDER = [
  "WEEKLY",
  "BI_WEEKLY",
  "MONTHLY",
  "QUARTERLY",
  "ANNUALLY",
];
const BILLING_TYPE_ORDER = [
  "TIME_MATERIAL",
  "MILESTONE",
  "FIXED_PRICE",
  "RECURRING",
];

function sortByOrder(options, order, key = "value") {
  return [...options].sort((a, b) => {
    const aIndex = order.indexOf(a[key]);
    const bIndex = order.indexOf(b[key]);
    return (
      (aIndex === -1 ? order.length : aIndex) -
      (bIndex === -1 ? order.length : bIndex)
    );
  });
}

function getBillingFrequencyOptions(billingType, frequencies = []) {
  const withoutHalfYearly = frequencies.filter(
    (option) => option.value !== "HALF_YEARLY",
  );

  const scoped =
    billingType === "RECURRING"
      ? withoutHalfYearly.filter((option) =>
        ["MONTHLY", "QUARTERLY", "ANNUALLY"].includes(option.value),
      )
      : withoutHalfYearly;

  return sortByOrder(scoped, BILLING_FREQUENCY_ORDER);
}

const RATE_PERIOD_OPTIONS = [
  { value: "HOURLY", label: "Hourly" },
  { value: "DAILY", label: "Daily" },
  { value: "WEEKLY", label: "Weekly" },
];

const EMPTY_RATE_CARD = {
  role: "",
  roleName: "",
  rate: "",
  ratePeriod: "HOURLY",
  effectiveFrom: "",
  effectiveTo: "",
  rateCardId: null,
  isSaved: false,
};

const mapRateCard = (card = {}, includeRole = true) => ({
  ...(includeRole
    ? { role: card.roleName || card.role || card.name || "" }
    : {}),
  roleName: card.roleName || card.role || card.name || "",
  rate: card.rate ?? card.amount ?? "",
  ratePeriod: card.ratePeriod || card.period || "HOURLY",
  effectiveFrom: card.effectiveFrom || card.validFrom || "",
  effectiveTo: card.effectiveTo || card.validTo || "",
  rateCardId: card.id || card.rateCardId || card.tmRateCardId || null,
  isSaved: Boolean(card.id || card.rateCardId || card.tmRateCardId),
});

function normalizeBillingType(type) {
  const name = String(type?.billingTypeName || "").trim();

  let value = "";

  switch (name.toLowerCase()) {
    case "fixed price":
      value = "FIXED_PRICE";
      break;

    case "timesheet based":
    case "time and material":
    case "time & material":
      value = "TIME_MATERIAL";
      break;

    case "milestone based":
      value = "MILESTONE";
      break;

    case "subscription":
    case "recurring":
      value = "RECURRING";
      break;

    default:
      value = "";
  }

  return {
    ...type,
    value,
    label: value === "RECURRING" ? "Recurring" : name,
    billingTypeId: type.billingTypeId,
  };
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
      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
        {label}
      </span>
      <span className="text-base font-bold text-slate-900 mt-1">
        {value || "—"}
      </span>
    </div>
  );
}

function ReadOnlyField({ label, value }) {
  return <FormInput label={label} value={value || "—"} disabled onChange={() => { }} />;
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

function TimeAndMaterialForm({
  value = {},
  onChange,
  billingMode,
  currency,
  isExisting,
  billingConfigurationId,
  ensureBillingConfigurationId,
  billingConfigurationPayload,
}) {
  const update = (patch) => onChange({ ...value, ...patch });
  const standardRate = {
    ...EMPTY_RATE_CARD,
    rate: value.rate || "",
    ratePeriod: value.ratePeriod || "HOURLY",
    effectiveFrom: value.effectiveFrom || "",
    effectiveTo: value.effectiveTo || "",
    rateCardId: value.rateCardId || null,
    isSaved: Boolean(value.rateCardId),
  };

  const [rows, setRows] = useState(() =>
    (value.roles || []).map((r) => mapRateCard(r)),
  );
  const [loadingRows, setLoadingRows] = useState(false);
  // Tracks which pricing modes have already been hydrated from the server for this
  // billing configuration, so a later Save Draft (which assigns billingConfigurationId
  // for the first time) doesn't re-fetch and clobber rows the user is mid-editing.
  const loadedModesRef = useRef(new Set());

  const syncParent = (nextRows) => {
    setRows(nextRows);
    onChange({
      ...value,
      roles: nextRows.map(
        ({
          role,
          roleName,
          rate,
          ratePeriod,
          effectiveFrom,
          effectiveTo,
          rateCardId,
        }) => ({
          role,
          roleName: roleName || role,
          rate,
          ratePeriod,
          effectiveFrom,
          effectiveTo,
          rateCardId,
        }),
      ),
    });
  };

  const handleRoleChange = (index, field, val) => {
    const updated = [...rows];
    updated[index] = {
      ...updated[index],
      [field]: val,
      ...(field === "role" ? { roleName: val } : {}),
    };
    syncParent(updated);
  };

  const addRole = () => {
    const updated = [...rows, { ...EMPTY_RATE_CARD }];
    syncParent(updated);
  };

  const removeRole = async (index) => {
    const target = rows[index];
    if (!target?.rateCardId) {
      syncParent(rows.filter((_, i) => i !== index));
      return;
    }

    try {
      const confirmed = window.confirm(
        "Remove this rate card? This cannot be undone.",
      );
      if (!confirmed) return;
      const deletingRows = [...rows];
      deletingRows[index] = { ...deletingRows[index], deleting: true };
      setRows(deletingRows);

      await deleteTmRateCard(target.rateCardId);
      showStatusToast("Rate card removed", "success");
      syncParent(rows.filter((_, i) => i !== index));
    } catch (error) {
      showStatusToast(
        getApiErrorMessage(error, "Unable to remove rate card"),
        "error",
      );
      setRows((prev) =>
        prev.map((r, i) => (i === index ? { ...r, deleting: false } : r)),
      );
    }
  };

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      if (!["STANDARD", "ROLE_BASED"].includes(billingMode)) return;
      if (!billingConfigurationId) return;
      if (loadedModesRef.current.has(billingMode)) return;
      loadedModesRef.current.add(billingMode);

      setLoadingRows(true);
      try {
        const cards = await getTmRateCardsByBillingConfiguration(
          billingConfigurationId,
        );
        if (!mounted) return;
        const mapped = (cards || []).map((card) => mapRateCard(card));

        if (billingMode === "STANDARD") {
          const commonRate = mapped.find((card) => !card.role) || mapped[0];
          if (commonRate) {
            update(mapRateCard(commonRate, false));
          }
          return;
        }

        const roleRates = mapped.filter((card) => card.role);
        syncParent(roleRates.length > 0 ? roleRates : rows);
      } catch (error) {
        showStatusToast(
          getApiErrorMessage(error, "Unable to load rate cards."),
          "error",
        );
      } finally {
        if (mounted) setLoadingRows(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [billingMode, billingConfigurationId]);

  const buildTmRateCardPayload = (row, billingConfigurationId) => {
    const payload = {
      rateCardId: row.rateCardId || null,
      billingConfigurationId,
      roleName:
        billingMode === "ROLE_BASED"
          ? String(row.roleName || row.role || "").trim()
          : null,
      rate: row.rate || "",
      ratePeriod: row.ratePeriod || "HOURLY",
      effectiveFrom: row.effectiveFrom || "",
      effectiveTo: row.effectiveTo || "",
      remarks: "",
    };
    return payload;
  };

  const saveStandardRate = async () => {
    update({ ...standardRate, saving: true });

    let resolvedConfigId = billingConfigurationId;
    try {
      if (!resolvedConfigId) {
        resolvedConfigId = await ensureBillingConfigurationId?.(
          billingConfigurationPayload,
        );
      }
      if (!resolvedConfigId) {
        showStatusToast(
          "Unable to save rate card: billing configuration id is missing.",
          "error",
        );
        update({ ...standardRate, saving: false });
        return;
      }

      const payload = buildTmRateCardPayload(standardRate, resolvedConfigId);
      const saved = await saveTmRateCard(resolvedConfigId, payload);

      update(mapRateCard(saved, false));
      showStatusToast("Rate card saved", "success");
    } catch (error) {
      showStatusToast(
        getApiErrorMessage(error, "Unable to save rate card."),
        "error",
      );
      update({ ...standardRate, saving: false });
    }
  };

  const saveRow = async (index) => {
    const row = rows[index];
    if (!row) return;

    const roleName = String(row.roleName || row.role || "").trim();
    if (!roleName) {
      showStatusToast(
        "Role name is required for role-based rate cards.",
        "error",
      );
      return;
    }
    const duplicateRole = rows.some(
      (item, itemIndex) =>
        itemIndex !== index &&
        String(item.roleName || item.role || "")
          .trim()
          .toLowerCase() === roleName.toLowerCase(),
    );
    if (duplicateRole) {
      showStatusToast(
        "Role names must be unique for role-based rate cards.",
        "error",
      );
      return;
    }

    const updating = [...rows];
    updating[index] = { ...updating[index], saving: true };
    setRows(updating);

    try {
      let resolvedConfigId = billingConfigurationId;
      if (!resolvedConfigId) {
        resolvedConfigId = await ensureBillingConfigurationId?.(
          billingConfigurationPayload,
        );
      }
      if (!resolvedConfigId) {
        showStatusToast(
          "Unable to save rate card: billing configuration id is missing.",
          "error",
        );
        setRows((prev) =>
          prev.map((r, i) => (i === index ? { ...r, saving: false } : r)),
        );
        return;
      }

      const payload = buildTmRateCardPayload(
        { ...row, roleName },
        resolvedConfigId,
      );
      const saved = await saveTmRateCard(resolvedConfigId, payload);

      const mapped = {
        ...mapRateCard(saved),
        role: saved.roleName || saved.role || saved.name || row.role,
        roleName,
      };

      const newRows = [...rows];
      newRows[index] = mapped;
      syncParent(newRows);
      showStatusToast("Rate card saved", "success");
    } catch (error) {
      showStatusToast(
        getApiErrorMessage(error, "Unable to save rate card."),
        "error",
      );
      setRows((prev) =>
        prev.map((r, i) => (i === index ? { ...r, saving: false } : r)),
      );
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 p-5">
        <h3 className="mb-4 text-sm font-semibold text-slate-900">
          Rate Configuration
        </h3>

        {billingMode === "STANDARD" && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormInput
              label={`Rate (${currency}) *`}
              name="rate"
              type="number"
              value={standardRate.rate}
              onChange={(event) => update({ rate: event.target.value })}
              placeholder={`e.g. 1800 (${currency})`}
              disabled={isExisting}
            />
            <FormSelect
              label="Rate Period *"
              name="ratePeriod"
              value={standardRate.ratePeriod}
              onChange={(event) => update({ ratePeriod: event.target.value })}
              options={RATE_PERIOD_OPTIONS}
            />
            <FormDatePicker
              label="Effective From"
              name="effectiveFrom"
              value={standardRate.effectiveFrom}
              onChange={(event) =>
                update({ effectiveFrom: event.target.value })
              }
            />
            <FormDatePicker
              label="Effective To"
              name="effectiveTo"
              value={standardRate.effectiveTo}
              onChange={(event) => update({ effectiveTo: event.target.value })}
            />
            {!isExisting && (
              <div className="md:col-span-2">
                <Button
                  variant="outline"
                  size="small"
                  onClick={saveStandardRate}
                  loading={Boolean(standardRate.saving)}
                  loadingText="Saving..."
                >
                  <Check className="h-4 w-4" /> Save Rate Card
                </Button>
              </div>
            )}
          </div>
        )}

        {billingMode === "ROLE_BASED" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-slate-900">
                  Role-Based Rates
                </h4>
                <p className="text-xs text-slate-500">
                  Define a billing rate for each role on this engagement.
                </p>
              </div>
              {!isExisting && (
                <Button variant="outline" size="small" onClick={addRole}>
                  <Plus className="h-3.5 w-3.5" /> Add Role
                </Button>
              )}
            </div>

            {loadingRows ? (
              <p className="text-sm text-slate-500">
                Loading role-based rates…
              </p>
            ) : null}

            {rows.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-200 py-6 text-center text-sm text-slate-500">
                No roles added yet. Click "Add Role" to define your first rate.
              </p>
            ) : (
              <div className="w-full overflow-x-auto rounded-xl border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      <th className="px-4 py-3 text-left">Role</th>
                      <th className="px-4 py-3 text-left">Rate ({currency})</th>
                      <th className="px-4 py-3 text-left">Rate Period</th>
                      <th className="px-4 py-3 text-left">Effective From</th>
                      <th className="px-4 py-3 text-left">Effective To</th>
                      {!isExisting && (
                        <th className="px-4 py-3 text-center w-24">Actions</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {rows.map((item, index) => (
                      <tr
                        key={index}
                        className="align-top hover:bg-slate-50/60 transition-colors"
                      >
                        <td className="px-4 py-3 min-w-[160px]">
                          <FormInput
                            value={item.role}
                            onChange={(e) =>
                              handleRoleChange(index, "role", e.target.value)
                            }
                            placeholder="e.g. Senior Developer"
                            disabled={isExisting}
                          />
                        </td>
                        <td className="px-4 py-3 min-w-[140px]">
                          <FormInput
                            type="number"
                            value={item.rate}
                            onChange={(e) =>
                              handleRoleChange(index, "rate", e.target.value)
                            }
                            placeholder="e.g. 1500"
                            disabled={isExisting}
                          />
                        </td>
                        <td className="px-4 py-3 min-w-[170px]">
                          <FormSelect
                            value={item.ratePeriod || "HOURLY"}
                            onChange={(e) =>
                              handleRoleChange(
                                index,
                                "ratePeriod",
                                e.target.value,
                              )
                            }
                            options={RATE_PERIOD_OPTIONS}
                            anchorOptions
                          />
                        </td>
                        <td className="px-4 py-3 min-w-[160px]">
                          <FormDatePicker
                            value={item.effectiveFrom}
                            onChange={(e) =>
                              handleRoleChange(
                                index,
                                "effectiveFrom",
                                e.target.value,
                              )
                            }
                          />
                        </td>
                        <td className="px-4 py-3 min-w-[160px]">
                          <FormDatePicker
                            value={item.effectiveTo}
                            onChange={(e) =>
                              handleRoleChange(
                                index,
                                "effectiveTo",
                                e.target.value,
                              )
                            }
                          />
                        </td>
                        {!isExisting && (
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => saveRow(index)}
                                disabled={item.saving || item.deleting}
                                className="p-1.5 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Save rate"
                              >
                                {item.saving ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Check className="h-4 w-4" />
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => removeRole(index)}
                                disabled={item.saving || item.deleting}
                                className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Remove role"
                              >
                                {item.deleting ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
          onChange={(event) =>
            update({ totalContractValue: event.target.value })
          }
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
        <h3 className="mb-3 text-sm font-semibold text-slate-900">
          Invoice Schedule
        </h3>
        <RadioCardGroup
          name="invoiceScheduleType"
          options={INVOICE_SCHEDULE_TYPE_OPTIONS}
          value={value.invoiceScheduleType || ""}
          onChange={(next) => update({ invoiceScheduleType: next })}
          columns={3}
        />
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-slate-900">
          Recognition
        </h3>
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

const EMPTY_MILESTONE_FORM = {
  name: "",
  amount: "",
  dueDate: "",
  status: "PENDING",
};

function MilestoneForm({
  milestones = [],
  settings = {},
  onMilestonesChange,
  onSettingsChange,
}) {
  const [modalState, setModalState] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const openAddModal = () =>
    setModalState({ mode: "add", form: EMPTY_MILESTONE_FORM });
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
      onMilestonesChange(
        milestones.map((milestone) =>
          milestone.id === id ? { ...milestone, ...form } : milestone,
        ),
      );
    }
    setModalState(null);
  };

  const handleConfirmDelete = () => {
    onMilestonesChange(
      milestones.filter((milestone) => milestone.id !== deleteTarget.id),
    );
    setDeleteTarget(null);
  };

  const isModalFormValid = Boolean(
    modalState?.form.name &&
    modalState?.form.amount &&
    modalState?.form.dueDate,
  );

  const tableRows = milestones.map((milestone) => ({
    name: milestone.name,
    amount: milestone.amount,
    dueDate: milestone.dueDate,
    status: (
      <StatusBadge
        label={milestone.status === "COMPLETED" ? "Completed" : "Pending"}
        size="sm"
      />
    ),
    actions: (
      <div className="flex items-center justify-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          title="Edit milestone"
          onClick={() => openEditModal(milestone)}
        >
          <Pencil className="h-4 w-4 text-blue-600" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          title="Remove milestone"
          onClick={() => setDeleteTarget(milestone)}
        >
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
              headers={[
                "Milestone Name",
                "Amount",
                "Due Date",
                "Status",
                "Actions",
              ]}
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
          onChange={(checked) =>
            onSettingsChange({
              ...settings,
              billOnlyCompletedMilestones: checked,
            })
          }
        />
        <ToggleSwitch
          label="Allow partial milestone billing"
          checked={Boolean(settings.allowPartialMilestoneBilling)}
          onChange={(checked) =>
            onSettingsChange({
              ...settings,
              allowPartialMilestoneBilling: checked,
            })
          }
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
              onChange={(event) =>
                handleModalFieldChange({ name: event.target.value })
              }
              placeholder="e.g. UAT Completion"
            />
            <FormInput
              label="Amount"
              requiredMark
              name="amount"
              type="number"
              value={modalState.form.amount}
              onChange={(event) =>
                handleModalFieldChange({ amount: event.target.value })
              }
              placeholder="e.g. 1200000"
            />
            <FormDatePicker
              label="Due Date"
              name="dueDate"
              value={modalState.form.dueDate}
              onChange={(event) =>
                handleModalFieldChange({ dueDate: event.target.value })
              }
            />
            {modalState.mode === "edit" && (
              <FormSelect
                label="Status"
                name="status"
                value={modalState.form.status}
                onChange={(event) =>
                  handleModalFieldChange({ status: event.target.value })
                }
                options={MILESTONE_STATUS_OPTIONS}
              />
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setModalState(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                disabled={!isModalFormValid}
                onClick={handleModalSave}
              >
                Save Milestone
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmationModal
        isOpen={Boolean(deleteTarget)}
        title="Remove Milestone"
        message={
          deleteTarget
            ? `Remove milestone "${deleteTarget.name}"? This cannot be undone.`
            : ""
        }
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
        <ReadOnlyField
          label="Billing Frequency"
          value={billingFrequency || "—"}
        />
        <FormInput
          label="Billing Day of Month"
          name="billingDayOfMonth"
          type="number"
          min="1"
          max="31"
          value={value.billingDayOfMonth || ""}
          onChange={(event) =>
            update({ billingDayOfMonth: event.target.value })
          }
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

export default function BillingConfigurationStep({
  value = {},
  onChange,
  setupMode,
  projectInfo = {},
  onProjectInfoChange,
  ensureBillingConfigurationId,
}) {
  const isExisting = false; // Billing mode and rates are always configurable for new billing setups
  const billingType = value.billingType || "";
  const billingMode = value.billingMode || "";
  const billingFrequency = value.billingFrequency || "";
  const billingTypeId = value.billingTypeId || "";
  const billingFrequencyId = value.billingFrequencyId || "";
  const currency = String(
    projectInfo?.projectBudgetCurrency || projectInfo?.currency || "",
  )
    .trim()
    .toUpperCase();
  const isPmsSourced =
    String(projectInfo?.projectSource || "ENTERPRISE").toUpperCase() ===
    "ENTERPRISE";
  const hasPmsBudget =
    isPmsSourced &&
    projectInfo?.projectBudget !== "" &&
    projectInfo?.projectBudget !== null &&
    projectInfo?.projectBudget !== undefined;
  const [activeBillingTypeOptions, setActiveBillingTypeOptions] = useState([]);
  const [activeBillingFrequencyOptions, setActiveBillingFrequencyOptions] =
    useState([]);
  const [loadingBillingData, setLoadingBillingData] = useState(true);
  const frequencyLabel = (val) =>
    activeBillingFrequencyOptions.find((option) => option.value === val)
      ?.label ||
    val ||
    "—";

  useEffect(() => {
    let isMounted = true;

    const loadBillingOptions = async () => {
      try {
        const [billingTypes, billingFrequencies] = await Promise.all([
          getActiveBillingTypes(),
          getActiveBillingFrequencies(),
        ]);

        if (!isMounted) return;

        const normalizedTypes = Array.isArray(billingTypes)
          ? billingTypes.map(normalizeBillingType).filter((type) => type.value)
          : [];
        const normalizedFrequencies = Array.isArray(billingFrequencies)
          ? billingFrequencies.filter((frequency) => frequency.value)
          : [];

        setActiveBillingTypeOptions(
          sortByOrder(normalizedTypes, BILLING_TYPE_ORDER),
        );
        setActiveBillingFrequencyOptions(normalizedFrequencies);
      } catch (error) {
        if (!isMounted) return;
        setActiveBillingTypeOptions([]);
        setActiveBillingFrequencyOptions([]);
        showStatusToast(
          getApiErrorMessage(
            error,
            "Failed to load billing types and frequencies.",
          ),
          "error",
        );
      } finally {
        if (isMounted) setLoadingBillingData(false);
      }
    };

    loadBillingOptions();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const projectCurrencyCode = String(
      projectInfo.projectBudgetCurrency || projectInfo.currency || "",
    )
      .trim()
      .toUpperCase();
    if (
      !projectCurrencyCode ||
      (projectInfo.currency === projectCurrencyCode &&
        projectInfo.projectBudgetCurrency === projectCurrencyCode)
    ) {
      return;
    }

    onProjectInfoChange({
      ...projectInfo,
      currency: projectCurrencyCode,
      projectBudgetCurrency:
        projectInfo.projectBudgetCurrency || projectCurrencyCode,
    });
  }, [onProjectInfoChange, projectInfo]);

  const update = (patch) => onChange({ ...value, ...patch });
  const updateSection = (section, patch) => update({ [section]: patch });
  const pricingModelOptions = getPricingModelOptions(billingType);
  const frequencyOptions = getBillingFrequencyOptions(
    billingType,
    activeBillingFrequencyOptions,
  );

  const handleBillingTypeChange = (nextId) => {
    const selectedOption = activeBillingTypeOptions.find(
      (type) => String(type.billingTypeId) === String(nextId),
    );
    if (!selectedOption) return;

    const normalizedBillingType = selectedOption.value;
    const nextPricingModels = getPricingModelOptions(normalizedBillingType);
    const nextBillingMode =
      nextPricingModels.length > 0 ? nextPricingModels[0].value : "";

    update({
      billingType: normalizedBillingType,
      billingTypeId: selectedOption.billingTypeId,
      billingTypeLabel: selectedOption.label,
      billingMode: nextBillingMode,
      billingFrequency:
        normalizedBillingType === "RECURRING"
          ? value.billingFrequency || ""
          : "",
      billingFrequencyId:
        normalizedBillingType === "RECURRING"
          ? value.billingFrequencyId || ""
          : "",
      timeAndMaterial:
        normalizedBillingType === "TIME_MATERIAL"
          ? value.timeAndMaterial || {}
          : {},
      fixedPrice:
        normalizedBillingType === "FIXED_PRICE" ? value.fixedPrice || {} : {},
      milestones:
        normalizedBillingType === "MILESTONE" ? value.milestones || [] : [],
      milestoneSettings:
        normalizedBillingType === "MILESTONE"
          ? value.milestoneSettings || {}
          : {},
      monthlyRetainer:
        normalizedBillingType === "RECURRING"
          ? value.monthlyRetainer || {}
          : {},
    });
  };

  return (
    <div className="space-y-5">
      <div className="border-b border-slate-100 pb-4">
        <h2 className={Fonts.heading3}>Commercial Configuration</h2>
        <p className="mt-1 text-sm text-slate-500">
          Configure pricing, currency, and rate calculation for this billing
          setup.
        </p>
      </div>

      <div className="space-y-5">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div className="max-w-xs space-y-1.5">
            {isPmsSourced ? (
              <>
                <div className="flex items-center gap-2">
                  <label className="block text-sm font-medium text-slate-700">
                    Billing Currency *
                  </label>
                  <PmsSyncedBadge />
                </div>
                <ReadOnlyField value={currency} />
              </>
            ) : (
              <FormSelect
                label="Billing Currency *"
                name="currency"
                value={currency}
                onChange={(e) =>
                  onProjectInfoChange({
                    ...projectInfo,
                    currency: e.target.value,
                    projectBudgetCurrency: e.target.value,
                  })
                }
                options={CURRENCY_OPTIONS}
              />
            )}
          </div>

          <div className="space-y-1.5">
            {hasPmsBudget ? (
              <>
                <div className="flex items-center gap-2">
                  <label className="block text-sm font-medium text-slate-700">
                    Project Budget
                  </label>
                  <PmsSyncedBadge />
                </div>
                <ReadOnlyField value={projectInfo.projectBudget} />
              </>
            ) : (
              <FormInput
                label="Project Budget"
                name="projectBudget"
                type="number"
                min="0"
                step="0.01"
                value={projectInfo.projectBudget ?? ""}
                onChange={(e) =>
                  onProjectInfoChange({
                    ...projectInfo,
                    projectBudget: e.target.value,
                  })
                }
                placeholder="e.g. 45678"
              />
            )}
          </div>

          <div className="md:col-span-2 space-y-2">
            <label className="block text-sm font-medium text-slate-700">
              Billing Type <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2">
              {loadingBillingData ? (
                <p className="text-sm text-slate-500">
                  Loading billing types and frequencies...
                </p>
              ) : null}
              <RadioCardGroup
                name="billingTypeId"
                options={activeBillingTypeOptions.map((type) => ({
                  value: type.billingTypeId,
                  label: type.label,
                }))}
                value={billingTypeId}
                onChange={handleBillingTypeChange}
                columns={3}
              />
            </div>
          </div>

          <div className="md:col-span-2 space-y-2">
            <label className="block text-sm font-medium text-slate-700">
              Billing Frequency <span className="text-red-500">*</span>
            </label>
            <RadioCardGroup
              name="billingFrequencyId"
              options={frequencyOptions.map((f) => ({
                value: f.billingFrequencyId,
                label: f.label,
              }))}
              value={billingFrequencyId}
              onChange={(next) => {
                const selectedFrequency = activeBillingFrequencyOptions.find(
                  (option) =>
                    String(option.billingFrequencyId) === String(next),
                );
                update({
                  billingFrequency: selectedFrequency?.value || "",
                  billingFrequencyId:
                    selectedFrequency?.billingFrequencyId ||
                    selectedFrequency?.id ||
                    "",
                });
              }}
              columns={3}
            />
          </div>
        </div>
      </div>

      {!isExisting && pricingModelOptions.length > 0 && (
        <div className="space-y-6 pt-6 border-t border-slate-100">
          <div>
            <h3 className={Fonts.subheading}>Pricing model</h3>
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

      {billingType !== "" ? (
        <div className="space-y-6 pt-6 border-t border-slate-100">
          <div>
            <h3 className={Fonts.subheading}>Rate details</h3>
          </div>
          <div>
            {billingType === "TIME_MATERIAL" && (
              <TimeAndMaterialForm
                value={value.timeAndMaterial}
                onChange={(next) => updateSection("timeAndMaterial", next)}
                billingMode={billingMode}
                currency={currency}
                isExisting={isExisting}
                billingConfigurationId={
                  value.billingConfigurationId || value.id
                }
                ensureBillingConfigurationId={ensureBillingConfigurationId}
                billingConfigurationPayload={{
                  ...value,
                  projectInfo,
                  billingConfig: value,
                }}
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

            {billingType === "RECURRING" && (
              <MonthlyRetainerForm
                value={value.monthlyRetainer || {}}
                onChange={(next) => updateSection("monthlyRetainer", next)}
                billingFrequency={frequencyLabel(billingFrequency)}
              />
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
