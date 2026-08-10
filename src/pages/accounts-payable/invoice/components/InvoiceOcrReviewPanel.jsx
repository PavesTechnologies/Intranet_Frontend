import { useState } from "react";
import { toast } from "react-toastify";
import { PageCard, PageCardContent } from "../../../../components/Cards/PageCard";
import FormInput from "../../../../components/forms/FormInput";
import FormDatePicker from "../../../../components/forms/FormDatePicker";
import Button from "../../../../components/Button/Button";
import { useSaveOcrCorrectionsMutation, useResubmitOcrMutation } from "../hooks/useInvoiceMutations";
import { getApiErrorMessage } from "../../utils/apiError";

/**
 * Shown on InvoiceDetailPage when the invoice's status is in the OCR Review queue
 * (OCR Review Pending / OCR Failed). Kept as its own component per PART R ("keep the OCR
 * implementation modular") — no OCR/AI API is invented here, fields are edited and saved
 * through the same invoiceService mock every other mutation uses.
 */
export default function InvoiceOcrReviewPanel({ invoice }) {
  const [fields, setFields] = useState(invoice.ocrFields || {});
  const saveCorrections = useSaveOcrCorrectionsMutation();
  const resubmitOcr = useResubmitOcrMutation();

  const handleChange = (e) => setFields((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSave = () => {
    saveCorrections.mutate(
      { invoiceId: invoice.id, ocrFields: fields },
      {
        onSuccess: () => toast.success("OCR corrections saved — invoice moved to Validation."),
        onError: (error) => toast.error(getApiErrorMessage(error, "Could not save OCR corrections.")),
      }
    );
  };

  const handleResubmit = () => {
    resubmitOcr.mutate(
      { invoiceId: invoice.id },
      {
        onSuccess: () => toast.success("Invoice re-queued for OCR processing."),
        onError: (error) => toast.error(getApiErrorMessage(error, "Could not resubmit for OCR.")),
      }
    );
  };

  return (
    <PageCard>
      <PageCardContent>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700">OCR Extracted Fields</h3>
          <span className="text-xs text-gray-500">
            Confidence: {Math.round((invoice.ocrFields?.confidenceScore || 0) * 100)}%
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FormInput label="Invoice Number" name="invoiceNumber" value={fields.invoiceNumber || ""} onChange={handleChange} />
          <FormInput label="Amount" name="amount" type="number" value={fields.amount ?? ""} onChange={handleChange} />
          <FormDatePicker label="Invoice Date" name="invoiceDate" value={fields.invoiceDate || ""} onChange={handleChange} />
          <FormDatePicker label="Due Date" name="dueDate" value={fields.dueDate || ""} onChange={handleChange} />
          <FormInput label="Tax Amount" name="taxAmount" type="number" value={fields.taxAmount ?? ""} onChange={handleChange} />
        </div>

        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <Button variant="outline" onClick={handleResubmit} loading={resubmitOcr.isPending}>
            Resubmit for OCR
          </Button>
          <Button variant="primary" onClick={handleSave} loading={saveCorrections.isPending}>
            Save &amp; Submit for Validation
          </Button>
        </div>
      </PageCardContent>
    </PageCard>
  );
}
