import { useState, useMemo } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import Button from "../../../../components/Button/Button";
import GenericTable from "../../../../components/Table/table";
import SearchInput from "../../../../components/filter/Searchbar";
import Modal from "../../../../components/Modal/modal";
import ConfirmationModal from "../../../../components/confirmation_modal/ConfirmationModal";
import FormInput from "../../../../components/forms/FormInput";
import StatusBadge from "../../../../components/status/statusbadge";
import ToggleSwitch from "./ToggleSwitch";
import useLocalCrudList from "../hooks/useLocalCrudList";
import { PAYMENT_TERMS_MOCK } from "../mocks/systemConfigMockData";

const emptyForm = () => ({
  termName: "",
  dueDays: "",
  discountPercent: "0.00",
  discountDays: "0",
  systemDefault: false,
  active: true,
});

export default function PaymentTermsTab() {
  const { items, add, update, remove } = useLocalCrudList(PAYMENT_TERMS_MOCK);
  const [search, setSearch] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [errors, setErrors] = useState({});

  const [deleteTarget, setDeleteTarget] = useState(null);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => item.termName.toLowerCase().includes(q));
  }, [items, search]);

  const handleFieldChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleToggleChange = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const validate = () => {
    const nextErrors = {};
    if (!form.termName.trim()) nextErrors.termName = "Term name is required.";
    if (form.dueDays === "" || Number(form.dueDays) < 0) nextErrors.dueDays = "Due days must be 0 or more.";
    if (form.discountPercent === "" || Number(form.discountPercent) < 0) {
      nextErrors.discountPercent = "Discount % must be 0 or more.";
    }
    if (form.discountDays === "" || Number(form.discountDays) < 0) {
      nextErrors.discountDays = "Discount days must be 0 or more.";
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
      termName: item.termName,
      dueDays: String(item.dueDays),
      discountPercent: String(item.discountPercent),
      discountDays: String(item.discountDays),
      systemDefault: item.systemDefault,
      active: item.active,
    });
    setErrors({});
    setIsModalOpen(true);
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      termName: form.termName.trim(),
      dueDays: Number(form.dueDays),
      discountPercent: Number(form.discountPercent).toFixed(2),
      discountDays: Number(form.discountDays),
      systemDefault: form.systemDefault,
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

  const headers = [
    "Term Name",
    "Due Days",
    "Discount %",
    "Discount Days",
    "System Default",
    "Status",
    "Actions",
  ];
  const columns = [
    "termName",
    "dueDays",
    "discountPercent",
    "discountDays",
    "systemDefault",
    "status",
    "actions",
  ];

  const rows = filteredItems.map((item) => ({
    termName: <span className="font-medium text-gray-900">{item.termName}</span>,
    dueDays: item.dueDays,
    discountPercent: `${item.discountPercent}%`,
    discountDays: item.discountDays,
    systemDefault: item.systemDefault ? (
      <span className="text-xs font-semibold text-indigo-600">Default</span>
    ) : (
      <span className="text-gray-400">—</span>
    ),
    status: <StatusBadge label={item.active ? "Active" : "Inactive"} size="sm" />,
    actions: (
      <div className="flex items-center gap-2 justify-center">
        <Button
          type="button"
          variant="link"
          size="icon"
          title="Edit Payment Term"
          className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50 hover:text-blue-800 transition rounded-md"
          onClick={() => openEditModal(item)}
        >
          <Pencil size={16} />
        </Button>
        <Button
          type="button"
          variant="link"
          size="icon"
          title="Delete Payment Term"
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="w-full sm:max-w-md">
          <SearchInput onSearch={setSearch} placeholder="Search by term name..." />
        </div>
        <Button variant="primary" onClick={openAddModal} className="whitespace-nowrap">
          <Plus size={16} />
          Add Payment Term
        </Button>
      </div>

      <div className="w-full overflow-x-auto rounded-lg">
        <GenericTable headers={headers} rows={rows} columns={columns} />
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={currentItem ? "Edit Payment Term" : "Add Payment Term"}
        subtitle="Define payment due windows and early-payment discounts."
        size="md"
        closeOnBackdrop={false}
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button type="submit" form="payment-term-form" variant="primary" className="w-full sm:w-auto">
              Save Payment Term
            </Button>
          </div>
        }
      >
        <form id="payment-term-form" onSubmit={handleSave} className="space-y-4 py-2">
          <FormInput
            label="Term Name"
            name="termName"
            placeholder="e.g. Net 30"
            value={form.termName}
            onChange={handleFieldChange}
            requiredMark
            error={errors.termName}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormInput
              label="Due Days"
              name="dueDays"
              type="number"
              min="0"
              value={form.dueDays}
              onChange={handleFieldChange}
              requiredMark
              error={errors.dueDays}
            />
            <FormInput
              label="Discount %"
              name="discountPercent"
              type="number"
              min="0"
              step="0.01"
              value={form.discountPercent}
              onChange={handleFieldChange}
              error={errors.discountPercent}
            />
          </div>

          <FormInput
            label="Discount Days"
            name="discountDays"
            type="number"
            min="0"
            value={form.discountDays}
            onChange={handleFieldChange}
            error={errors.discountDays}
          />

          <div className="grid grid-cols-2 gap-4 rounded-lg border border-gray-200 p-4">
            <ToggleSwitch
              label="System Default"
              checked={form.systemDefault}
              onChange={(val) => handleToggleChange("systemDefault", val)}
            />
            <ToggleSwitch
              label="Active"
              checked={form.active}
              onChange={(val) => handleToggleChange("active", val)}
            />
          </div>
        </form>
      </Modal>

      <ConfirmationModal
        isOpen={!!deleteTarget}
        title="Delete Payment Term"
        message={`Are you sure you want to delete the payment term "${deleteTarget?.termName}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
        variant="danger"
      />
    </div>
  );
}
