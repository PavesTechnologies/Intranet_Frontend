import { useState } from "react";
import { toast } from "react-toastify";
import { Plus, Pencil, Trash2 } from "lucide-react";
import Button from "../../../../components/Button/Button";
import GenericTable from "../../../../components/Table/table";
import Modal from "../../../../components/Modal/modal";
import ConfirmationModal from "../../../../components/confirmation_modal/ConfirmationModal";
import FormInput from "../../../../components/forms/FormInput";
import FormSelect from "../../../../components/forms/FormSelect";
import { getApiErrorMessage } from "../../utils/apiError";
import { formatCurrency } from "../../utils/formatters";
import { useAddPrLine, useUpdatePrLine, useDeletePrLine } from "../hooks/usePurchaseRequisitionMutations";
import { useUoms } from "../../hooks/useApLookups";
import { CUSTOM_UOM_VALUE, validateQuantityForUom } from "../constants/uom";

const emptyForm = () => ({
  itemName: "",
  description: "",
  quantity: "",
  uom: "",
  customUom: "",
  estimatedUnitPrice: "",
  estimatedAmount: "",
});

/**
 * Estimated Amount = Quantity x Estimated Unit Price, always derived rather than typed in —
 * rounding once to 2 decimals (not truncating) avoids the binary floating-point drift that
 * `qty * price` alone can produce (e.g. 2.5 * 100 -> 250.00000000000003).
 */
const computeEstimatedAmount = (quantity, unitPrice) => {
  if (quantity === "" || unitPrice === "") return "";
  const qty = Number(quantity);
  const price = Number(unitPrice);
  if (!Number.isFinite(qty) || !Number.isFinite(price)) return "";
  return String(Math.round((qty * price + Number.EPSILON) * 100) / 100);
};

/**
 * PR line management — only rendered editable while the PR is DRAFT
 * (add_line/update_line/delete_line all reject any other status server-side).
 */
export default function PrLineEditor({ prId, lines = [], editable }) {
  const addLine = useAddPrLine(prId);
  const updateLine = useUpdatePrLine(prId);
  const deleteLine = useDeletePrLine(prId);
  const { data: uomRows = [], isLoading: uomsLoading, isError: uomsError } = useUoms();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentLine, setCurrentLine] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [errors, setErrors] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);

  const uomByCode = new Map(uomRows.map((u) => [u.code, u]));
  const uomOptions = [
    ...uomRows.map((u) => ({ value: u.code, label: `${u.name} (${u.code})` })),
    { value: CUSTOM_UOM_VALUE, label: "Custom UOM" },
  ];
  // Custom UOM always allows a decimal quantity (matches the backend's own _build_line rule);
  // for a standard code, defer to the master row — permissive (true) while it's still loading
  // rather than blocking entry before the dropdown is even populated.
  const allowDecimalForSelection = (selection) =>
    selection === CUSTOM_UOM_VALUE ? true : uomByCode.get(selection)?.allows_decimal ?? true;

  const isCustomUom = form.uom === CUSTOM_UOM_VALUE;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => {
      const next = { ...prev, [name]: value };
      if (name === "quantity" || name === "estimatedUnitPrice") {
        next.estimatedAmount = computeEstimatedAmount(next.quantity, next.estimatedUnitPrice);
      }
      // Switching away from Custom UOM drops whatever free-text value was typed, so it can never
      // be silently resubmitted alongside a newly selected standard code.
      if (name === "uom" && value !== CUSTOM_UOM_VALUE) {
        next.customUom = "";
      }
      return next;
    });
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));

    // Changing UOM must revalidate the quantity already entered (e.g. KG "2.5" -> EA is now
    // invalid) instead of leaving a stale/incorrect error state, without ever rounding/coercing
    // the value itself.
    if (name === "uom" && form.quantity !== "") {
      setErrors((prev) => ({
        ...prev,
        quantity: validateQuantityForUom(form.quantity, allowDecimalForSelection(value)) || "",
      }));
    }
  };

  const validate = () => {
    const nextErrors = {};
    if (!form.itemName.trim()) nextErrors.itemName = "Item name is required.";
    if (!form.uom) nextErrors.uom = "UOM is required.";
    if (isCustomUom && !form.customUom.trim()) nextErrors.customUom = "Enter the custom unit of measure.";
    const quantityError = validateQuantityForUom(form.quantity, allowDecimalForSelection(form.uom));
    if (quantityError) nextErrors.quantity = quantityError;
    if (form.estimatedUnitPrice !== "" && Number(form.estimatedUnitPrice) < 0) {
      nextErrors.estimatedUnitPrice = "Cannot be negative.";
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
    const quantity = String(line.quantity);
    const estimatedUnitPrice = line.estimated_unit_price != null ? String(line.estimated_unit_price) : "";
    const lineIsCustomUom = Boolean(line.is_custom_uom);
    setForm({
      itemName: line.item_name,
      description: line.description || "",
      quantity,
      // The backend stores a custom UOM's free-text value in the same `uom` field as a standard
      // code, distinguished only by is_custom_uom — so preserving it here just means routing that
      // same value to the Custom UOM text field instead of the dropdown.
      uom: lineIsCustomUom ? CUSTOM_UOM_VALUE : line.uom || "",
      customUom: lineIsCustomUom ? line.uom || "" : "",
      estimatedUnitPrice,
      estimatedAmount: computeEstimatedAmount(quantity, estimatedUnitPrice),
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
      uom: isCustomUom ? form.customUom.trim() : form.uom,
      is_custom_uom: isCustomUom,
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

  const quantityStep = allowDecimalForSelection(form.uom) ? "0.01" : "1";

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
    uom: line.uom ? `${line.uom}${line.is_custom_uom ? " (Custom)" : ""}` : "—",
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <FormSelect
                label={
                  <>
                    UOM <span className="text-red-500">*</span>
                  </>
                }
                name="uom"
                value={form.uom}
                onChange={handleChange}
                options={uomOptions}
                placeholder={uomsLoading ? "Loading UOMs..." : "Select UOM"}
              />
              {errors.uom && <p className="mt-1 text-xs text-red-500">{errors.uom}</p>}
              {!errors.uom && uomsError && (
                <p className="mt-1 text-xs text-red-500">
                  Unable to load standard UOMs — Custom UOM is still available.
                </p>
              )}
              {!errors.uom && !uomsError && !uomsLoading && uomRows.length === 0 && (
                <p className="mt-1 text-xs text-amber-600">
                  No standard UOMs configured — use Custom UOM.
                </p>
              )}
            </div>
            <FormInput
              label={`Quantity${form.uom && !isCustomUom ? ` (${form.uom})` : ""}`}
              name="quantity"
              type="number"
              min="0"
              step={quantityStep}
              value={form.quantity}
              onChange={handleChange}
              requiredMark
              error={errors.quantity}
            />
          </div>
          {isCustomUom && (
            <FormInput
              label="Custom UOM"
              name="customUom"
              placeholder="e.g. Reams"
              value={form.customUom}
              onChange={handleChange}
              requiredMark
              error={errors.customUom}
            />
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
              value={form.estimatedAmount}
              disabled
              placeholder="Auto-calculated"
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
