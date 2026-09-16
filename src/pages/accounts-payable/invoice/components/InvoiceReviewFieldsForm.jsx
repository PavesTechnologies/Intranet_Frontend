import { Plus, Trash2 } from "lucide-react";
import Button from "../../../../components/Button/Button";
import FormInput from "../../../../components/forms/FormInput";
import FormSelect from "../../../../components/forms/FormSelect";
import FormDatePicker from "../../../../components/forms/FormDatePicker";
import VendorPicker from "../../vendor/components/VendorPicker";
import { INVOICE_TYPE_OPTIONS } from "../../constants/invoiceTypes";

/**
 * Pure presentational form for one invoice's OCR-review fields — no state, no data fetching, no
 * save logic; everything comes from useInvoiceReviewForm(). Shared by OcrReviewModal (queue-based
 * correction) and InvoiceReviewEditor (inline on the invoice detail page) so the two don't drift
 * into separate field sets.
 * @param {{ review: ReturnType<typeof import("../hooks/useInvoiceReviewForm").useInvoiceReviewForm>, vendorHint?: string }} props
 */
export default function InvoiceReviewFieldsForm({ review, vendorHint }) {
  const {
    vendorId,
    vendorLabel,
    setVendor,
    form,
    handleChange,
    lines,
    handleLineChange,
    addLine,
    removeLine,
    errors,
    isNonPo,
    departmentOptions,
    categoryOptions,
    categoryPlaceholder,
    categoriesError,
    currencyOptions,
    paymentTermOptions,
  } = review;

  return (
    <div className="space-y-5">
      <div>
        <VendorPicker vendorId={vendorId} vendorLabel={vendorLabel} onSelect={setVendor} />
        {vendorHint && !vendorId && (
          <p className="mt-1 text-xs text-gray-500">
            Currently <span className="font-medium text-gray-700">{vendorHint}</span> — leave blank to keep it, or
            select a different vendor to change it.
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormInput label="Invoice Number" name="invoice_number" value={form.invoice_number || ""} onChange={handleChange} />
        <FormSelect
          label="Invoice Type"
          name="invoice_type"
          options={[{ value: "", label: "Select type" }, ...INVOICE_TYPE_OPTIONS]}
          value={form.invoice_type || ""}
          onChange={handleChange}
        />
        {isNonPo && (
          <>
            <FormSelect
              label="Department"
              name="department_id"
              value={form.department_id || ""}
              onChange={handleChange}
              options={[{ value: "", label: "Select department" }, ...departmentOptions]}
              requiredMark
              error={errors.department_id}
            />
            <div>
              <FormSelect
                label="Purchase Category"
                name="purchase_category_id"
                value={form.purchase_category_id || ""}
                onChange={handleChange}
                options={categoryOptions}
                placeholder={categoryPlaceholder}
                requiredMark
                error={errors.purchase_category_id}
              />
              {categoriesError && <p className="mt-1 text-xs text-red-500">Unable to load purchase categories.</p>}
            </div>
          </>
        )}
        <FormDatePicker label="Invoice Date" name="invoice_date" value={form.invoice_date || ""} onChange={handleChange} />
        <FormDatePicker label="Due Date" name="due_date" value={form.due_date || ""} onChange={handleChange} />
        <FormSelect
          label="Currency"
          name="currency_id"
          options={[{ value: "", label: "None" }, ...currencyOptions]}
          value={form.currency_id || ""}
          onChange={handleChange}
        />
        <FormSelect
          label="Payment Term"
          name="payment_term_id"
          options={[{ value: "", label: "None" }, ...paymentTermOptions]}
          value={form.payment_term_id || ""}
          onChange={handleChange}
        />
        <FormInput label="PO ID (if applicable)" name="po_id" type="number" value={form.po_id || ""} onChange={handleChange} />
        <FormInput label="Gross Amount" name="gross_amount" type="number" value={form.gross_amount ?? ""} onChange={handleChange} />
        <FormInput label="Discount Amount" name="discount_amount" type="number" value={form.discount_amount ?? ""} onChange={handleChange} />
        <FormInput label="Tax Amount" name="tax_amount" type="number" value={form.tax_amount ?? ""} onChange={handleChange} />
        <FormInput label="Net Amount" name="net_amount" type="number" value={form.net_amount ?? ""} onChange={handleChange} />
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-sm font-semibold text-gray-700">Invoice Lines</h4>
          <Button variant="outline" size="small" onClick={addLine}>
            <Plus className="h-3.5 w-3.5" /> Add Line
          </Button>
        </div>
        <div className="space-y-2">
          {lines.map((line, index) => (
            <div key={index} className="grid grid-cols-1 gap-2 rounded-lg border border-gray-200 p-3 sm:grid-cols-6">
              <FormInput
                className="sm:col-span-2"
                label="Description"
                name="description"
                value={line.description}
                onChange={(e) => handleLineChange(index, e)}
              />
              <FormInput label="Quantity" name="quantity" type="number" value={line.quantity} onChange={(e) => handleLineChange(index, e)} />
              <FormInput label="Unit Price" name="unit_price" type="number" value={line.unit_price} onChange={(e) => handleLineChange(index, e)} />
              <FormInput label="Line Amount" name="line_amount" type="number" value={line.line_amount} onChange={(e) => handleLineChange(index, e)} />
              <div className="flex items-end justify-between gap-2">
                <FormInput
                  className="flex-1"
                  label="Tax Amount"
                  name="tax_amount"
                  type="number"
                  value={line.tax_amount}
                  onChange={(e) => handleLineChange(index, e)}
                />
                {lines.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeLine(index)}
                    className="mb-2 shrink-0 rounded-lg border border-gray-300 p-2 text-gray-500 hover:bg-gray-50 hover:text-red-600"
                    aria-label="Remove line"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
