import { useState, useMemo } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import Button from "../../../../components/Button/Button";
import GenericTable from "../../../../components/Table/table";
import SearchInput from "../../../../components/filter/Searchbar";
import Modal from "../../../../components/Modal/modal";
import ConfirmationModal from "../../../../components/confirmation_modal/ConfirmationModal";
import FormInput from "../../../../components/forms/FormInput";
import FormSelect from "../../../../components/forms/FormSelect";
import useLocalCrudList from "../hooks/useLocalCrudList";
import { GENERAL_CONFIG_MOCK, DATA_TYPE_OPTIONS } from "../mocks/systemConfigMockData";

const EMPTY_FORM = { configKey: "", value: "", dataType: "STRING", description: "" };

export default function GeneralConfigurationTab() {
  const { items, add, update, remove } = useLocalCrudList(GENERAL_CONFIG_MOCK);
  const [search, setSearch] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});

  const [deleteTarget, setDeleteTarget] = useState(null);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (item) =>
        item.configKey.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q)
    );
  }, [items, search]);

  const handleFieldChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validate = () => {
    const nextErrors = {};
    if (!form.configKey.trim()) nextErrors.configKey = "Config key is required.";
    if (!form.value.trim()) nextErrors.value = "Value is required.";
    if (!form.description.trim()) nextErrors.description = "Description is required.";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const openAddModal = () => {
    setCurrentItem(null);
    setForm(EMPTY_FORM);
    setErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (item) => {
    setCurrentItem(item);
    setForm({
      configKey: item.configKey,
      value: item.value,
      dataType: item.dataType,
      description: item.description,
    });
    setErrors({});
    setIsModalOpen(true);
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = { ...form, configKey: form.configKey.trim().toUpperCase(), updatedBy: "AP Admin" };
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

  const headers = ["Config Key", "Value", "Data Type", "Description", "Updated By", "Actions"];
  const columns = ["configKey", "value", "dataType", "description", "updatedBy", "actions"];

  const rows = filteredItems.map((item) => ({
    configKey: <span className="font-semibold text-gray-900">{item.configKey}</span>,
    value: <span className="font-mono text-gray-700">{item.value}</span>,
    dataType: <span className="text-xs font-medium text-gray-500">{item.dataType}</span>,
    description: item.description,
    updatedBy: item.updatedBy,
    actions: (
      <div className="flex items-center gap-2 justify-center">
        <Button
          type="button"
          variant="link"
          size="icon"
          title="Edit Configuration"
          className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50 hover:text-blue-800 transition rounded-md"
          onClick={() => openEditModal(item)}
        >
          <Pencil size={16} />
        </Button>
        <Button
          type="button"
          variant="link"
          size="icon"
          title="Delete Configuration"
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
          <SearchInput onSearch={setSearch} placeholder="Search by config key or description..." />
        </div>
        <Button variant="primary" onClick={openAddModal} className="whitespace-nowrap">
          <Plus size={16} />
          Add Configuration
        </Button>
      </div>

      <div className="w-full overflow-x-auto rounded-lg">
        <GenericTable headers={headers} rows={rows} columns={columns} />
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={currentItem ? "Edit Configuration" : "Add Configuration"}
        subtitle="Define a system-wide configuration key used across AP."
        size="md"
        closeOnBackdrop={false}
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button type="submit" form="general-config-form" variant="primary" className="w-full sm:w-auto">
              Save Configuration
            </Button>
          </div>
        }
      >
        <form id="general-config-form" onSubmit={handleSave} className="space-y-4 py-2">
          <FormInput
            label="Config Key"
            name="configKey"
            placeholder="e.g. INVOICE_DUE_DAYS"
            value={form.configKey}
            onChange={handleFieldChange}
            requiredMark
            disabled={!!currentItem}
            error={errors.configKey}
          />
          <FormInput
            label="Value"
            name="value"
            placeholder="e.g. 30"
            value={form.value}
            onChange={handleFieldChange}
            requiredMark
            error={errors.value}
          />
          <FormSelect
            label="Data Type"
            name="dataType"
            value={form.dataType}
            onChange={handleFieldChange}
            options={DATA_TYPE_OPTIONS}
          />
          <FormInput
            label="Description"
            name="description"
            placeholder="Describe what this configuration controls"
            value={form.description}
            onChange={handleFieldChange}
            requiredMark
            error={errors.description}
          />
        </form>
      </Modal>

      <ConfirmationModal
        isOpen={!!deleteTarget}
        title="Delete Configuration"
        message={`Are you sure you want to delete "${deleteTarget?.configKey}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
        variant="danger"
      />
    </div>
  );
}
