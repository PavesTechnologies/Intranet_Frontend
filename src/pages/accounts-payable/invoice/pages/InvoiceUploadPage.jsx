import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { UploadCloud, FileText, X, CheckCircle2, Loader2 } from "lucide-react";
import PageHeader from "../../../../components/ui/PageHeader";
import Button from "../../../../components/Button/Button";
import { PageCard, PageCardContent } from "../../../../components/Cards/PageCard";
import { useUploadInvoiceMutation } from "../hooks/useInvoiceMutations";
import { invoiceService } from "../services/invoiceService";
import { INVOICE_DETAIL_KEY } from "../hooks/useInvoiceDetail";
import { AP_ROUTES } from "../../constants/routes";
import { getApiErrorMessage } from "../../utils/apiError";

const ACCEPTED_MIME_TYPES = ["application/pdf", "image/png", "image/jpeg"];
const ACCEPTED_EXTENSIONS = [".pdf", ".png", ".jpg", ".jpeg"];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

const PROCESSING_STEPS = [
  { key: "uploading", label: "Uploading & processing document" },
  { key: "confirming", label: "Confirming invoice record" },
];

function getExtension(fileName) {
  const index = fileName.lastIndexOf(".");
  return index === -1 ? "" : fileName.slice(index).toLowerCase();
}

function validateFile(file) {
  const extension = getExtension(file.name);
  if (!ACCEPTED_MIME_TYPES.includes(file.type) && !ACCEPTED_EXTENSIONS.includes(extension)) {
    return "Unsupported file type. Please upload a PDF, PNG, JPG, or JPEG file.";
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return "File is too large. Maximum size is 10MB.";
  }
  return "";
}

function formatFileSize(bytes) {
  if (!bytes) return "0 KB";
  const kb = bytes / 1024;
  return kb < 1024 ? `${kb.toFixed(1)} KB` : `${(kb / 1024).toFixed(2)} MB`;
}

/** Route: /accounts-payable/invoices/upload */
export default function InvoiceUploadPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const inputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [validationError, setValidationError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [processingStep, setProcessingStep] = useState(null); // null | "uploading" | "ocr" | "validating"
  const uploadInvoice = useUploadInvoiceMutation();

  const handleFileSelected = (file) => {
    if (!file) return;

    const isDuplicate =
      selectedFile &&
      selectedFile.name === file.name &&
      selectedFile.size === file.size &&
      selectedFile.lastModified === file.lastModified;
    if (isDuplicate) {
      toast.info("This file is already selected.");
      return;
    }

    const error = validateFile(file);
    setValidationError(error);
    setSelectedFile(error ? null : file);
  };

  const handleInputChange = (e) => {
    handleFileSelected(e.target.files?.[0]);
    e.target.value = ""; // allows re-selecting the same file after Cancel
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelected(e.dataTransfer.files?.[0]);
  };

  const handleCancel = () => {
    setSelectedFile(null);
    setValidationError("");
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setValidationError("Please select a file to upload.");
      return;
    }

    try {
      setProcessingStep("uploading");

      const result = await uploadInvoice.mutateAsync(selectedFile);

      const invoiceNumber = result?.extracted_invoice?.invoice_number || "Invoice";
      const status = result?.invoice_status;

      if (status === "OCR_FAILED") {
        toast.error(`${invoiceNumber} — OCR extraction failed.`);
      } else if (status === "OCR_REVIEW_PENDING") {
        toast.info(`${invoiceNumber} requires OCR review.`);
      } else {
        toast.success(`${invoiceNumber} processed successfully.`);
      }

      if (result?.invoice_id) {
        // Confirm the invoice record is actually retrievable (and warm the detail page's
        // cache) before navigating, instead of trusting the upload response alone.
        setProcessingStep("confirming");
        try {
          await queryClient.fetchQuery({
            queryKey: INVOICE_DETAIL_KEY(result.invoice_id),
            queryFn: () => invoiceService.getInvoice(result.invoice_id),
          });
          navigate(AP_ROUTES.INVOICE_DETAIL(result.invoice_id));
        } catch {
          toast.info("Invoice uploaded — it will appear in Invoice Management once processing finishes.");
          navigate(AP_ROUTES.INVOICE_LIST);
        }
      } else if (result?.inbound_document_id) {
        // No invoice record yet (still OCR-only) — send the user to the OCR Review queue
        // rather than a detail route that doesn't accept an inbound document id.
        navigate(AP_ROUTES.INVOICE_OCR_REVIEW);
      } else {
        navigate(AP_ROUTES.INVOICE_LIST);
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Invoice processing failed. Please try again."));
    } finally {
      setProcessingStep(null);
    }
  };

  return (
    <div className="p-6">
      <PageHeader title="Upload Invoice" subtitle="Upload a vendor invoice document for OCR processing" />

      <PageCard className="mx-auto max-w-2xl">
        <PageCardContent>
          {processingStep ? (
            <div className="py-6">
              <p className="mb-4 text-center text-sm font-medium text-gray-700">Processing {selectedFile?.name}</p>
              <ul className="mx-auto max-w-xs space-y-3">
                {PROCESSING_STEPS.map((step, index) => {
                  const currentIndex = PROCESSING_STEPS.findIndex((s) => s.key === processingStep);
                  const isDone = index < currentIndex;
                  const isCurrent = index === currentIndex;
                  return (
                    <li key={step.key} className="flex items-center gap-3">
                      {isDone ? (
                        <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
                      ) : isCurrent ? (
                        <Loader2 className="h-5 w-5 shrink-0 animate-spin text-[#0A0082]" />
                      ) : (
                        <span className="h-5 w-5 shrink-0 rounded-full border-2 border-gray-200" />
                      )}
                      <span className={`text-sm ${isCurrent ? "font-medium text-gray-900" : isDone ? "text-gray-500" : "text-gray-400"}`}>
                        {step.label}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : (
            <>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
                role="button"
                tabIndex={0}
                className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-10 text-center transition-colors ${
                  isDragging ? "border-[#0A0082] bg-[#0A0082]/5" : "border-gray-300 hover:border-gray-400"
                }`}
              >
                <UploadCloud className="h-10 w-10 text-gray-400" />
                <p className="text-sm font-medium text-gray-700">Drag &amp; drop your invoice here, or click to browse</p>
                <p className="text-xs text-gray-500">Supported: PDF, PNG, JPG, JPEG · Max 10MB</p>
                <input
                  ref={inputRef}
                  type="file"
                  accept={ACCEPTED_EXTENSIONS.join(",")}
                  className="hidden"
                  onChange={handleInputChange}
                />
              </div>

              {validationError && <p className="mt-2 text-sm text-red-600">{validationError}</p>}

              {selectedFile && !validationError && (
                <div className="mt-4 flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <FileText className="h-5 w-5 shrink-0 text-[#0A0082]" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-800">{selectedFile.name}</p>
                      <p className="text-xs text-gray-500">{formatFileSize(selectedFile.size)}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="shrink-0 text-gray-400 hover:text-gray-600"
                    aria-label="Remove selected file"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              <div className="mt-6 flex justify-end gap-2">
                <Button variant="outline" onClick={handleCancel} disabled={!selectedFile}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleUpload}
                  disabled={!selectedFile || Boolean(validationError)}
                >
                  Upload Invoice
                </Button>
              </div>
            </>
          )}
        </PageCardContent>
      </PageCard>
    </div>
  );
}
