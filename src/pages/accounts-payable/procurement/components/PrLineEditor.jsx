import { useState } from "react";
import { toast } from "react-toastify";
import { Plus, Pencil, Trash2 } from "lucide-react";
import Button from "../../../../components/Button/Button";
import GenericTable from "../../../../components/Table/table";
import Modal from "../../../../components/Modal/modal";
import ConfirmationModal from "../../../../components/confirmation_modal/ConfirmationModal";
import FormInput from "../../../../components/forms/FormInput";
import { getApiErrorMessage } from "../../utils/apiError";
import { formatCurrency } from "../../utils/formatters";
import { useAddPrLine, useUpdatePrLine, useDeletePrLine } from "../hooks/usePurchaseRequisitionMutations";

const emptyForm = () => ({
  itemName: "",
  description: "",
  quantity: "",
  uom: "",
  estimatedUnitPrice: "",
  estimatedAmount: "",
});

/**
 * PR line management — only rendered editable while the PR is DRAFT
 * (add_line/update_line/delete_line all reject any other status server-side).
 */
export default function PrLineEditor({ prId, lines = [], editable }) {
  const addLine = useAddPrLine(prId);
  const updateLine = useUpdatePrLine(prId);
  const deleteLine = useDeletePrLine(prId);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentLine, setCurrentLine] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [errors, setErrors] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validate = () => {
    const nextErrors = {};
    if (!form.itemName.trim()) nextErrors.itemName = "Item name is required.";
    if (form.quantity === "" || Number(form.quantity) <= 0) {
      nextErrors.quantity = "Quantity must be greater than 0.";
    }
    if (form.estimatedUnitPrice !== "" && Number(form.estimatedUnitPrice) < 0) {
      nextErrors.estimatedUnitPrice = "Cannot be negative.";
    }
    if (form.estimatedAmount !== "" && Number(form.estimatedAmount) < 0) {
      nextErrors.estimatedAmount = "Cannot be negative.";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const openAdd = () => {
    setCurrentLine(null);
    setForm(emptyForm());
    setErrors({});
    setIsModalOpen(true);
  };

  const openEdit = (line) => {
    setCurrentLine(line);
    setForm({
      itemName: line.item_name,
      description: line.description || "",
      quantity: String(line.quantity),
      uom: line.uom || "",
      estimatedUnitPrice: line.estimated_unit_price != null ? String(line.estimated_unit_price) : "",
      estimatedAmount: line.estimated_amount != null ? String(line.estimated_amount) : "",
    });
    setErrors({});
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      item_name: form.itemName.trim(),
      description: form.description.trim() || null,
      quantity: Number(form.quantity),
      uom: form.uom.trim() || null,
      estimated_unit_price: form.estimatedUnitPrice !== "" ? Number(form.estimatedUnitPrice) : null,
      estimated_amount: form.estimatedAmount !== "" ? Number(form.estimatedAmount) : null,
    };

    try {
      if (currentLine) {
        await updateLine.mutateAsync({ lineId: currentLine.id, payload });
        toast.success("Line updated.");
      } else {
        await addLine.mutateAsync(payload);
        toast.success("Line added.");
      }
      setIsModalOpen(false);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to save the line."));
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await deleteLine.mutateAsync(deleteTarget.id);
      toast.success("Line removed.");
      setDeleteTarget(null);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to remove the line."));
    }
  };

  const headers = editable
    ? ["Item", "Description", "Qty", "UOM", "Unit Price", "Amount", "Actions"]
    : ["Item", "Description", "Qty", "UOM", "Unit Price", "Amount"];
  const columns = editable
    ? ["item", "description", "quantity", "uom", "unitPrice", "amount", "actions"]
    : ["item", "description", "quantity", "uom", "unitPrice", "amount"];

  const rows = lines.map((line) => ({
    item: <span className="font-medium text-gray-900">{line.item_name}</span>,
    description: line.description || "—",
    quantity: String(line.quantity),
    uom: line.uom || "—",
    unitPrice: line.estimated_unit_price != null ? formatCurrency(Number(line.estimated_unit_price)) : "—",
    amount: line.estimated_amount != null ? formatCurrency(Number(line.estimated_amount)) : "—",
    actions: editable ? (
      <div className="flex items-center gap-2 justify-center">
        <Button
          type="button"
          variant="link"
          size="icon"
          title="Edit Line"
          className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50 hover:text-blue-800 transition rounded-md"
          onClick={() => openEdit(line)}
        >
          <Pencil size={16} />
        </Button>
        <Button
          type="button"
          variant="link"
          size="icon"
          title="Remove Line"
          className="h-8 w-8 p-0 text-red-600 hover:bg-red-50 hover:text-red-800 transition rounded-md"
          onClick={() => setDeleteTarget(line)}
        >
          <Trash2 size={16} />
        </Button>
      </div>
    ) : null,
  }));

  return (
    <div className="space-y-3">
      {editable && (
        <div className="flex justify-end">
          <Button variant="primary" size="small" onClick={openAdd}>
            <Plus size={14} /> Add Line
          </Button>
        </div>
      )}

      {lines.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
          No lines added yet.
        </div>
      ) : (
        <div className="w-full overflow-x-auto rounded-lg">
          <GenericTable headers={headers} rows={rows} columns={columns} />
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={currentLine ? "Edit Line" : "Add Line"}
        size="md"
        closeOnBackdrop={false}
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button
              type="submit"
              form="pr-line-form"
              variant="primary"
              className="w-full sm:w-auto"
              loading={addLine.isPending || updateLine.isPending}
              loadingText="Saving..."
            >
              Save Line
            </Button>
          </div>
        }
      >
        <form id="pr-line-form" onSubmit={handleSave} className="space-y-4 py-2">
          <FormInput
            label="Item Name"
            name="itemName"
            placeholder="e.g. Dell Latitude Laptop"
            value={form.itemName}
            onChange={handleChange}
            requiredMark
            error={errors.itemName}
          />
          <FormInput
            label="Description"
            name="description"
            value={form.description}
            onChange={handleChange}
          />
          <div className="grid grid-cols-2 gap-4">
            <FormInput
              label="Quantity"
              name="quantity"
              type="number"
              min="0"
              step="0.0001"
              value={form.quantity}
              onChange={handleChange}
              requiredMark
              error={errors.quantity}
            />
            <FormInput label="UOM" name="uom" placeholder="e.g. Nos" value={form.uom} onChange={handleChange} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormInput
              label="Estimated Unit Price"
              name="estimatedUnitPrice"
              type="number"
              min="0"
              step="0.01"
              value={form.estimatedUnitPrice}
              onChange={handleChange}
              error={errors.estimatedUnitPrice}
            />
            <FormInput
              label="Estimated Amount"
              name="estimatedAmount"
              type="number"
              min="0"
              step="0.01"
              value={form.estimatedAmount}
              onChange={handleChange}
              error={errors.estimatedAmount}
            />
          </div>
        </form>
      </Modal>

      <ConfirmationModal
        isOpen={!!deleteTarget}
        title="Remove Line"
        message={`Remove "${deleteTarget?.item_name}" from this requisition?`}
        confirmText="Remove"
        cancelText="Cancel"
        isLoading={deleteLine.isPending}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
        variant="danger"
      />
    </div>
  );
}
