import { useState } from "react";
import { toast } from "react-toastify";
import { Plus, Pencil, Trash2 } from "lucide-react";
import Button from "../../../../../components/Button/Button";
import GenericTable from "../../../../../components/Table/table";
import Modal from "../../../../../components/Modal/modal";
import ConfirmationModal from "../../../../../components/confirmation_modal/ConfirmationModal";
import FormInput from "../../../../../components/forms/FormInput";
import ToggleSwitch from "../ToggleSwitch";
import StatusBadge from "../../../../../components/status/statusbadge";
import LoadingSpinner from "../../../../../components/LoadingSpinner";
import {
  useTdsPaymentNatures,
  useCreateTdsPaymentNature,
  useUpdateTdsPaymentNature,
  useUpdateTdsPaymentNatureStatus,
  useDeleteTdsPaymentNature,
} from "../../hooks/useTdsConfig";
import { useApPermissions } from "../../../hooks/useApPermissions";
import { getApiErrorMessage } from "../../../utils/apiError";

const emptyForm = () => ({ code: "", name: "", description: "", isActive: true });

/**
 * TDS Nature of Payment master — backed by the real /apm/tds/config/payment-natures API. The
 * 8 legacy codes (CONTRACTOR, RENT, etc.) are whatever the backend currently has seeded, not a
 * frontend-hardcoded list — this component never invents them if the API returns something
 * different or empty.
 */
export default function TdsPaymentNatureSection() {
  const { canCreateTdsConfig, canEditTdsConfig, canDeleteTdsConfig } = useApPermissions();
  const { data: natures, isLoading, isError, error } = useTdsPaymentNatures();
  const createNature = useCreateTdsPaymentNature();
  const updateNature = useUpdateTdsPaymentNature();
  const updateStatus = useUpdateTdsPaymentNatureStatus();
  const deleteNature = useDeleteTdsPaymentNature();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [errors, setErrors] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [statusTarget, setStatusTarget] = useState(null);

  const handleFieldChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validate = () => {
    const nextErrors = {};
    if (!form.code.trim()) nextErrors.code = "Code is required.";
    if (!form.name.trim()) nextErrors.name = "Name is required.";
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
    setForm({ code: item.code, name: item.name, description: item.description || "", isActive: item.isActive });
    setErrors({});
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      if (currentItem) {
        await updateNature.mutateAsync({ id: currentItem.id, form });
        toast.success(`"${form.name}" updated.`);
      } else {
        await createNature.mutateAsync(form);
        toast.success(`"${form.name}" created.`);
      }
      setIsModalOpen(false);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Could not save this nature of payment."));
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await deleteNature.mutateAsync(deleteTarget.id);
      toast.success(`"${deleteTarget.name}" deleted.`);
      setDeleteTarget(null);
    } catch (err) {
      const message =
        err?.status === 409
          ? getApiErrorMessage(err, null) ||
            "This nature of payment is currently in use and cannot be deleted. Deactivate it instead."
          : getApiErrorMessage(err, "Could not delete this nature of payment.");
      toast.error(message);
    }
  };

  const handleToggleStatus = async () => {
    if (!statusTarget) return;
    try {
      await updateStatus.mutateAsync({ id: statusTarget.id, isActive: !statusTarget.isActive });
      toast.success(`"${statusTarget.name}" ${statusTarget.isActive ? "deactivated" : "activated"}.`);
      setStatusTarget(null);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Could not update status."));
    }
  };

  const headers = ["Code", "Name", "Description", "Status", "Actions"];
  const columns = ["code", "name", "description", "status", "actions"];

  const rows = (natures || []).map((item) => ({
    code: <span className="font-mono text-sm font-semibold text-gray-900">{item.code}</span>,
    name: item.name,
    description: <span className="text-gray-500">{item.description || "—"}</span>,
    status: <StatusBadge label={item.isActive ? "Active" : "Inactive"} size="sm" />,
    actions: (
      <div className="flex items-center justify-center gap-2">
        {canEditTdsConfig && (
          <Button
            type="button"
            variant="link"
            size="icon"
            title="Edit"
            className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50 hover:text-blue-800 transition rounded-md"
            onClick={() => openEditModal(item)}
          >
            <Pencil size={16} />
          </Button>
        )}
        {canDeleteTdsConfig && (
          <Button
            type="button"
            variant="link"
            size="icon"
            title="Delete"
            className="h-8 w-8 p-0 text-red-600 hover:bg-red-50 hover:text-red-800 transition rounded-md"
            onClick={() => setDeleteTarget(item)}
          >
            <Trash2 size={16} />
          </Button>
        )}
      </div>
    ),
  }));

  return (
    <div className="space-y-4">
      {canCreateTdsConfig && (
        <div className="flex justify-end">
          <Button variant="primary" onClick={openAddModal} className="whitespace-nowrap">
            <Plus size={16} />
            Add Nature of Payment
          </Button>
        </div>
      )}

      {isError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {getApiErrorMessage(error, "Failed to load natures of payment.")}
        </div>
      ) : isLoading ? (
        <LoadingSpinner text="Loading natures of payment..." />
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-10 text-center text-sm text-gray-500">
          No natures of payment configured yet.
        </div>
      ) : (
        <div className="w-full overflow-x-auto rounded-lg">
          <GenericTable headers={headers} rows={rows} columns={columns} />
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={currentItem ? "Edit Nature of Payment" : "Add Nature of Payment"}
        size="sm"
        closeOnBackdrop={false}
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button
              type="submit"
              form="tds-nature-form"
              variant="primary"
              className="w-full sm:w-auto"
              loading={createNature.isPending || updateNature.isPending}
            >
              Save
            </Button>
          </div>
        }
      >
        <form id="tds-nature-form" onSubmit={handleSave} className="space-y-4 py-2">
          <FormInput
            label="Code"
            name="code"
            placeholder="e.g. CONTRACTOR"
            value={form.code}
            onChange={handleFieldChange}
            requiredMark
            error={errors.code}
          />
          <FormInput
            label="Name"
            name="name"
            placeholder="e.g. Contractor"
            value={form.name}
            onChange={handleFieldChange}
            requiredMark
            error={errors.name}
          />
          <FormInput label="Description" name="description" value={form.description} onChange={handleFieldChange} />
          <div className="rounded-lg border border-gray-200 p-4">
            <ToggleSwitch label="Active" checked={form.isActive} onChange={(val) => setForm((prev) => ({ ...prev, isActive: val }))} />
          </div>
        </form>
      </Modal>

      <ConfirmationModal
        isOpen={!!deleteTarget}
        title="Delete Nature of Payment"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? Any TDS rule referencing this code will show it as a plain code instead of a name.`}
        confirmText="Delete"
        cancelText="Cancel"
        isLoading={deleteNature.isPending}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
        variant="danger"
      />

      <ConfirmationModal
        isOpen={!!statusTarget}
        title={statusTarget?.isActive ? "Deactivate" : "Activate"}
        message={`Are you sure you want to ${statusTarget?.isActive ? "deactivate" : "activate"} "${statusTarget?.name}"?`}
        confirmText={statusTarget?.isActive ? "Deactivate" : "Activate"}
        cancelText="Cancel"
        isLoading={updateStatus.isPending}
        onConfirm={handleToggleStatus}
        onCancel={() => setStatusTarget(null)}
        variant={statusTarget?.isActive ? "danger" : "primary"}
      />
    </div>
  );
}
