import React from "react";
import { CheckCircle2, AlertTriangle, Send, X, FileText, ArrowRight } from "lucide-react";
import Modal from "../../../../components/Modal/modal";
import Button from "../../../../components/Button/Button";
import StatusBadge from "../../../../components/status/statusbadge";
import InvoiceGenerationProcessing from "./InvoiceGenerationProcessing";
import InvoicePreviewDocument from "./InvoicePreviewDocument";

/**
 * InvoiceGenerationModal
 *
 * Enterprise modal overlay hosting the controlled invoice generation transaction:
 * - State 1: "GENERATING" (compact modal, animated 4-step progress, non-dismissible)
 * - State 2: "GENERATED" (expanded document modal, authoritative official invoice document, Submit for Approval action)
 * - State 3: "ERROR" (backend error alert with Retry and Close actions)
 */
export default function InvoiceGenerationModal({
  isOpen = false,
  modalState = "GENERATING", // "GENERATING" | "GENERATED" | "ERROR"
  invoice = null,
  projectName = "",
  clientName = "",
  snapshotId = "",
  taxCalc = null,
  snapshotData = null,
  occurrence = null,
  companyProfile = null,
  generateError = "",
  submittingForApproval = false,
  isGenerationCompleted = false,
  onClose,
  onRetry,
  onSubmitForApproval,
}) {
  if (!isOpen) return null;

  const isGenerating = modalState === "GENERATING";
  const isGenerated = modalState === "GENERATED";
  const isError = modalState === "ERROR";

  const invoiceNumber = invoice?.invoiceNumber || invoice?.invoiceId || "Assigning...";
  const invoiceStatus = (invoice?.invoiceStatus || "GENERATED").toUpperCase();
  const isPendingApproval = invoiceStatus === "PENDING_APPROVAL";

  return (
    <Modal
      isOpen={isOpen}
      onClose={isGenerating ? () => {} : onClose}
      closeOnBackdrop={!isGenerating}
      showCloseButton={!isGenerating}
      size={isGenerated ? "5xl" : isGenerating ? "2xl" : "lg"}
      maxHeight={isGenerated ? "max-h-[92vh]" : "max-h-[85vh]"}
      showHeader={false}
      bodyClassName="p-0 overflow-hidden"
      overlayColor="bg-slate-900/70 backdrop-blur-xs"
      className="transition-all duration-300"
    >
      {/* ========================================================================= */}
      {/* 1. GENERATING STATE                                                       */}
      {/* ========================================================================= */}
      {isGenerating && (
        <div className="p-6 sm:p-8">
          <InvoiceGenerationProcessing
            projectName={projectName}
            clientName={clientName}
            isCompleted={isGenerationCompleted}
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. GENERATED STATE (OFFICIAL INVOICE DOCUMENT INSIDE MODAL)               */}
      {/* ========================================================================= */}
      {isGenerated && invoice && (
        <div className="flex flex-col h-full max-h-[90vh]">
          {/* Modal Header */}
          <div className="flex flex-col gap-3 border-b border-slate-200/90 bg-gradient-to-r from-emerald-50/70 via-white to-slate-50/50 p-5 sm:flex-row sm:items-center sm:justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 shadow-2xs">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900 sm:text-lg">
                    Official Invoice Created
                  </h2>
                  <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-100 border border-emerald-200 px-2.5 py-0.5 rounded-md">
                    {invoiceNumber}
                  </span>
                  <StatusBadge label={invoiceStatus === "GENERATED" ? "INVOICE GENERATED" : invoiceStatus} size="sm" />
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  The official authoritative invoice has been committed to Account Receivable. Review details or submit for approval below.
                </p>
              </div>
            </div>

            {/* Close icon button */}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 self-start sm:self-center"
              aria-label="Close modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Modal Scrollable Body: Official Invoice Document */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100/50">
            <div className="max-w-4xl mx-auto">
              <InvoicePreviewDocument
                invoice={invoice}
                snapshotId={snapshotId}
                taxCalc={taxCalc}
                snapshotData={snapshotData}
                occurrence={occurrence}
                companyProfile={companyProfile}
                isGenerating={false}
              />
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white p-4 shrink-0 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">
                {isPendingApproval
                  ? "✓ Successfully submitted for approval."
                  : "Ready for financial manager approval review."}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <Button
                variant="outline"
                size="small"
                onClick={onClose}
                className="text-xs font-semibold px-4 py-2 text-slate-700"
              >
                Close
              </Button>

              {!isPendingApproval && onSubmitForApproval && (
                <Button
                  variant="primary"
                  size="small"
                  onClick={onSubmitForApproval}
                  disabled={submittingForApproval}
                  className="bg-[#0A0082] hover:bg-[#0A0082]/90 text-white flex items-center gap-1.5 text-xs font-semibold px-5 py-2 shadow-xs"
                >
                  <Send className="h-3.5 w-3.5" />
                  {submittingForApproval ? "Submitting..." : "Submit for Approval"}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. ERROR STATE                                                            */}
      {/* ========================================================================= */}
      {isError && (
        <div className="p-6 sm:p-8 space-y-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div className="space-y-1.5 min-w-0 flex-1">
              <h3 className="text-base font-bold text-slate-900">
                Invoice Generation Failed
              </h3>
              <p className="text-xs text-slate-500">
                The backend service encountered an issue while generating the official invoice. The draft invoice remains intact.
              </p>
              {generateError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50/80 p-3 font-mono text-xs text-rose-800 break-words mt-2">
                  {generateError}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
            <Button
              variant="outline"
              size="small"
              onClick={onClose}
              className="text-xs font-semibold px-4 py-2 text-slate-700"
            >
              Close
            </Button>
            {onRetry && (
              <Button
                variant="primary"
                size="small"
                onClick={onRetry}
                className="bg-[#0A0082] hover:bg-[#0A0082]/90 text-white flex items-center gap-1.5 text-xs font-semibold px-4 py-2 shadow-xs"
              >
            <ArrowRight className="h-3.5 w-3.5" /> Try Again
              </Button>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
