import { useState, useMemo } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import Button from "../../../../components/Button/Button";
import GenericTable from "../../../../components/Table/table";
import FormSelect from "../../../../components/forms/FormSelect";
import Modal from "../../../../components/Modal/modal";
import ConfirmationModal from "../../../../components/confirmation_modal/ConfirmationModal";
import FormInput from "../../../../components/forms/FormInput";
import StatusBadge from "../../../../components/status/statusbadge";
import ToggleSwitch from "./ToggleSwitch";
import useLocalCrudList from "../hooks/useLocalCrudList";
import { APPROVAL_RULES_MOCK, APPROVAL_LEVEL_OPTIONS } from "../mocks/systemConfigMockData";

const emptyForm = () => ({
  minAmount: "",
  maxAmount: "",
  approvalLevel: APPROVAL_LEVEL_OPTIONS[0].value,
  active: true,
});

const formatAmount = (value) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(value);

const formatRange = (item) =>
  item.maxAmount == null
    ? `₹${formatAmount(item.minAmount)} and above`
    : `₹${formatAmount(item.minAmount)} – ₹${formatAmount(item.maxAmount)}`;

const approvalLevelLabel = (value) =>
  APPROVAL_LEVEL_OPTIONS.find((opt) => opt.value === value)?.label || value;

// Two active ranges overlap if one's min falls at/within the other's [min, max] span.
const rangesOverlap = (a, b) => {
  const aMax = a.maxAmount == null ? Infinity : a.maxAmount;
  const bMax = b.maxAmount == null ? Infinity : b.maxAmount;
  return a.minAmount <= bMax && b.minAmount <= aMax;
};

export default function ApprovalRulesTab() {
  const { items, add, update, remove } = useLocalCrudList(APPROVAL_RULES_MOCK);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [errors, setErrors] = useState({});

  const [deleteTarget, setDeleteTarget] = useState(null);

  const sortedItems = useMemo(
    () => [...items].sort((a, b) => a.minAmount - b.minAmount),
    [items]
  );

  const handleFieldChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validate = () => {
    const nextErrors = {};
    if (form.minAmount === "" || Number(form.minAmount) < 0) {
      nextErrors.minAmount = "Minimum amount must be 0 or more.";
    }
    if (form.maxAmount !== "" && Number(form.maxAmount) <= Number(form.minAmount)) {
      nextErrors.maxAmount = "Maximum amount must be greater than the minimum.";
    }

    if (!nextErrors.minAmount && !nextErrors.maxAmount && form.active) {
      const candidate = {
        minAmount: Number(form.minAmount),
        maxAmount: form.maxAmount === "" ? null : Number(form.maxAmount),
      };
      const overlaps = items.some(
        (item) =>
          item.id !== currentItem?.id && item.active && rangesOverlap(item, candidate)
      );
      if (overlaps) {
        nextErrors.minAmount = "This range overlaps another active approval rule.";
      }
    }

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
      minAmount: String(item.minAmount),
      maxAmount: item.maxAmount == null ? "" : String(item.maxAmount),
      approvalLevel: item.approvalLevel,
      active: item.active,
    });
    setErrors({});
    setIsModalOpen(true);
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      minAmount: Number(form.minAmount),
      maxAmount: form.maxAmount === "" ? null : Number(form.maxAmount),
      approvalLevel: form.approvalLevel,
      active: form.active,
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

  const headers = ["Invoice Amount Range", "Approval Level", "Status", "Actions"];
  const columns = ["range", "approvalLevel", "status", "actions"];

  const rows = sortedItems.map((item) => ({
    range: <span className="font-mono text-sm text-gray-800">{formatRange(item)}</span>,
    approvalLevel: (
      <span className="font-medium text-gray-900">{approvalLevelLabel(item.approvalLevel)}</span>
    ),
    status: <StatusBadge label={item.active ? "Active" : "Inactive"} size="sm" />,
    actions: (
      <div className="flex items-center gap-2 justify-center">
        <Button
          type="button"
          variant="link"
          size="icon"
          title="Edit Approval Rule"
          className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50 hover:text-blue-800 transition rounded-md"
          onClick={() => openEditModal(item)}
        >
          <Pencil size={16} />
        </Button>
        <Button
          type="button"
          variant="link"
          size="icon"
          title="Delete Approval Rule"
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
      <div className="flex justify-end">
        <Button variant="primary" onClick={openAddModal} className="whitespace-nowrap">
          <Plus size={16} />
          Add Approval Rule
        </Button>
      </div>

      <div className="w-full overflow-x-auto rounded-lg">
        <GenericTable headers={headers} rows={rows} columns={columns} />
      </div>

      <p className="text-xs text-gray-500">
        Invoice approval routing looks up the applicable rule by invoice amount instead of a
        hardcoded threshold — leave a range's upper bound blank for "and above".
      </p>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={currentItem ? "Edit Approval Rule" : "Add Approval Rule"}
        subtitle="Route invoices to an approval level based on invoice amount."
        size="md"
        closeOnBackdrop={false}
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button type="submit" form="approval-rule-form" variant="primary" className="w-full sm:w-auto">
              Save Approval Rule
            </Button>
          </div>
        }
      >
        <form id="approval-rule-form" onSubmit={handleSave} className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <FormInput
              label="Minimum Amount"
              name="minAmount"
              type="number"
              min="0"
              step="0.01"
              value={form.minAmount}
              onChange={handleFieldChange}
              requiredMark
              error={errors.minAmount}
            />
            <FormInput
              label="Maximum Amount"
              name="maxAmount"
              type="number"
              min="0"
              step="0.01"
              placeholder="Leave blank for no upper limit"
              value={form.maxAmount}
              onChange={handleFieldChange}
              error={errors.maxAmount}
            />
          </div>

          <FormSelect
            label="Approval Level"
            name="approvalLevel"
            value={form.approvalLevel}
            onChange={handleFieldChange}
            options={APPROVAL_LEVEL_OPTIONS}
          />

          <div className="rounded-lg border border-gray-200 p-4">
            <ToggleSwitch
              label="Active"
              checked={form.active}
              onChange={(val) => setForm((prev) => ({ ...prev, active: val }))}
            />
          </div>
        </form>
      </Modal>

      <ConfirmationModal
        isOpen={!!deleteTarget}
        title="Delete Approval Rule"
        message={`Are you sure you want to delete this approval rule (${
          deleteTarget ? formatRange(deleteTarget) : ""
        })? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
        variant="danger"
      />
    </div>
  );
}
