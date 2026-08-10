import { useState } from "react";
import { toast } from "react-toastify";
import { PageCard, PageCardContent } from "../../../../components/Cards/PageCard";
import FormInput from "../../../../components/forms/FormInput";
import FormDatePicker from "../../../../components/forms/FormDatePicker";
import Button from "../../../../components/Button/Button";
import { useSaveOcrCorrectionsMutation, useResubmitOcrMutation } from "../hooks/useInvoiceMutations";
import { getApiErrorMessage } from "../../utils/apiError";
import { INVOICE_STATUS } from "../../constants/invoiceStatus";

const LOW_CONFIDENCE_THRESHOLD = 0.75;

/**
 * True for a field that needs a manual look — either the whole extraction was low-confidence,
 * or this specific field came back empty. Only flags the field itself, not the whole invoice.
 */
function isLowConfidenceField(fieldValue, overallConfidence) {
  if (fieldValue === "" || fieldValue === null || fieldValue === undefined) return true;
  return overallConfidence < LOW_CONFIDENCE_THRESHOLD;
}

const highlightClass = "border-amber-300 bg-amber-50 focus:border-amber-500 focus:ring-amber-500/20";

/**
 * Shown on InvoiceDetailPage. In its interactive mode (status is OCR Review Pending / OCR
 * Failed — see PART R "keep the OCR implementation modular") the AP Executive can edit and save
 * corrected fields; no OCR/AI API is invented here, fields are saved through the same
 * invoiceService mock every other mutation uses. In `readOnly` mode (every other status) it's a
 * compact, non-editable OCR/AI information summary, always visible per the detail page spec.
 * Low-confidence fields get a subtle highlight — only the fields that actually need attention,
 * not the whole invoice.
 */
export default function InvoiceOcrReviewPanel({ invoice, readOnly = false }) {
  const [fields, setFields] = useState(invoice.ocrFields || {});
  const saveCorrections = useSaveOcrCorrectionsMutation();
  const resubmitOcr = useResubmitOcrMutation();

  const confidence = invoice.ocrFields?.confidenceScore || 0;
  const confidencePct = Math.round(confidence * 100);

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

  const processingStatusLabel =
    invoice.status === INVOICE_STATUS.OCR_FAILED ? "Extraction Failed" : confidencePct >= 90 ? "Extraction Complete" : "Needs Review";

  if (readOnly) {
    const readOnlyFields = [
      { label: "Invoice Number", value: invoice.ocrFields?.invoiceNumber },
      { label: "Amount", value: invoice.ocrFields?.amount ? `₹${invoice.ocrFields.amount}` : "" },
      { label: "Invoice Date", value: invoice.ocrFields?.invoiceDate },
      { label: "Due Date", value: invoice.ocrFields?.dueDate },
    ];
    return (
      <PageCard>
        <PageCardContent>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700">OCR / AI Information</h3>
            <span className="text-xs text-gray-500">{processingStatusLabel}</span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">OCR Confidence</p>
              <p className="mt-1 text-sm font-medium text-gray-900">{confidencePct}%</p>
            </div>
            {readOnlyFields.map((field) => (
              <div key={field.label}>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{field.label}</p>
                <p className="mt-1 text-sm font-medium text-gray-900">{field.value || "—"}</p>
              </div>
            ))}
          </div>
        </PageCardContent>
      </PageCard>
    );
  }

  return (
    <PageCard>
      <PageCardContent>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700">OCR Extracted Fields</h3>
          <span className="text-xs text-gray-500">Confidence: {confidencePct}%</span>
        </div>
        <p className="mb-3 text-xs text-gray-500">Fields highlighted below have low extraction confidence — please verify before saving.</p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FormInput
            label="Invoice Number"
            name="invoiceNumber"
            value={fields.invoiceNumber || ""}
            onChange={handleChange}
            inputClassName={isLowConfidenceField(fields.invoiceNumber, confidence) ? highlightClass : ""}
          />
          <FormInput
            label="Amount"
            name="amount"
            type="number"
            value={fields.amount ?? ""}
            onChange={handleChange}
            inputClassName={isLowConfidenceField(fields.amount, confidence) ? highlightClass : ""}
          />
          <FormDatePicker label="Invoice Date" name="invoiceDate" value={fields.invoiceDate || ""} onChange={handleChange} />
          <FormDatePicker label="Due Date" name="dueDate" value={fields.dueDate || ""} onChange={handleChange} />
          <FormInput
            label="Tax Amount"
            name="taxAmount"
            type="number"
            value={fields.taxAmount ?? ""}
            onChange={handleChange}
            inputClassName={isLowConfidenceField(fields.taxAmount, confidence) ? highlightClass : ""}
          />
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
