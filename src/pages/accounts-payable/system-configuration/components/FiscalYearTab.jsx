import { useState, useMemo } from "react";
import { Plus, Pencil, Trash2, Lock } from "lucide-react";
import { toast } from "react-toastify";
import Button from "../../../../components/Button/Button";
import GenericTable from "../../../../components/Table/table";
import FormSelect from "../../../../components/forms/FormSelect";
import Modal from "../../../../components/Modal/modal";
import ConfirmationModal from "../../../../components/confirmation_modal/ConfirmationModal";
import FormInput from "../../../../components/forms/FormInput";
import ToggleSwitch from "./ToggleSwitch";
import useLocalCrudList from "../hooks/useLocalCrudList";
import { FISCAL_YEARS_MOCK, FISCAL_YEAR_STATUS_OPTIONS } from "../mocks/systemConfigMockData";

const emptyForm = () => ({
  fiscalYearCode: "",
  startDate: "",
  endDate: "",
  status: "FUTURE",
  isCurrent: false,
});

const STATUS_BADGE_STYLES = {
  OPEN: "bg-green-100 text-green-700",
  CLOSED: "bg-gray-200 text-gray-600",
  FUTURE: "bg-blue-100 text-blue-700",
};

export default function FiscalYearTab() {
  const { items, add, update, remove } = useLocalCrudList(FISCAL_YEARS_MOCK);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [errors, setErrors] = useState({});

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [closeTarget, setCloseTarget] = useState(null);

  const sortedItems = useMemo(
    () => [...items].sort((a, b) => a.startDate.localeCompare(b.startDate)),
    [items]
  );

  const handleFieldChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validate = () => {
    const nextErrors = {};
    if (!form.fiscalYearCode.trim()) nextErrors.fiscalYearCode = "Fiscal year code is required.";
    if (!form.startDate) nextErrors.startDate = "Start date is required.";
    if (!form.endDate) nextErrors.endDate = "End date is required.";
    if (form.startDate && form.endDate && form.endDate <= form.startDate) {
      nextErrors.endDate = "End date must be after the start date.";
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
      fiscalYearCode: item.fiscalYearCode,
      startDate: item.startDate,
      endDate: item.endDate,
      status: item.status,
      isCurrent: item.isCurrent,
    });
    setErrors({});
    setIsModalOpen(true);
  };

  // Only one fiscal year may be marked current at a time.
  const clearOtherCurrent = (exceptId) => {
    items
      .filter((item) => item.isCurrent && item.id !== exceptId)
      .forEach((item) => update(item.id, { isCurrent: false }));
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      fiscalYearCode: form.fiscalYearCode.trim(),
      startDate: form.startDate,
      endDate: form.endDate,
      status: form.status,
      isCurrent: form.isCurrent,
    };

    if (payload.isCurrent) clearOtherCurrent(currentItem?.id);

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

  const handleCloseYearConfirm = () => {
    if (!closeTarget) return;

    update(closeTarget.id, { status: "CLOSED", isCurrent: false });

    const nextYear = items
      .filter((item) => item.id !== closeTarget.id && item.status === "FUTURE")
      .sort((a, b) => a.startDate.localeCompare(b.startDate))[0];

    if (nextYear) {
      update(nextYear.id, { status: "OPEN", isCurrent: true });
      toast.success(`${closeTarget.fiscalYearCode} closed. ${nextYear.fiscalYearCode} is now open.`);
    } else {
      toast.success(`${closeTarget.fiscalYearCode} closed.`);
    }
    setCloseTarget(null);
  };

  const headers = ["FY Code", "Start Date", "End Date", "Status", "Current", "Actions"];
  const columns = ["fiscalYearCode", "startDate", "endDate", "status", "isCurrent", "actions"];

  const rows = sortedItems.map((item) => ({
    fiscalYearCode: <span className="font-mono text-sm font-semibold text-gray-900">{item.fiscalYearCode}</span>,
    startDate: item.startDate,
    endDate: item.endDate,
    status: (
      <span
        className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${
          STATUS_BADGE_STYLES[item.status] || "bg-gray-100 text-gray-600"
        }`}
      >
        {item.status}
      </span>
    ),
    isCurrent: item.isCurrent ? (
      <span className="text-xs font-semibold text-indigo-600">Current</span>
    ) : (
      <span className="text-gray-400">—</span>
    ),
    actions: (
      <div className="flex items-center gap-2 justify-center">
        {item.status === "OPEN" && (
          <Button
            type="button"
            variant="outline"
            size="small"
            title="Close Fiscal Year"
            onClick={() => setCloseTarget(item)}
          >
            <Lock size={14} />
            Close Year
          </Button>
        )}
        <Button
          type="button"
          variant="link"
          size="icon"
          title="Edit Fiscal Year"
          className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50 hover:text-blue-800 transition rounded-md"
          onClick={() => openEditModal(item)}
        >
          <Pencil size={16} />
        </Button>
        <Button
          type="button"
          variant="link"
          size="icon"
          title="Delete Fiscal Year"
          disabled={item.status !== "FUTURE"}
          className="h-8 w-8 p-0 text-red-600 hover:bg-red-50 hover:text-red-800 transition rounded-md disabled:opacity-30"
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
          Add Fiscal Year
        </Button>
      </div>

      <div className="w-full overflow-x-auto rounded-lg">
        <GenericTable headers={headers} rows={rows} columns={columns} />
      </div>

      <p className="text-xs text-gray-500">
        Tax rates are resolved from each invoice's date against the effective dates on Tax Rules —
        not from the fiscal year. Fiscal years only track accounting periods and close status.
      </p>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={currentItem ? "Edit Fiscal Year" : "Add Fiscal Year"}
        subtitle="Define an accounting period and its current status."
        size="md"
        closeOnBackdrop={false}
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button type="submit" form="fiscal-year-form" variant="primary" className="w-full sm:w-auto">
              Save Fiscal Year
            </Button>
          </div>
        }
      >
        <form id="fiscal-year-form" onSubmit={handleSave} className="space-y-4 py-2">
          <FormInput
            label="Fiscal Year Code"
            name="fiscalYearCode"
            placeholder="e.g. FY2027-28"
            value={form.fiscalYearCode}
            onChange={handleFieldChange}
            requiredMark
            error={errors.fiscalYearCode}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormInput
              label="Start Date"
              name="startDate"
              type="date"
              value={form.startDate}
              onChange={handleFieldChange}
              requiredMark
              error={errors.startDate}
            />
            <FormInput
              label="End Date"
              name="endDate"
              type="date"
              value={form.endDate}
              onChange={handleFieldChange}
              requiredMark
              error={errors.endDate}
            />
          </div>

          <FormSelect
            label="Status"
            name="status"
            value={form.status}
            onChange={handleFieldChange}
            options={FISCAL_YEAR_STATUS_OPTIONS}
          />

          <div className="rounded-lg border border-gray-200 p-4">
            <ToggleSwitch
              label="Current Fiscal Year"
              checked={form.isCurrent}
              onChange={(val) => setForm((prev) => ({ ...prev, isCurrent: val }))}
            />
          </div>
        </form>
      </Modal>

      <ConfirmationModal
        isOpen={!!deleteTarget}
        title="Delete Fiscal Year"
        message={`Are you sure you want to delete "${deleteTarget?.fiscalYearCode}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
        variant="danger"
      />

      <ConfirmationModal
        isOpen={!!closeTarget}
        title="Close Fiscal Year"
        message={`Close "${closeTarget?.fiscalYearCode}"? Any future fiscal year on record will be opened and marked current.`}
        confirmText="Close Year"
        cancelText="Cancel"
        onConfirm={handleCloseYearConfirm}
        onCancel={() => setCloseTarget(null)}
        variant="primary"
      />
    </div>
  );
}
