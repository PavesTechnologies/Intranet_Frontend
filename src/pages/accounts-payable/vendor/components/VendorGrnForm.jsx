import { Plus, Trash2 } from "lucide-react";
import FormInput from "../../../../components/forms/FormInput";
import FormSelect from "../../../../components/forms/FormSelect";
import FormDatePicker from "../../../../components/forms/FormDatePicker";
import Button from "../../../../components/Button/Button";
import { Fonts } from "../../../../components/Fonts/Fonts";

const todayIso = () => new Date().toISOString().slice(0, 10);

export const NO_PO_VALUE = "";

export const DEFAULT_GRN_FORM = {
  grn_number: "",
  po_id: NO_PO_VALUE,
  receipt_date: todayIso(),
};

export const DEFAULT_GRN_LINE = {
  po_line_id: "",
  item_code: "",
  description: "",
  received_quantity: "1",
};

/**
 * Add GRN form: vendor is read-only. PO is optional — the backend supports
 * po_id = null for direct (non-PO) receipts. When a PO is selected, each
 * line's "PO Line" selector is scoped to that PO's own lines only.
 */
const VendorGrnForm = ({
  vendorName,
  formData,
  errors = {},
  onChange,
  poOptions = [],
  poLineOptions = [],
  hasPo,
  lines,
  lineErrors = [],
  onLineChange,
  onAddLine,
  onRemoveLine,
}) => {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FormInput label="Vendor" name="vendor_name" value={vendorName} disabled />
        <FormInput
          label="GRN Number"
          name="grn_number"
          value={formData.grn_number}
          onChange={onChange}
          error={errors.grn_number}
        />
        <FormSelect
          label="Purchase Order"
          name="po_id"
          options={[{ value: NO_PO_VALUE, label: "No PO (direct receipt)" }, ...poOptions]}
          value={formData.po_id}
          onChange={onChange}
          placeholder="Select a purchase order"
        />
        <FormDatePicker
          label="Receipt Date"
          name="receipt_date"
          value={formData.receipt_date}
          onChange={onChange}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className={Fonts.label}>Line Items</span>
          <Button size="small" variant="outline" onClick={onAddLine}>
            <Plus className="h-3.5 w-3.5" /> Add Line
          </Button>
        </div>

        <div className="space-y-3">
          {lines.map((line, index) => (
            <div key={index} className="rounded-lg border border-gray-200 p-3">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                {hasPo && (
                  <FormSelect
                    label="PO Line"
                    name="po_line_id"
                    options={poLineOptions}
                    value={line.po_line_id}
                    onChange={(e) => onLineChange(index, "po_line_id", e.target.value)}
                    placeholder="Select a PO line"
                  />
                )}
                <FormInput
                  label="Item Code"
                  name="item_code"
                  value={line.item_code}
                  onChange={(e) => onLineChange(index, "item_code", e.target.value)}
                />
                <FormInput
                  label="Description"
                  name="description"
                  value={line.description}
                  onChange={(e) => onLineChange(index, "description", e.target.value)}
                  error={lineErrors[index]?.description}
                  requiredMark
                  className={hasPo ? "md:col-span-1" : "md:col-span-2"}
                />
                <FormInput
                  label="Received Quantity"
                  name="received_quantity"
                  type="number"
                  min="0"
                  step="any"
                  value={line.received_quantity}
                  onChange={(e) => onLineChange(index, "received_quantity", e.target.value)}
                  error={lineErrors[index]?.received_quantity}
                  requiredMark
                />
              </div>
              {lines.length > 1 && (
                <div className="mt-2 flex justify-end">
                  <Button size="small" variant="outline" onClick={() => onRemoveLine(index)}>
                    <Trash2 className="h-3.5 w-3.5" /> Remove
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default VendorGrnForm;
