import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  RefreshCw,
  Sparkles,
} from "lucide-react";

import Modal from "../../../../components/Modal/modal";
import Button from "../../../../components/Button/Button";
import FormInput from "../../../../components/forms/FormInput";
import FormSelect from "../../../../components/forms/FormSelect";
import FileUpload from "../../../../components/forms/FileUpload";

import { getApiErrorMessage } from "../../utils/apiError";

import { useCreateQuotation, useExtractQuotationFields } from "../hooks/useQuotationMutations";
import useVendorOptions from "../hooks/useVendorOptions";
import { buildQuotationFormPatch } from "../utils/quotationExtraction";

import QuotationDocumentPreview from "./QuotationDocumentPreview";

const emptyForm = () => ({
  vendorId: "",
  quotationNumber: "",
  quotationDate: "",
  validUntil: "",
  totalAmount: "",
  deliveryDays: "",
  paymentTerms: "",
});

const ExtractedBadge = () => (
  <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-blue-600">
    <Sparkles className="h-3 w-3" aria-hidden="true" />
    Auto-filled from document
  </span>
);

/**
 * Records a quotation for a requisition.
 *
 * When rfqId is supplied, the quotation is associated with
 * the RFQ and the RFQ detail/quotation queries are refreshed
 * after successful creation.
 *
 * Selecting a quotation document immediately runs AWS Textract-based extraction
 * (see procurementService.extractQuotationFields) and auto-fills whatever fields the
 * backend could confidently read. Every extracted value stays editable — the PR Officer
 * must review it (optionally against the document, via "View Document") before submitting
 * through the existing createQuotation flow, which is unaffected by extraction.
 */
export default function QuotationFormModal({
  isOpen,
  onClose,
  prId,
  rfqId,
  invitedVendorIds = [],
}) {
  const [form, setForm] = useState(emptyForm());
  const [file, setFile] = useState(null);
  const [errors, setErrors] = useState({});

  // Extraction is intentionally tracked separately from form submission state (createQuotation
  // below) — a failed/slow extraction must never block manual entry or final submission.
  const [extractionError, setExtractionError] = useState(null);
  const [extractionCompleted, setExtractionCompleted] = useState(false);
  const [extractedFieldKeys, setExtractedFieldKeys] = useState(() => new Set());
  const [pendingVendorId, setPendingVendorId] = useState(null);
  const [showDocumentPreview, setShowDocumentPreview] = useState(false);

  const normalizedRfqId = String(
    rfqId ?? ""
  ).trim();

  const {
    vendorOptions: allVendorOptions,
    isLoading: vendorsLoading,
  } = useVendorOptions();

  const invitedIds = new Set(
    invitedVendorIds.map((id) => Number(id))
  );

  const vendorOptions = normalizedRfqId
    ? allVendorOptions.filter((option) =>
        invitedIds.has(Number(option.value))
      )
    : allVendorOptions;

  const createQuotation =
    useCreateQuotation(prId);

  const extractQuotation = useExtractQuotationFields();
  const isExtracting = extractQuotation.isPending;

  // Once the vendor list (re)loads, try to select the vendor the last extraction returned.
  // Consumed exactly once per extraction run, whether or not a match is found — per spec,
  // a failed match leaves the vendor unselected rather than retrying indefinitely.
  // Select the Vendor Master record returned by backend extraction.
// Wait until the vendor options are loaded before consuming the
// pending vendor ID.
useEffect(() => {
  if (pendingVendorId === null || vendorsLoading) {
    return;
  }

  const match = vendorOptions.find(
    (option) => Number(option.value) === Number(pendingVendorId)
  );

  if (!match) {
    // No matching vendor exists in the currently available options.
    // Leave the dropdown unselected so the user can choose manually.
    setPendingVendorId(null);
    return;
  }

  setForm((previous) => ({
    ...previous,
    vendorId: match.value,
  }));

  setExtractedFieldKeys((previous) => {
    const next = new Set(previous);
    next.add("vendorId");
    return next;
  });

  setPendingVendorId(null);
}, [pendingVendorId, vendorsLoading, vendorOptions]);

  const markExtracted = (key) => extractedFieldKeys.has(key);

  const clearExtractedMark = (key) => {
    if (!extractedFieldKeys.has(key)) {
      return;
    }

    setExtractedFieldKeys((previous) => {
      const next = new Set(previous);
      next.delete(key);
      return next;
    });
  };

  const handleChange = (event) => {
    const {
      name,
      value,
    } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    // The field no longer reflects the extracted value verbatim once edited by hand.
    clearExtractedMark(name);

    if (errors[name]) {
      setErrors((previous) => ({
        ...previous,
        [name]: "",
      }));
    }
  };

  const runExtraction = async (selectedFile) => {
    if (!selectedFile || extractQuotation.isPending) {
      return;
    }

    setExtractionError(null);
    setExtractionCompleted(false);

    try {
      const response = await extractQuotation.mutateAsync(selectedFile);
      const data = response?.data || {};

      const patch = buildQuotationFormPatch(data);

      setForm((previous) => ({
        ...previous,
        ...patch,
      }));

      setExtractedFieldKeys(new Set(Object.keys(patch)));

      if (data.vendor_id !== undefined && data.vendor_id !== null) {
        setPendingVendorId(data.vendor_id);
      }

      setExtractionCompleted(true);
    } catch (err) {
      setExtractionError(
        getApiErrorMessage(
          err,
          "Could not extract quotation details. You can still enter them manually."
        )
      );
    }
  };

  const handleFileChange = (event) => {
    const nextFile = event.target.files?.[0] || null;

    setFile(nextFile);
    setShowDocumentPreview(false);
    setExtractionError(null);
    setExtractionCompleted(false);
    setExtractedFieldKeys(new Set());
    setPendingVendorId(null);

    if (errors.file) {
      setErrors((previous) => ({
        ...previous,
        file: "",
      }));
    }

    if (nextFile) {
      runExtraction(nextFile);
    }
  };

  const validate = () => {
    const nextErrors = {};

    if (!form.vendorId) {
      nextErrors.vendorId =
        "Vendor is required.";
    }

    if (!file) {
      nextErrors.file =
        "A quotation document is required.";
    }

    if (
      form.totalAmount !== "" &&
      Number(form.totalAmount) < 0
    ) {
      nextErrors.totalAmount =
        "Cannot be negative.";
    }

    if (
      form.deliveryDays !== "" &&
      Number(form.deliveryDays) < 0
    ) {
      nextErrors.deliveryDays =
        "Cannot be negative.";
    }

    setErrors(nextErrors);

    return (
      Object.keys(nextErrors).length === 0
    );
  };

  const handleClose = () => {
    setForm(emptyForm());
    setFile(null);
    setErrors({});
    setExtractionError(null);
    setExtractionCompleted(false);
    setExtractedFieldKeys(new Set());
    setPendingVendorId(null);
    setShowDocumentPreview(false);
    onClose();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validate()) {
      return;
    }

    try {
      await createQuotation.mutateAsync({
        vendorId: Number(form.vendorId),

        quotationNumber:
          form.quotationNumber.trim() ||
          undefined,

        quotationDate:
          form.quotationDate || undefined,

        validUntil:
          form.validUntil || undefined,

        totalAmount:
          form.totalAmount !== ""
            ? form.totalAmount
            : undefined,

        /*
         * Critical:
         * Keep rfqId in the mutation variables so
         * useCreateQuotation can refresh the RFQ
         * detail and quotation queries.
         */
        rfqId:
          normalizedRfqId || undefined,

        deliveryDays:
          form.deliveryDays !== ""
            ? form.deliveryDays
            : undefined,

        paymentTerms:
          form.paymentTerms.trim() ||
          undefined,

        file,
      });

      toast.success(
        "Quotation added."
      );

      handleClose();
    } catch (err) {
      toast.error(
        getApiErrorMessage(
          err,
          "Failed to add the quotation."
        )
      );
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Add Quotation"
      subtitle="Upload a vendor quotation document for this requisition."
      size={showDocumentPreview ? "6xl" : "lg"}
      closeOnBackdrop={false}
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>

          <Button
            type="submit"
            form="quotation-form"
            variant="primary"
            className="w-full sm:w-auto"
            disabled={isExtracting}
            loading={createQuotation.isPending}
            loadingText="Uploading..."
          >
            Add Quotation
          </Button>
        </div>
      }
    >
      <div
        className={`flex flex-col gap-4 ${
          showDocumentPreview ? "lg:flex-row lg:items-stretch" : ""
        }`}
      >
        <form
          id="quotation-form"
          onSubmit={handleSubmit}
          className={`space-y-4 py-2 ${
            showDocumentPreview
              ? "lg:max-h-[65vh] lg:w-[420px] lg:shrink-0 lg:overflow-y-auto lg:pr-2"
              : ""
          }`}
        >
          <div>
            <FileUpload
              label="Quotation Document"
              name="file"
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={handleFileChange}
              required
              disabled={isExtracting}
            />

            {errors.file && (
              <p className="mt-1 text-xs text-red-600">
                {errors.file}
              </p>
            )}

            {file && (
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <p className="min-w-0 truncate text-xs text-gray-500" title={file.name}>
                  {file.name}
                </p>

                <Button
                  type="button"
                  variant="outline"
                  size="small"
                  onClick={() => setShowDocumentPreview((previous) => !previous)}
                >
                  {showDocumentPreview ? (
                    <>
                      <EyeOff className="h-3.5 w-3.5" /> Hide Document
                    </>
                  ) : (
                    <>
                      <Eye className="h-3.5 w-3.5" /> View Document
                    </>
                  )}
                </Button>
              </div>
            )}

            {isExtracting && (
              <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-blue-600">
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                Extracting details from document...
              </p>
            )}

            {extractionError && (
              <div className="mt-2 flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <div className="flex-1">
                  <p>{extractionError}</p>
                  <button
                    type="button"
                    onClick={() => runExtraction(file)}
                    className="mt-1 inline-flex items-center gap-1 font-semibold text-red-800 hover:underline"
                  >
                    <RefreshCw className="h-3 w-3" aria-hidden="true" />
                    Retry extraction
                  </button>
                </div>
              </div>
            )}

            {extractionCompleted && !extractionError && (
              <div className="mt-2 flex items-start gap-2 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <p>
                  Fields were extracted using AWS Textract. Please review and verify each
                  value against the document before submitting.
                </p>
              </div>
            )}
          </div>

          <div>
            <FormSelect
              label="Vendor"
              name="vendorId"
              value={form.vendorId}
              onChange={handleChange}
              options={[
                {
                  value: "",
                  label: vendorsLoading
                    ? "Loading vendors..."
                    : "Select vendor",
                },
                ...vendorOptions,
              ]}
              requiredMark
              error={errors.vendorId}
            />
            {markExtracted("vendorId") && <ExtractedBadge />}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <FormInput
                label="Quotation Number"
                name="quotationNumber"
                value={form.quotationNumber}
                onChange={handleChange}
              />
              {markExtracted("quotationNumber") && <ExtractedBadge />}
            </div>

            <div>
              <FormInput
                label="Total Amount"
                name="totalAmount"
                type="number"
                min="0"
                step="0.01"
                value={form.totalAmount}
                onChange={handleChange}
                error={errors.totalAmount}
              />
              {markExtracted("totalAmount") && <ExtractedBadge />}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <FormInput
                label="Quotation Date"
                name="quotationDate"
                type="date"
                value={form.quotationDate}
                onChange={handleChange}
              />
              {markExtracted("quotationDate") && <ExtractedBadge />}
            </div>

            <div>
              <FormInput
                label="Valid Until"
                name="validUntil"
                type="date"
                value={form.validUntil}
                onChange={handleChange}
              />
              {markExtracted("validUntil") && <ExtractedBadge />}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <FormInput
                label="Delivery Days"
                name="deliveryDays"
                type="number"
                min="0"
                step="1"
                value={form.deliveryDays}
                onChange={handleChange}
                error={errors.deliveryDays}
              />
              {markExtracted("deliveryDays") && <ExtractedBadge />}
            </div>

            <div>
              <FormInput
                label="Payment Terms"
                name="paymentTerms"
                placeholder="e.g. Net 30"
                value={form.paymentTerms}
                onChange={handleChange}
              />
              {markExtracted("paymentTerms") && <ExtractedBadge />}
            </div>
          </div>
        </form>

        {showDocumentPreview && (
          <div className="flex lg:max-h-[65vh] lg:flex-1">
            <QuotationDocumentPreview
              file={file}
              onClose={() => setShowDocumentPreview(false)}
            />
          </div>
        )}
      </div>
    </Modal>
  );
}
