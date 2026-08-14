import { Plus, Trash2 } from "lucide-react";
import FormInput from "../../../../components/forms/FormInput";
import FormSelect from "../../../../components/forms/FormSelect";
import FormDatePicker from "../../../../components/forms/FormDatePicker";
import Button from "../../../../components/Button/Button";
import { Fonts } from "../../../../components/Fonts/Fonts";
import { formatCurrency } from "../../utils/formatters";

const todayIso = () => new Date().toISOString().slice(0, 10);

export const DEFAULT_PO_FORM = {
  po_number: "",
  po_date: todayIso(),
  expected_delivery_date: "",
  currency_id: "",
};

export const DEFAULT_PO_LINE = {
  item_code: "",
  description: "",
  quantity: "1",
  unit_price: "",
  tax_amount: "0",
  line_amount: "0",
};

/**
 * Add PO form: vendor is read-only (auto-populated from the selected vendor),
 * line items support add/remove, and line_amount/subtotal/tax/total are
 * derived from quantity × unit price + tax rather than re-entered by hand.
 */
const VendorPoForm = ({
  vendorName,
  formData,
  errors = {},
  onChange,
  currencyOptions = [],
  lines,
  lineErrors = [],
  onLineChange,
  onAddLine,
  onRemoveLine,
  totals,
  currencySymbol = "₹",
}) => {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FormInput label="Vendor" name="vendor_name" value={vendorName} disabled />
        <FormInput
          label="PO Number"
          name="po_number"
          value={formData.po_number}
          onChange={onChange}
          error={errors.po_number}
          requiredMark
        />
        <FormDatePicker label="PO Date" name="po_date" value={formData.po_date} onChange={onChange} />
        <FormDatePicker
          label="Expected Delivery"
          name="expected_delivery_date"
          value={formData.expected_delivery_date}
          onChange={onChange}
          min={formData.po_date || undefined}
        />
        <FormSelect
          label="Currency"
          name="currency_id"
          options={currencyOptions}
          value={formData.currency_id}
          onChange={onChange}
          placeholder="Select currency"
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
              <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
                <FormInput
                  label="Item Code"
                  name="item_code"
                  value={line.item_code}
                  onChange={(e) => onLineChange(index, "item_code", e.target.value)}
                  className="md:col-span-1"
                />
                <FormInput
                  label="Description"
                  name="description"
                  value={line.description}
                  onChange={(e) => onLineChange(index, "description", e.target.value)}
                  error={lineErrors[index]?.description}
                  requiredMark
                  className="md:col-span-2"
                />
                <FormInput
                  label="Quantity"
                  name="quantity"
                  type="number"
                  min="0"
                  step="any"
                  value={line.quantity}
                  onChange={(e) => onLineChange(index, "quantity", e.target.value)}
                  error={lineErrors[index]?.quantity}
                />
                <FormInput
                  label="Unit Price"
                  name="unit_price"
                  type="number"
                  min="0"
                  step="any"
                  value={line.unit_price}
                  onChange={(e) => onLineChange(index, "unit_price", e.target.value)}
                  error={lineErrors[index]?.unit_price}
                />
                <FormInput
                  label="Tax Amount"
                  name="tax_amount"
                  type="number"
                  min="0"
                  step="any"
                  value={line.tax_amount}
                  onChange={(e) => onLineChange(index, "tax_amount", e.target.value)}
                  error={lineErrors[index]?.tax_amount}
                />
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  Line Amount: {formatCurrency(Number(line.line_amount) || 0, currencySymbol)}
                </span>
                {lines.length > 1 && (
                  <Button size="small" variant="outline" onClick={() => onRemoveLine(index)}>
                    <Trash2 className="h-3.5 w-3.5" /> Remove
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col items-end gap-1 border-t border-gray-100 pt-3 text-sm">
        <div className="flex w-48 justify-between">
          <span className="text-gray-500">Subtotal</span>
          <span className="font-medium text-gray-800">{formatCurrency(totals.subtotal, currencySymbol)}</span>
        </div>
        <div className="flex w-48 justify-between">
          <span className="text-gray-500">Tax</span>
          <span className="font-medium text-gray-800">{formatCurrency(totals.taxAmount, currencySymbol)}</span>
        </div>
        <div className="flex w-48 justify-between">
          <span className="text-gray-500">Total</span>
          <span className="font-semibold text-gray-900">{formatCurrency(totals.totalAmount, currencySymbol)}</span>
        </div>
      </div>
    </div>
  );
};

export default VendorPoForm;
