import { useEffect, useRef, useState } from "react";
import { Check, Plus, Pencil, Trash2, Loader2 } from "lucide-react";

import FormInput from "../../../../components/forms/FormInput";
import FormSelect from "../../../../components/forms/FormSelect";
import FormDatePicker from "../../../../components/forms/FormDatePicker";
import FormTextArea from "../../../../components/forms/FormTextArea";
import Button from "../../../../components/Button/Button";
import ARTable from "../common/ARTable";
import Modal from "../../../../components/Modal/modal";
import ConfirmationModal from "../../../../components/confirmation_modal/ConfirmationModal";
import StatusBadge from "../../../../components/status/statusbadge";
import { Fonts } from "../../../../components/Fonts/Fonts";
import { showStatusToast } from "../../../../components/toastfy/toast";
import RadioCardGroup from "../common/RadioCardGroup";
import ToggleSwitch from "../common/ToggleSwitch";
import {
  RECURRING_BILLING_MODE_OPTIONS,
  MILESTONE_STATUS_OPTIONS,
  CURRENCY_OPTIONS,
} from "../../data/wizardOptions";
import { formatCurrency } from "../../utils/format";
import {
  getActiveBillingTypes,
  getActiveBillingFrequencies,
  getTmRateCardsByBillingConfiguration,
  saveTmRateCard,
  deleteTmRateCard,
  getApiErrorMessage,
  getFixedPriceByBillingConfiguration,
  createFixedPriceConfiguration,
  updateFixedPriceConfiguration,
  deleteFixedPriceConfiguration,
  toApiContractValueSource,
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
// Fixed Price is the only billing type that can be settled as a single lump sum,
// so One-Time is offered there and nowhere else.
const FIXED_PRICE_FREQUENCY_ORDER = [
  "ONE_TIME",
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

  if (billingType === "RECURRING") {
    return sortByOrder(
      withoutHalfYearly.filter((option) =>
        ["MONTHLY", "QUARTERLY", "ANNUALLY"].includes(option.value),
      ),
      BILLING_FREQUENCY_ORDER,
    );
  }

  if (billingType === "FIXED_PRICE") {
    return sortByOrder(withoutHalfYearly, FIXED_PRICE_FREQUENCY_ORDER);
  }

  // One-Time only makes sense against a single lump-sum contract value, so every
  // other billing type (T&M, Milestone) never offers it, even if master data does.
  return sortByOrder(
    withoutHalfYearly.filter((option) => option.value !== "ONE_TIME"),
    BILLING_FREQUENCY_ORDER,
  );
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
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-sm font-semibold text-slate-900">{title}</h3>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">{children}</div>
    </div>
  );
}

function PillSelectGroup({ name, options, value, onChange, disabled = false }) {
  return (
    <div role="radiogroup" aria-label={name} className="flex flex-wrap gap-2">
      {options.map((option) => {
        const isSelected = String(value) === String(option.value);
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            disabled={disabled}
            onClick={() => onChange?.(option.value)}
            className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[#0A0082]/30 ${
              isSelected
                ? "border-[#0A0082] bg-[#0A0082]/5 text-[#0A0082]"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
            } ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function PmsSyncedBadge() {
  return (
    <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-200">
      Synced from PMS
    </span>
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
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 p-4">
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
              <h4 className="text-sm font-semibold text-slate-900">
                Role-Based Rates
              </h4>
              {!isExisting && (
                <Button variant="outline" size="small" onClick={addRole}>
                  <Plus className="h-3.5 w-3.5" /> Add Role
                </Button>
              )}
            </div>

            {loadingRows ? (
              <p className="text-sm text-slate-500">Loading…</p>
            ) : null}

            {rows.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-200 py-6 text-center text-sm text-slate-500">
                No roles added yet.
              </p>
            ) : (
              <div className="w-full overflow-x-auto rounded-xl border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Role</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Rate ({currency})</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Rate Period</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Effective From</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Effective To</th>
                      {!isExisting && (
                        <th className="px-4 py-3 text-center w-24 font-semibold text-slate-600">Actions</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {rows.map((item, index) => (
                      <tr
                        key={index}
                        className="align-top transition-colors hover:bg-slate-50"
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

function ContractValueSourceBadge({ source }) {
  if (source === "MANUAL") {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 ring-1 ring-inset ring-amber-200">
        Manually adjusted
      </span>
    );
  }
  if (source === "PMS") {
    return (
      <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700 ring-1 ring-inset ring-indigo-200">
        Imported from PMS Project Budget
      </span>
    );
  }
  return null;
}

// Fixed Price billing must be driven by the actual client-agreed commercial value,
// which can legitimately differ from the PMS Project Budget in either direction —
// so Contract Value only seeds from the budget once and is freely editable after.
function FixedPriceForm({
  value = {},
  onChange,
  currency,
  projectBudget,
  billingFrequency,
  billingFrequencyLabel,
  billingConfigurationId,
}) {
  const update = (patch) => onChange({ ...value, ...patch });
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const fetchedRef = useRef(false);

  // [6] billingConfigurationId received by FixedPriceForm.
  useEffect(() => {
    console.log("[FixedPriceForm] billingConfigurationId prop:", billingConfigurationId);
  }, [billingConfigurationId]);

  useEffect(() => {
    if (value.totalContractValue || value.contractValueSource) return;
    if (projectBudget === "" || projectBudget === null || projectBudget === undefined) return;
    update({ totalContractValue: projectBudget, contractValueSource: "PMS" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectBudget]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      if (!billingConfigurationId) return;
      if (fetchedRef.current) return;
      fetchedRef.current = true;

      setLoadingConfig(true);
      try {
        const record = await getFixedPriceByBillingConfiguration(billingConfigurationId);
        if (!mounted || !record) return;
        update({
          fixedPriceConfigurationId: record.fixedPriceConfigurationId || record.id || null,
          totalContractValue: record.totalContractValue ?? value.totalContractValue ?? "",
          contractValueSource: value.contractValueSource || "MANUAL",
          retentionPercent: record.retentionPercent ?? "",
          advanceReceived: record.advanceReceived ?? "",
          effectiveFrom: record.effectiveFrom || "",
          effectiveTo: record.effectiveTo || "",
          remarks: record.remarks || "",
          retentionAmount: record.retentionAmount ?? "",
          billableAmount: record.billableAmount ?? "",
          remainingAmount: record.remainingAmount ?? "",
        });
      } catch (error) {
        showStatusToast(
          getApiErrorMessage(error, "Unable to load fixed price configuration."),
          "error",
        );
      } finally {
        if (mounted) setLoadingConfig(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [billingConfigurationId]);

  const contractValue = Number(value.totalContractValue) || 0;
  const retentionPercentNum = Number(value.retentionPercent);
  const hasRetention =
    value.retentionPercent !== "" &&
    value.retentionPercent !== null &&
    value.retentionPercent !== undefined &&
    !Number.isNaN(retentionPercentNum) &&
    retentionPercentNum > 0;
  const retentionAmount = hasRetention ? contractValue * (retentionPercentNum / 100) : 0;
  const billableAmount = contractValue - retentionAmount;

  const advanceReceivedNum = Number(value.advanceReceived);
  const hasAdvance =
    value.advanceReceived !== "" &&
    value.advanceReceived !== null &&
    value.advanceReceived !== undefined &&
    !Number.isNaN(advanceReceivedNum) &&
    advanceReceivedNum > 0;
  const remainingReceivable = billableAmount - (hasAdvance ? advanceReceivedNum : 0);

  const retentionError =
    value.retentionPercent !== "" && value.retentionPercent !== null && value.retentionPercent !== undefined
      ? Number.isNaN(retentionPercentNum) || retentionPercentNum < 0 || retentionPercentNum > 100
        ? "Retention must be between 0% and 100%."
        : ""
      : "";
  const advanceError =
    value.advanceReceived !== "" && value.advanceReceived !== null && value.advanceReceived !== undefined
      ? Number.isNaN(advanceReceivedNum) || advanceReceivedNum < 0
        ? "Advance Received cannot be negative."
        : advanceReceivedNum > billableAmount
        ? "Advance Received cannot exceed the Billable Amount."
        : ""
      : "";

  const isOneTime = billingFrequency === "ONE_TIME";

  // The backend requires a different field depending on contractValueSource: PMS
  // Budget sends the project budget as pmsProjectBudget (from the Billing
  // Configuration state, never blank/null) AND still needs contractValue populated
  // with that same budget — the backend's retention/billable/remaining calculations
  // read contractValue regardless of source, so it can never be left null there.
  // Manual sends only the user-entered amount as contractValue (not
  // "totalContractValue" — that's only the wizard's internal form field name).
  const buildFixedPricePayload = () => {
    const apiContractValueSource = toApiContractValueSource(value.contractValueSource);
    const sharedFields = {
      contractValueSource: apiContractValueSource,
      retentionPercent:
        value.retentionPercent === "" || value.retentionPercent === null || value.retentionPercent === undefined
          ? null
          : Number(value.retentionPercent),
      advanceReceived:
        value.advanceReceived === "" || value.advanceReceived === null || value.advanceReceived === undefined
          ? null
          : Number(value.advanceReceived),
      effectiveFrom: value.effectiveFrom || "",
      effectiveTo: value.effectiveTo || "",
      remarks: value.remarks || "",
    };

    if (apiContractValueSource === "PMS_BUDGET") {
      const pmsProjectBudget = Number(projectBudget);
      return { ...sharedFields, pmsProjectBudget, contractValue: pmsProjectBudget };
    }

    return { ...sharedFields, contractValue: Number(value.totalContractValue) };
  };

  const saveFixedPriceConfig = async () => {
    if (!value.totalContractValue) {
      showStatusToast("Contract Value is required before saving.", "error");
      return;
    }
    if (retentionError || advanceError) {
      showStatusToast("Please fix the highlighted errors before saving.", "error");
      return;
    }

    const apiContractValueSource = toApiContractValueSource(value.contractValueSource);
    const pmsProjectBudgetIsBlank =
      projectBudget === "" || projectBudget === null || projectBudget === undefined || Number.isNaN(Number(projectBudget));
    if (apiContractValueSource === "PMS_BUDGET" && pmsProjectBudgetIsBlank) {
      showStatusToast("Project budget is required before saving a PMS Budget contract value.", "error");
      return;
    }

    // This button only ever reads billingConfigurationId — it never creates the
    // parent draft itself. The draft is created once, up front, when the wizard is
    // first entered (see ensureBillingConfigurationId in NewConfigurationWizard), so
    // by the time the user reaches this step the id is already in state.
    if (!billingConfigurationId) {
      showStatusToast(
        "Unable to save fixed price configuration: billing configuration id is missing. Please reload and try again.",
        "error",
      );
      return;
    }

    setSaving(true);
    try {
      const payload = buildFixedPricePayload();
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.log("[FixedPriceForm] Fixed Price API payload:", payload);
      }
      const saved = value.fixedPriceConfigurationId
        ? await updateFixedPriceConfiguration(value.fixedPriceConfigurationId, payload)
        : await createFixedPriceConfiguration(billingConfigurationId, payload);

      update({
        fixedPriceConfigurationId:
          saved?.fixedPriceConfigurationId || saved?.id || value.fixedPriceConfigurationId || null,
        retentionAmount: saved?.retentionAmount ?? value.retentionAmount ?? "",
        billableAmount: saved?.billableAmount ?? value.billableAmount ?? "",
        remainingAmount: saved?.remainingAmount ?? value.remainingAmount ?? "",
      });
      showStatusToast("Fixed price configuration saved", "success");
    } catch (error) {
      showStatusToast(
        getApiErrorMessage(error, "Unable to save fixed price configuration."),
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  const removeFixedPriceConfig = async () => {
    if (!value.fixedPriceConfigurationId) {
      update({
        totalContractValue: "",
        contractValueSource: "",
        retentionPercent: "",
        advanceReceived: "",
        effectiveFrom: "",
        effectiveTo: "",
        remarks: "",
      });
      return;
    }

    const confirmed = window.confirm(
      "Remove this fixed price configuration? This cannot be undone.",
    );
    if (!confirmed) return;

    setDeleting(true);
    try {
      await deleteFixedPriceConfiguration(value.fixedPriceConfigurationId);
      update({
        fixedPriceConfigurationId: null,
        totalContractValue: "",
        contractValueSource: "",
        retentionPercent: "",
        advanceReceived: "",
        effectiveFrom: "",
        effectiveTo: "",
        remarks: "",
        retentionAmount: "",
        billableAmount: "",
        remainingAmount: "",
      });
      showStatusToast("Fixed price configuration removed", "success");
    } catch (error) {
      showStatusToast(
        getApiErrorMessage(error, "Unable to remove fixed price configuration."),
        "error",
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className={Fonts.heading4}>Fixed Price Billing Configuration</h2>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="md:col-span-2">
            <FormInput
              label={
                <span className="flex flex-wrap items-center gap-2">
                  Contract Value <span className="text-red-500">*</span>
                  <ContractValueSourceBadge source={value.contractValueSource} />
                </span>
              }
              name="totalContractValue"
              type="number"
              value={value.totalContractValue || ""}
              onChange={(event) =>
                update({ totalContractValue: event.target.value, contractValueSource: "MANUAL" })
              }
              placeholder={`e.g. 120000 (${currency})`}
            />
          </div>
          <FormInput
            label="Retention % (optional)"
            name="retentionPercent"
            type="number"
            min="0"
            max="100"
            value={value.retentionPercent || ""}
            onChange={(event) => update({ retentionPercent: event.target.value })}
            placeholder="e.g. 10"
            error={retentionError}
          />
          <FormInput
            label="Advance Received"
            name="advanceReceived"
            type="number"
            min="0"
            value={value.advanceReceived || ""}
            onChange={(event) => update({ advanceReceived: event.target.value })}
            placeholder="e.g. 20000"
            error={advanceError}
          />
          <FormDatePicker
            label="Effective From"
            name="fixedPriceEffectiveFrom"
            value={value.effectiveFrom || ""}
            onChange={(event) => update({ effectiveFrom: event.target.value })}
          />
          <FormDatePicker
            label="Effective To"
            name="fixedPriceEffectiveTo"
            value={value.effectiveTo || ""}
            onChange={(event) => update({ effectiveTo: event.target.value })}
          />
          <div className="md:col-span-3">
            <FormTextArea
              label="Remarks"
              name="fixedPriceRemarks"
              value={value.remarks || ""}
              onChange={(event) => update({ remarks: event.target.value })}
              placeholder="Any additional notes about this fixed price arrangement"
              rows={3}
            />
          </div>
        </div>

        <div className="rounded-lg border border-slate-100 bg-slate-50/70 px-4 py-3">
          <div className="flex items-center justify-between py-1 text-sm">
            <span className="text-slate-500">Contract Value</span>
            <span className="font-semibold text-slate-900">{formatCurrency(contractValue, currency)}</span>
          </div>
          {hasRetention && (
            <div className="flex items-center justify-between py-1 text-sm">
              <span className="text-slate-500">Retention ({retentionPercentNum}%)</span>
              <span className="font-semibold text-slate-900">-{formatCurrency(retentionAmount, currency)}</span>
            </div>
          )}
          <div className="mt-1 flex items-center justify-between border-t border-slate-200 pt-2 text-sm">
            <span className="font-semibold text-slate-700">Billable Amount</span>
            <span className="font-bold text-[#0A0082]">{formatCurrency(billableAmount, currency)}</span>
          </div>
          {hasAdvance && (
            <div className="flex items-center justify-between py-1 text-sm">
              <span className="text-slate-500">Advance Received</span>
              <span className="font-semibold text-slate-900">-{formatCurrency(advanceReceivedNum, currency)}</span>
            </div>
          )}
          <div className="mt-1 flex items-center justify-between border-t border-slate-200 pt-2 text-sm">
            <span className="font-semibold text-slate-700">Remaining Receivable</span>
            <span className="font-bold text-[#0A0082]">{formatCurrency(remainingReceivable, currency)}</span>
          </div>
        </div>

        <p className="text-xs text-slate-500">
          {isOneTime
            ? "One-Time billing: the Remaining Receivable will be raised as a single billing event."
            : `Remaining Receivable will be scheduled across ${
                billingFrequencyLabel && billingFrequencyLabel !== "—" ? billingFrequencyLabel : "the selected"
              } billing cycles based on the project duration.`}
        </p>

        {loadingConfig ? (
          <p className="text-sm text-slate-500">Loading saved fixed price configuration…</p>
        ) : (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="small"
              onClick={saveFixedPriceConfig}
              loading={saving}
              loadingText="Saving..."
            >
              <Check className="h-4 w-4" />
              {value.fixedPriceConfigurationId ? "Update Fixed Price Details" : "Save Fixed Price Details"}
            </Button>
            {value.fixedPriceConfigurationId && (
              <Button
                variant="ghost"
                size="small"
                onClick={removeFixedPriceConfig}
                loading={deleting}
                loadingText="Removing..."
              >
                <Trash2 className="h-4 w-4 text-red-500" /> Remove
              </Button>
            )}
          </div>
        )}
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

        <ARTable
          headers={["Milestone Name", "Amount", "Due Date", "Status", "Actions"]}
          columns={["name", "amount", "dueDate", "status", "actions"]}
          rows={tableRows}
          emptyMessage="No milestones added yet. Add at least one milestone."
        />
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
        size="sm"
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

    // Switching away from Fixed Price after it was already saved would otherwise leave
    // an orphaned fixed price record under this billing configuration.
    const staleFixedPriceId = value.fixedPrice?.fixedPriceConfigurationId;
    if (
      billingType === "FIXED_PRICE" &&
      normalizedBillingType !== "FIXED_PRICE" &&
      staleFixedPriceId
    ) {
      deleteFixedPriceConfiguration(staleFixedPriceId).catch((error) => {
        console.warn("Unable to remove previous fixed price configuration", error);
      });
    }

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
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">Project Financials</h3>
          {(isPmsSourced || hasPmsBudget) && <PmsSyncedBadge />}
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {isPmsSourced ? (
            <ReadOnlyField label="Billing Currency *" value={currency} />
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

          {hasPmsBudget ? (
            <ReadOnlyField label="Project Budget" value={projectInfo.projectBudget} />
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
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700">
            Billing Type <span className="text-red-500">*</span>
          </label>
          {loadingBillingData ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : (
            <PillSelectGroup
              name="billingTypeId"
              options={activeBillingTypeOptions.map((type) => ({
                value: type.billingTypeId,
                label: type.label,
              }))}
              value={billingTypeId}
              onChange={handleBillingTypeChange}
            />
          )}
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700">
            Billing Frequency <span className="text-red-500">*</span>
          </label>
          <PillSelectGroup
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
          />
        </div>
      </div>

      {!isExisting && pricingModelOptions.length > 0 && (
        <div className="space-y-3 pt-5 border-t border-slate-100">
          <h3 className={Fonts.subheading}>Pricing Model</h3>

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
        <div className="space-y-3 pt-5 border-t border-slate-100">
          <h3 className={Fonts.subheading}>Rate Details</h3>
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
                projectBudget={projectInfo.projectBudget}
                billingFrequency={billingFrequency}
                billingFrequencyLabel={frequencyLabel(billingFrequency)}
                billingConfigurationId={value.billingConfigurationId || value.id}
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
