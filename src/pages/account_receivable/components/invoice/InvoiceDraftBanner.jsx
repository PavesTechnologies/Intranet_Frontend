import React from "react";
import {
  FileText,
  AlertTriangle,
  CheckCircle2,
  Info,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Send,
} from "lucide-react";
import Button from "../../../../components/Button/Button";
import StatusBadge from "../../../../components/status/statusbadge";

/**
 * InvoiceDraftBanner
 * Highlights the draft preview state, communicating that no official invoice exists yet,
 * and hosts the primary Generate Invoice action.
 */
export default function InvoiceDraftBanner({
  isInvoiceGenerated = false,
  invoiceStatus = "DRAFT_PREVIEW",
  invoiceNumber = null,
  isTaxCompleted = true,
  generating = false,
  generateError = "",
  onGenerateInvoice,
  onViewInvoice,
  onBackToTax,
  onSubmitForApproval,
  submittingForApproval = false,
}) {
  return (
    <div className="space-y-3">
      {/* Backend generation error alert banner */}
      {generateError && (
        <div className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-800 shadow-sm">
          <AlertTriangle className="h-5 w-5 shrink-0 text-rose-600" />
          <div className="text-xs font-medium flex-1">
            <span className="font-bold block">Invoice Generation Error</span>
            <span>{generateError}</span>
          </div>
        </div>
      )}

      {!isInvoiceGenerated ? (
        !isTaxCompleted ? (
          /* State 1: Tax Incomplete Warning */
          <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50/80 p-4 sm:flex-row sm:items-center sm:justify-between shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-amber-950">Tax Calculation Incomplete</h3>
                  <StatusBadge label="TAX_INCOMPLETE" size="sm" />
                </div>
                <p className="text-xs text-amber-800 mt-0.5">
                  Tax calculation has not been completed for this billing snapshot. Taxes must be calculated and verified before an invoice can be generated.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="small"
                onClick={onBackToTax}
                className="bg-white border-amber-300 text-amber-900 hover:bg-amber-100 flex items-center justify-center gap-1.5 text-xs font-semibold shadow-xs"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back to Tax Calculation
              </Button>
              <Button
                variant="primary"
                size="small"
                disabled={true}
                className="bg-slate-300 text-slate-500 cursor-not-allowed flex items-center justify-center gap-2 text-xs font-semibold shadow-xs px-4 py-2"
              >
                <FileText className="h-4 w-4" /> Generate Official Invoice
              </Button>
            </div>
          </div>
        ) : (
          /* State 2: Draft Preview Ready */
          <div className="flex flex-col gap-3 rounded-xl border border-indigo-200 bg-indigo-50/70 p-4 sm:flex-row sm:items-center sm:justify-between shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-700">
                <Info className="h-5 w-5" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-bold text-indigo-950">Invoice Generation – Draft Preview</h3>
                  <span className="font-mono text-[11px] font-bold text-indigo-800 bg-indigo-100/90 border border-indigo-200 px-2 py-0.5 rounded">
                    Draft Preview
                  </span>
                  <span className="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 px-2 py-0.5 rounded">
                    <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                    Ready to Generate
                  </span>
                </div>
                <p className="text-xs text-indigo-700 mt-0.5">
                  This is a draft preview of the invoice. No official invoice has been generated yet. All required invoice, tax, and financial information is available. Review the details and click <strong>Generate Official Invoice</strong> to commit and create the official invoice.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="primary"
                size="small"
                onClick={onGenerateInvoice}
                disabled={generating || !isTaxCompleted}
                className="bg-[#0A0082] hover:bg-[#0A0082]/90 text-white flex items-center justify-center gap-2 text-xs font-semibold shadow-xs px-4 py-2"
              >
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Generating Official Invoice...
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4" /> Generate Official Invoice
                  </>
                )}
              </Button>
            </div>
          </div>
        )
      ) : (
        /* State 3: Invoice Already Generated */
        <div className="flex flex-col gap-3 rounded-xl border border-emerald-200 bg-emerald-50/80 p-4 sm:flex-row sm:items-center sm:justify-between shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-emerald-950">Invoice Generated Successfully</h3>
                {invoiceNumber && (
                  <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded">
                    {invoiceNumber}
                  </span>
                )}
                <StatusBadge label={invoiceStatus} size="sm" />
              </div>
              <p className="text-xs text-emerald-800 mt-0.5">
                Official authoritative invoice created. Review the official invoice document or submit for approval.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {(invoiceStatus === "GENERATED" || !invoiceStatus) && onSubmitForApproval && (
              <Button
                variant="primary"
                size="small"
                onClick={onSubmitForApproval}
                disabled={submittingForApproval}
                className="bg-[#0A0082] hover:bg-[#0A0082]/90 text-white flex items-center gap-1.5 text-xs font-semibold px-4 py-2 shadow-xs"
              >
                <Send className="h-3.5 w-3.5" />
                {submittingForApproval ? "Submitting..." : "Submit for Approval"}
              </Button>
            )}
            {onViewInvoice && (
              <Button
                variant={(invoiceStatus === "GENERATED" || !invoiceStatus) && onSubmitForApproval ? "outline" : "primary"}
                size="small"
                onClick={onViewInvoice}
                className={(invoiceStatus === "GENERATED" || !invoiceStatus) && onSubmitForApproval
                  ? "bg-white border-emerald-300 text-emerald-900 hover:bg-emerald-100 flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 shadow-xs"
                  : "bg-[#0A0082] hover:bg-[#0A0082]/90 text-white flex items-center gap-1.5 text-xs font-semibold px-4 py-2 shadow-xs"
                }
              >
                View Generated Invoice <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
