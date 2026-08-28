import { useState, useMemo } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import Button from "../../../../components/Button/Button";
import GenericTable from "../../../../components/Table/table";
import SearchInput from "../../../../components/filter/Searchbar";
import FormSelect from "../../../../components/forms/FormSelect";
import Modal from "../../../../components/Modal/modal";
import ConfirmationModal from "../../../../components/confirmation_modal/ConfirmationModal";
import FormInput from "../../../../components/forms/FormInput";
import useLocalCrudList from "../hooks/useLocalCrudList";
import { STATUS_MASTER_MOCK, STATUS_MODULE_OPTIONS } from "../mocks/systemConfigMockData";

const emptyForm = (module) => ({ module, statusCode: "", statusName: "", displayOrder: "" });

export default function StatusMasterTab() {
  const { items, add, update, remove } = useLocalCrudList(STATUS_MASTER_MOCK);
  const [moduleFilter, setModuleFilter] = useState(STATUS_MODULE_OPTIONS[0].value);
  const [search, setSearch] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);
  const [form, setForm] = useState(emptyForm(STATUS_MODULE_OPTIONS[0].value));
  const [errors, setErrors] = useState({});

  const [deleteTarget, setDeleteTarget] = useState(null);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items
      .filter((item) => item.module === moduleFilter)
      .filter(
        (item) =>
          !q ||
          item.statusCode.toLowerCase().includes(q) ||
          item.statusName.toLowerCase().includes(q)
      )
      .sort((a, b) => a.displayOrder - b.displayOrder);
  }, [items, moduleFilter, search]);

  const handleFieldChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validate = () => {
    const nextErrors = {};
    if (!form.statusCode.trim()) nextErrors.statusCode = "Status code is required.";
    if (!form.statusName.trim()) nextErrors.statusName = "Status name is required.";
    if (form.displayOrder === "" || Number(form.displayOrder) <= 0) {
      nextErrors.displayOrder = "Display order must be a positive number.";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const openAddModal = () => {
    setCurrentItem(null);
    setForm(emptyForm(moduleFilter));
    setErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (item) => {
    setCurrentItem(item);
    setForm({
      module: item.module,
      statusCode: item.statusCode,
      statusName: item.statusName,
      displayOrder: String(item.displayOrder),
    });
    setErrors({});
    setIsModalOpen(true);
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      module: form.module,
      statusCode: form.statusCode.trim().toUpperCase(),
      statusName: form.statusName.trim(),
      displayOrder: Number(form.displayOrder),
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

  const headers = ["Status Code", "Status Name", "Display Order", "Actions"];
  const columns = ["statusCode", "statusName", "displayOrder", "actions"];

  const rows = filteredItems.map((item) => ({
    statusCode: <span className="font-mono text-xs font-semibold text-gray-700">{item.statusCode}</span>,
    statusName: <span className="font-medium text-gray-900">{item.statusName}</span>,
    displayOrder: item.displayOrder,
    actions: (
      <div className="flex items-center gap-2 justify-center">
        <Button
          type="button"
          variant="link"
          size="icon"
          title="Edit Status"
          className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50 hover:text-blue-800 transition rounded-md"
          onClick={() => openEditModal(item)}
        >
          <Pencil size={16} />
        </Button>
        <Button
          type="button"
          variant="link"
          size="icon"
          title="Delete Status"
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
              label="Module"
              name="module"
              value={moduleFilter}
              onChange={(e) => setModuleFilter(e.target.value)}
              options={STATUS_MODULE_OPTIONS}
            />
          </div>
          <div className="w-full sm:w-64">
            <SearchInput onSearch={setSearch} placeholder="Search by status code or name..." />
          </div>
        </div>
        <Button variant="primary" onClick={openAddModal} className="whitespace-nowrap">
          <Plus size={16} />
          Add Status
        </Button>
      </div>

      <div className="w-full overflow-x-auto rounded-lg">
        <GenericTable headers={headers} rows={rows} columns={columns} />
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={currentItem ? "Edit Status" : "Add Status"}
        subtitle={`Define a status used within the ${form.module} module.`}
        size="md"
        closeOnBackdrop={false}
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button type="submit" form="status-master-form" variant="primary" className="w-full sm:w-auto">
              Save Status
            </Button>
          </div>
        }
      >
        <form id="status-master-form" onSubmit={handleSave} className="space-y-4 py-2">
          <FormSelect
            label="Module"
            name="module"
            value={form.module}
            onChange={handleFieldChange}
            options={STATUS_MODULE_OPTIONS}
          />
          <FormInput
            label="Status Code"
            name="statusCode"
            placeholder="e.g. PENDING_APPROVAL"
            value={form.statusCode}
            onChange={handleFieldChange}
            requiredMark
            error={errors.statusCode}
          />
          <FormInput
            label="Status Name"
            name="statusName"
            placeholder="e.g. Pending Approval"
            value={form.statusName}
            onChange={handleFieldChange}
            requiredMark
            error={errors.statusName}
          />
          <FormInput
            label="Display Order"
            name="displayOrder"
            type="number"
            min="1"
            value={form.displayOrder}
            onChange={handleFieldChange}
            requiredMark
            error={errors.displayOrder}
          />
        </form>
      </Modal>

      <ConfirmationModal
        isOpen={!!deleteTarget}
        title="Delete Status"
        message={`Are you sure you want to delete the status "${deleteTarget?.statusName}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
        variant="danger"
      />
    </div>
  );
}
