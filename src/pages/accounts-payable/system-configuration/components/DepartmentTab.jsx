import { useState, useMemo } from "react";
import { toast } from "react-toastify";
import { Plus, Pencil, Trash2 } from "lucide-react";
import Button from "../../../../components/Button/Button";
import GenericTable from "../../../../components/Table/table";
import SearchInput from "../../../../components/filter/Searchbar";
import Modal from "../../../../components/Modal/modal";
import ConfirmationModal from "../../../../components/confirmation_modal/ConfirmationModal";
import FormInput from "../../../../components/forms/FormInput";
import StatusBadge from "../../../../components/status/statusbadge";
import ToggleSwitch from "./ToggleSwitch";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import { getApiErrorMessage } from "../../utils/apiError";
import useDepartments from "../hooks/useDepartments";
import {
  useCreateDepartment,
  useUpdateDepartment,
  useDeleteDepartment,
} from "../hooks/useDepartmentMutations";

const emptyForm = () => ({
  departmentCode: "",
  departmentName: "",
  isActive: true,
});

export default function DepartmentTab() {
  const { data, isLoading, isError, error } = useDepartments();
  const departments = data || [];

  const createMutation = useCreateDepartment();
  const updateMutation = useUpdateDepartment();
  const deleteMutation = useDeleteDepartment();

  const [search, setSearch] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [errors, setErrors] = useState({});

  const [deleteTarget, setDeleteTarget] = useState(null);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return departments;
    return departments.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.code.toLowerCase().includes(q)
    );
  }, [departments, search]);

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
    if (!form.departmentCode.trim()) nextErrors.departmentCode = "Department code is required.";
    if (!form.departmentName.trim()) nextErrors.departmentName = "Department name is required.";
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
      departmentCode: item.code,
      departmentName: item.name,
      isActive: item.is_active,
    });
    setErrors({});
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      code: form.departmentCode.trim().toUpperCase(),
      name: form.departmentName.trim(),
      is_active: form.isActive,
    };

    try {
      if (currentItem) {
        await updateMutation.mutateAsync({ departmentId: currentItem.id, payload });
        toast.success("Department updated.");
      } else {
        await createMutation.mutateAsync(payload);
        toast.success("Department added.");
      }
      setIsModalOpen(false);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to save department."));
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      toast.success("Department deleted.");
      setDeleteTarget(null);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to delete department."));
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  const headers = ["Department Code", "Department Name", "Status", "Actions"];
  const columns = ["departmentCode", "departmentName", "status", "actions"];

  const rows = filteredItems.map((item) => ({
    departmentCode: <span className="font-mono text-xs font-semibold text-gray-700">{item.code}</span>,
    departmentName: <span className="font-medium text-gray-900">{item.name}</span>,
    status: <StatusBadge label={item.is_active ? "Active" : "Inactive"} size="sm" />,
    actions: (
      <div className="flex items-center gap-2 justify-center">
        <Button
          type="button"
          variant="link"
          size="icon"
          title="Edit Department"
          className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50 hover:text-blue-800 transition rounded-md"
          onClick={() => openEditModal(item)}
        >
          <Pencil size={16} />
        </Button>
        <Button
          type="button"
          variant="link"
          size="icon"
          title="Delete Department"
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
          <SearchInput onSearch={setSearch} placeholder="Search by department code or name..." />
        </div>
        <Button variant="primary" onClick={openAddModal} className="whitespace-nowrap">
          <Plus size={16} />
          Add Department
        </Button>
      </div>

      {isError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {getApiErrorMessage(error, "Failed to load departments.")}
        </div>
      ) : isLoading ? (
        <LoadingSpinner text="Loading departments..." />
      ) : (
        <div className="w-full overflow-x-auto rounded-lg">
          <GenericTable headers={headers} rows={rows} columns={columns} />
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={currentItem ? "Edit Department" : "Add Department"}
        subtitle="Define a department used to categorize vendors and invoices."
        size="md"
        closeOnBackdrop={false}
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="w-full sm:w-auto" disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" form="department-form" variant="primary" className="w-full sm:w-auto" loading={isSaving} loadingText="Saving...">
              Save Department
            </Button>
          </div>
        }
      >
        <form id="department-form" onSubmit={handleSave} className="space-y-4 py-2">
          <FormInput
            label="Department Code"
            name="departmentCode"
            placeholder="e.g. FIN"
            value={form.departmentCode}
            onChange={handleFieldChange}
            requiredMark
            error={errors.departmentCode}
          />
          <FormInput
            label="Department Name"
            name="departmentName"
            placeholder="e.g. Finance"
            value={form.departmentName}
            onChange={handleFieldChange}
            requiredMark
            error={errors.departmentName}
          />
          <div className="rounded-lg border border-gray-200 p-4">
            <ToggleSwitch
              label="Active"
              checked={form.isActive}
              onChange={(val) => handleToggleChange("isActive", val)}
            />
          </div>
        </form>
      </Modal>

      <ConfirmationModal
        isOpen={!!deleteTarget}
        title="Delete Department"
        message={`Are you sure you want to delete the department "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        isLoading={deleteMutation.isPending}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
        variant="danger"
      />
    </div>
  );
}
