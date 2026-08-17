import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Plus, Trash2 } from "lucide-react";
import Modal from "../../../../components/Modal/modal";
import Button from "../../../../components/Button/Button";
import FormInput from "../../../../components/forms/FormInput";
import FormSelect from "../../../../components/forms/FormSelect";
import FormDatePicker from "../../../../components/forms/FormDatePicker";
import useApLookups from "../../hooks/useApLookups";
import VendorPicker from "../../vendor/components/VendorPicker";
import { useSaveOcrReviewMutation } from "../hooks/useReviewQueue";
import { getApiErrorMessage } from "../../utils/apiError";
import { INVOICE_TYPE_OPTIONS } from "../../constants/invoiceTypes";

const emptyLine = () => ({ description: "", quantity: "", unit_price: "", line_amount: "", tax_amount: "" });

function toNumberOrNull(value) {
  if (value === "" || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * Correction form for one OCR review-queue item — Path A (already has an invoice_id, status
 * OCR_REVIEW_PENDING) or Path B (extracted, no vendor match, invoice_id still null). Both save
 * through the same endpoint, keyed by inbound_document_id, not invoice_id.
 *
 * There's no "get full extracted fields" endpoint to pre-populate this form from — the review
 * queue row only carries a summary (file name, tentative invoice number/amount/confidence), so
 * the reviewer works from the source document (View Document) plus whatever the row already
 * shows, rather than a fully pre-filled form.
 */
export default function OcrReviewModal({ item, isOpen, onClose, onViewDocument }) {
  const { currencyOptions, paymentTermOptions } = useApLookups();
  const saveReview = useSaveOcrReviewMutation();

  const [vendorId, setVendorId] = useState(null);
  const [vendorLabel, setVendorLabel] = useState("");
  const [form, setForm] = useState({});
  const [lines, setLines] = useState([emptyLine()]);

  useEffect(() => {
    if (!item) return;
    setVendorId(item.vendor_id ?? null);
    setVendorLabel("");
    setForm({
      invoice_number: item.invoice_number || "",
      invoice_type: "",
      invoice_date: "",
      due_date: "",
      currency_id: "",
      gross_amount: item.net_amount ?? "",
      discount_amount: "",
      tax_amount: "",
      net_amount: item.net_amount ?? "",
      po_id: "",
      payment_term_id: "",
    });
    setLines([emptyLine()]);
  }, [item]);

  if (!item) return null;

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  const handleLineChange = (index, e) => {
    const { name, value } = e.target;
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, [name]: value } : line)));
  };
  const addLine = () => setLines((prev) => [...prev, emptyLine()]);
  const removeLine = (index) => setLines((prev) => prev.filter((_, i) => i !== index));

  const handleSave = () => {
    if (!vendorId) {
      toast.warning("Select a vendor before saving.");
      return;
    }

    const payload = {
      vendor_id: Number(vendorId),
      invoice_number: form.invoice_number || null,
      invoice_type: form.invoice_type || null,
      invoice_date: form.invoice_date || null,
      due_date: form.due_date || null,
      currency_id: toNumberOrNull(form.currency_id),
      gross_amount: toNumberOrNull(form.gross_amount),
      discount_amount: toNumberOrNull(form.discount_amount),
      tax_amount: toNumberOrNull(form.tax_amount),
      net_amount: toNumberOrNull(form.net_amount),
      po_id: toNumberOrNull(form.po_id),
      payment_term_id: toNumberOrNull(form.payment_term_id),
      lines: lines
        .filter((line) => line.description.trim())
        .map((line, index) => ({
          line_number: index + 1,
          description: line.description,
          quantity: toNumberOrNull(line.quantity),
          unit_price: toNumberOrNull(line.unit_price),
          line_amount: toNumberOrNull(line.line_amount),
          tax_amount: toNumberOrNull(line.tax_amount),
        })),
    };

    saveReview.mutate(
      { inboundDocumentId: item.inbound_document_id, payload },
      {
        onSuccess: () => {
          toast.success("OCR review saved.");
          onClose();
        },
        onError: (error) => toast.error(getApiErrorMessage(error, "Could not save OCR review.")),
      },
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Review OCR extraction"
      subtitle={item.file_name || `Inbound document #${item.inbound_document_id}`}
      size="3xl"
      footer={
        <div className="flex items-center justify-between gap-2">
          <Button variant="outline" onClick={() => onViewDocument(item.inbound_document_id)}>
            View source document
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave} loading={saveReview.isPending}>
              Save review
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          The backend doesn't expose the full extracted field set for re-review — only the summary
          shown in the queue row. Verify against the source document before saving.
        </p>

        <VendorPicker vendorId={vendorId} vendorLabel={vendorLabel} onSelect={(id, label) => { setVendorId(id); setVendorLabel(label); }} />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormInput label="Invoice Number" name="invoice_number" value={form.invoice_number || ""} onChange={handleChange} />
          <FormSelect
            label="Invoice Type"
            name="invoice_type"
            options={[{ value: "", label: "Select type" }, ...INVOICE_TYPE_OPTIONS]}
            value={form.invoice_type || ""}
            onChange={handleChange}
          />
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
    </Modal>
  );
}
