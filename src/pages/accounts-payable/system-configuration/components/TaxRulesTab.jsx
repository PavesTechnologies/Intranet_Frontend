import { useState, useMemo, useRef } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import Button from "../../../../components/Button/Button";
import GenericTable from "../../../../components/Table/table";
import SearchInput from "../../../../components/filter/Searchbar";
import FormSelect from "../../../../components/forms/FormSelect";
import Modal from "../../../../components/Modal/modal";
import ConfirmationModal from "../../../../components/confirmation_modal/ConfirmationModal";
import FormInput from "../../../../components/forms/FormInput";
import StatusBadge from "../../../../components/status/statusbadge";
import ToggleSwitch from "./ToggleSwitch";
import useLocalCrudList from "../hooks/useLocalCrudList";
import {
  TAX_RULES_MOCK,
  TAX_TYPE_CODE_OPTIONS,
  TAX_RULE_CONDITION_TYPE_OPTIONS,
  TAX_RULE_OPERATOR_OPTIONS,
} from "../mocks/systemConfigMockData";

const ALL_TAX_TYPES = "";

const emptyForm = () => ({
  ruleCode: "",
  ruleName: "",
  taxTypeCode: TAX_TYPE_CODE_OPTIONS[0]?.value || "",
  rateValue: "",
  effectiveFrom: "",
  effectiveTo: "",
  active: true,
  conditions: [],
});

const operatorLabel = (value) =>
  TAX_RULE_OPERATOR_OPTIONS.find((opt) => opt.value === value)?.label || value;

const conditionTypeLabel = (value) =>
  TAX_RULE_CONDITION_TYPE_OPTIONS.find((opt) => opt.value === value)?.label || value;

export default function TaxRulesTab() {
  const { items, add, update, remove } = useLocalCrudList(TAX_RULES_MOCK);
  const [taxTypeFilter, setTaxTypeFilter] = useState(ALL_TAX_TYPES);
  const [search, setSearch] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [errors, setErrors] = useState({});
  const conditionKeyRef = useRef(0);

  const [deleteTarget, setDeleteTarget] = useState(null);

  const taxTypeFilterOptions = [{ value: ALL_TAX_TYPES, label: "All Tax Types" }, ...TAX_TYPE_CODE_OPTIONS];

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      const matchesTaxType = !taxTypeFilter || item.taxTypeCode === taxTypeFilter;
      const matchesSearch =
        !q || item.ruleCode.toLowerCase().includes(q) || item.ruleName.toLowerCase().includes(q);
      return matchesTaxType && matchesSearch;
    });
  }, [items, taxTypeFilter, search]);

  const handleFieldChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const nextConditionKey = () => {
    conditionKeyRef.current -= 1;
    return conditionKeyRef.current;
  };

  const addCondition = () => {
    setForm((prev) => ({
      ...prev,
      conditions: [
        ...prev.conditions,
        {
          key: nextConditionKey(),
          conditionType: TAX_RULE_CONDITION_TYPE_OPTIONS[0].value,
          operator: TAX_RULE_OPERATOR_OPTIONS[0].value,
          value: "",
        },
      ],
    }));
  };

  const updateCondition = (key, field, value) => {
    setForm((prev) => ({
      ...prev,
      conditions: prev.conditions.map((c) => (c.key === key ? { ...c, [field]: value } : c)),
    }));
    setErrors((prev) => ({ ...prev, [`condition-${key}`]: "" }));
  };

  const removeCondition = (key) => {
    setForm((prev) => ({ ...prev, conditions: prev.conditions.filter((c) => c.key !== key) }));
  };

  const validate = () => {
    const nextErrors = {};
    if (!form.ruleCode.trim()) nextErrors.ruleCode = "Rule code is required.";
    if (!form.ruleName.trim()) nextErrors.ruleName = "Rule name is required.";
    if (form.rateValue === "" || Number(form.rateValue) < 0) nextErrors.rateValue = "Rate % is required.";
    if (!form.effectiveFrom) nextErrors.effectiveFrom = "Effective from date is required.";
    if (form.effectiveTo && form.effectiveTo <= form.effectiveFrom) {
      nextErrors.effectiveTo = "Effective to date must be after the effective from date.";
    }
    form.conditions.forEach((c) => {
      if (!c.value.trim()) nextErrors[`condition-${c.key}`] = "Value is required.";
    });
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const openAddModal = () => {
    setCurrentItem(null);
    setForm(emptyForm());
    setErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (item) => {
    setCurrentItem(item);
    setForm({
      ruleCode: item.ruleCode,
      ruleName: item.ruleName,
      taxTypeCode: item.taxTypeCode,
      rateValue: String(item.rateValue),
      effectiveFrom: item.effectiveFrom,
      effectiveTo: item.effectiveTo || "",
      active: item.active,
      conditions: item.conditions.map((c) => ({ key: nextConditionKey(), ...c })),
    });
    setErrors({});
    setIsModalOpen(true);
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      ruleCode: form.ruleCode.trim().toUpperCase(),
      ruleName: form.ruleName.trim(),
      taxTypeCode: form.taxTypeCode,
      rateValue: Number(form.rateValue),
      effectiveFrom: form.effectiveFrom,
      effectiveTo: form.effectiveTo || "",
      active: form.active,
      conditions: form.conditions.map((c, index) => ({
        id: index + 1,
        conditionType: c.conditionType,
        operator: c.operator,
        value: c.value.trim(),
      })),
    };
    if (currentItem) {
      update(currentItem.id, payload);
    } else {
      add(payload);
    }
    setIsModalOpen(false);
  };

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;
    remove(deleteTarget.id);
    setDeleteTarget(null);
  };

  const headers = [
    "Rule Code",
    "Rule Name",
    "Tax Type",
    "Rate",
    "Conditions",
    "Effective Period",
    "Status",
    "Actions",
  ];
  const columns = [
    "ruleCode",
    "ruleName",
    "taxTypeCode",
    "rateValue",
    "conditions",
    "effectivePeriod",
    "status",
    "actions",
  ];

  const rows = filteredItems.map((item) => ({
    ruleCode: <span className="font-mono text-xs font-semibold text-gray-700">{item.ruleCode}</span>,
    ruleName: <span className="font-medium text-gray-900">{item.ruleName}</span>,
    taxTypeCode: <span className="text-xs font-semibold text-indigo-600">{item.taxTypeCode}</span>,
    rateValue: <span className="font-mono text-blue-600 font-semibold">{item.rateValue}%</span>,
    conditions: (
      <span className="text-xs font-medium text-gray-500">
        {item.conditions.length} condition{item.conditions.length === 1 ? "" : "s"}
      </span>
    ),
    effectivePeriod: (
      <span className="text-xs text-gray-600">
        {item.effectiveFrom} → {item.effectiveTo || "—"}
      </span>
    ),
    status: <StatusBadge label={item.active ? "Active" : "Inactive"} size="sm" />,
    actions: (
      <div className="flex items-center gap-2 justify-center">
        <Button
          type="button"
          variant="link"
          size="icon"
          title="Edit Tax Rule"
          className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50 hover:text-blue-800 transition rounded-md"
          onClick={() => openEditModal(item)}
        >
          <Pencil size={16} />
        </Button>
        <Button
          type="button"
          variant="link"
          size="icon"
          title="Delete Tax Rule"
          className="h-8 w-8 p-0 text-red-600 hover:bg-red-50 hover:text-red-800 transition rounded-md"
          onClick={() => setDeleteTarget(item)}
        >
          <Trash2 size={16} />
        </Button>
      </div>
    ),
  }));

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="w-full sm:w-56">
            <FormSelect
              label="Tax Type"
              name="taxTypeFilter"
              value={taxTypeFilter}
              onChange={(e) => setTaxTypeFilter(e.target.value)}
              options={taxTypeFilterOptions}
            />
          </div>
          <div className="w-full sm:w-64">
            <SearchInput onSearch={setSearch} placeholder="Search by rule code or name..." />
          </div>
        </div>
        <Button variant="primary" onClick={openAddModal} className="whitespace-nowrap">
          <Plus size={16} />
          Add Tax Rule
        </Button>
      </div>

      <div className="w-full overflow-x-auto rounded-lg">
        <GenericTable headers={headers} rows={rows} columns={columns} />
      </div>

      <p className="text-xs text-gray-500">
        Invoice tax validation matches the invoice date against a rule's effective period, then
        checks every condition on that rule (all must match) before applying its rate. To change a
        rate, add a new rule (or a new effective period) instead of editing history.
      </p>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={currentItem ? "Edit Tax Rule" : "Add Tax Rule"}
        subtitle="Define the tax type, rate, effective period and matching conditions for this rule."
        size="3xl"
        closeOnBackdrop={false}
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button type="submit" form="tax-rule-form" variant="primary" className="w-full sm:w-auto">
              Save Tax Rule
            </Button>
          </div>
        }
      >
        <form id="tax-rule-form" onSubmit={handleSave} className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <FormInput
              label="Rule Code"
              name="ruleCode"
              placeholder="e.g. IGST_INTERSTATE_STANDARD"
              value={form.ruleCode}
              onChange={handleFieldChange}
              requiredMark
              error={errors.ruleCode}
            />
            <FormSelect
              label="Tax Type"
              name="taxTypeCode"
              value={form.taxTypeCode}
              onChange={handleFieldChange}
              options={TAX_TYPE_CODE_OPTIONS}
            />
          </div>

          <FormInput
            label="Rule Name"
            name="ruleName"
            placeholder="e.g. IGST - Interstate Standard Services"
            value={form.ruleName}
            onChange={handleFieldChange}
            requiredMark
            error={errors.ruleName}
          />

          <div className="grid grid-cols-3 gap-4">
            <FormInput
              label="Rate %"
              name="rateValue"
              type="number"
              min="0"
              step="0.01"
              value={form.rateValue}
              onChange={handleFieldChange}
              requiredMark
              error={errors.rateValue}
            />
            <FormInput
              label="Effective From"
              name="effectiveFrom"
              type="date"
              value={form.effectiveFrom}
              onChange={handleFieldChange}
              requiredMark
              error={errors.effectiveFrom}
            />
            <FormInput
              label="Effective To"
              name="effectiveTo"
              type="date"
              value={form.effectiveTo}
              onChange={handleFieldChange}
              error={errors.effectiveTo}
            />
          </div>

          <div className="rounded-lg border border-gray-200 p-4">
            <ToggleSwitch
              label="Active"
              checked={form.active}
              onChange={(val) => setForm((prev) => ({ ...prev, active: val }))}
            />
          </div>

          <div className="rounded-lg border border-gray-200 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900">Conditions</p>
                <p className="text-xs text-gray-500">All conditions must match for this rule to apply.</p>
              </div>
              <Button type="button" variant="outline" size="small" onClick={addCondition}>
                <Plus size={14} />
                Add Condition
              </Button>
            </div>

            {form.conditions.length === 0 ? (
              <p className="text-xs italic text-gray-400">
                No conditions — this rule applies to every invoice matching the tax type.
              </p>
            ) : (
              <div className="space-y-3">
                {form.conditions.map((condition) => (
                  <div
                    key={condition.key}
                    className="grid grid-cols-[1fr_1fr_1fr_auto] items-start gap-2 rounded-md bg-gray-50 p-3"
                  >
                    <FormSelect
                      value={condition.conditionType}
                      onChange={(e) => updateCondition(condition.key, "conditionType", e.target.value)}
                      options={TAX_RULE_CONDITION_TYPE_OPTIONS}
                    />
                    <FormSelect
                      value={condition.operator}
                      onChange={(e) => updateCondition(condition.key, "operator", e.target.value)}
                      options={TAX_RULE_OPERATOR_OPTIONS}
                    />
                    <FormInput
                      placeholder="Value"
                      value={condition.value}
                      onChange={(e) => updateCondition(condition.key, "value", e.target.value)}
                      error={errors[`condition-${condition.key}`]}
                    />
                    <Button
                      type="button"
                      variant="link"
                      size="icon"
                      title="Remove Condition"
                      className="h-8 w-8 p-0 text-red-600 hover:bg-red-50 hover:text-red-800 transition rounded-md"
                      onClick={() => removeCondition(condition.key)}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-gray-400">
              Example: {conditionTypeLabel("SUPPLIER_STATE")} {operatorLabel("NOT_EQUALS")}{" "}
              {conditionTypeLabel("BUYER_STATE")} → interstate supply.
            </p>
          </div>
        </form>
      </Modal>

      <ConfirmationModal
        isOpen={!!deleteTarget}
        title="Delete Tax Rule"
        message={`Are you sure you want to delete the tax rule "${deleteTarget?.ruleName}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
        variant="danger"
      />
    </div>
  );
}
