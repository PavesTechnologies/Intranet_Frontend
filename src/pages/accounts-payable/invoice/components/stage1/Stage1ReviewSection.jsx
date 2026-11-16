import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import Stage1Header from "./Stage1Header";
import InvoiceDetailsPanel from "./InvoiceDetailsPanel";
import InvoiceAmountsSection from "./InvoiceAmountsSection";
import InvoiceLineItemsSection from "./InvoiceLineItemsSection";
import InvoiceDocumentViewer from "./InvoiceDocumentViewer";
import FieldStatusBadge from "./FieldStatusBadge";
import { getFieldLocation } from "../../utils/fieldLocation";
import { buildTaxRuleFlow } from "../../utils/gstPresentation";

const ISSUE_STAGE_KEYS = ["vendor", "buyer", "gst"];

/**
 * Full-width Stage 1 review workspace, rendered by InvoiceUploadPage once extraction has
 * produced field data. One unified review form regardless of whether validation passed or
 * failed: Invoice Details, Amounts, and Line Items are always shown pre-filled from extraction
 * for the AP Executive to check and save — there is no separate Vendor/Buyer/GST tab switcher
 * with its own comparison tables, so a passed invoice looks and behaves the same as a failed
 * one, just without the failure banner. Every field writes straight to local pipeline state;
 * there's no per-section save, just the one page-level Save Invoice button.
 *
 * When GST validation actually ran (stages.gst.field_comparisons present), a read-only Tax Rule
 * Validation summary (Vendor State -> Place of Supply -> Supply Type -> Expected Tax -> Invoice
 * Tax -> Match/Mismatch) is appended below the form — informational only, since the fields it
 * summarizes are already editable above. Any issues flagged by the Vendor/Buyer/GST stages are
 * surfaced in a plain list underneath, so a failure there doesn't go silently unmentioned just
 * because there's no dedicated per-stage panel anymore.
 *
 * @param {Object} props
 * @param {Object} props.extractedInvoice - pipeline.extractionResult.extracted_invoice
 * @param {Record<string, Object>} props.stages - pipeline.validation.stages
 * @param {string|null} props.fileUrl - local blob URL of the just-uploaded file, or null
 * @param {string} [props.originalFilename]
 * @param {(section: string, field: string, value: string) => void} props.onFieldChange
 * @param {(index: number, field: string, value: string) => void} props.onLineChange
 */
export default function Stage1ReviewSection({
  extractedInvoice,
  stages,
  fileUrl,
  originalFilename,
  onFieldChange,
  onLineChange,
}) {
  const [selectedFieldKey, setSelectedFieldKey] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);

  const extractionFailed = stages?.extraction?.status === "FAILED";
  const extractionIssues = stages?.extraction?.issues || [];

  const handleAmountFieldFocus = (rawKey) => {
    setSelectedFieldKey(rawKey);
    setSelectedLocation(rawKey ? getFieldLocation(extractedInvoice?.extraction, rawKey) : null);
  };

  const taxRuleFlow = buildTaxRuleFlow(stages?.gst?.field_comparisons, extractedInvoice);
  const stageIssues = ISSUE_STAGE_KEYS.flatMap((key) => stages?.[key]?.issues || []).filter(Boolean);

  return (
    <div>
      <Stage1Header stages={stages} />

      {extractionFailed && (
        <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold text-red-800">Extraction Validation Failed</p>
              {extractionIssues.length > 0 ? (
                <ul className="mt-1.5 space-y-1">
                  {extractionIssues.map((issue, index) => (
                    <li key={index} className="text-sm text-red-700">
                      • {issue}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 text-sm text-red-700">
                  {stages.extraction.message || "The extracted invoice data could not be validated."}
                </p>
              )}
              <p className="mt-2 text-xs text-red-600">
                Vendor, Buyer, and GST Tax validation were skipped because this earlier stage failed. Correct the
                fields below, then use Save Invoice.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[44%_1fr] lg:items-start">
        <div className="space-y-6">
          <InvoiceDetailsPanel extractedInvoice={extractedInvoice} onFieldChange={onFieldChange} />
          <InvoiceAmountsSection
            extractedInvoice={extractedInvoice}
            extraction={extractedInvoice?.extraction}
            onFieldFocus={handleAmountFieldFocus}
            onFieldChange={onFieldChange}
          />
          <InvoiceLineItemsSection lines={extractedInvoice?.invoice_lines} onLineChange={onLineChange} />

          {taxRuleFlow && (
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <h3 className="mb-3 text-sm font-semibold text-gray-800">Tax Rule Validation</h3>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                {[
                  ["Vendor State", taxRuleFlow.vendorState],
                  ["Place of Supply", taxRuleFlow.placeOfSupply],
                  ["Supply Type", taxRuleFlow.supplyType],
                  ["Expected Tax", taxRuleFlow.expectedTax],
                  ["Invoice Tax", taxRuleFlow.invoiceTax],
                ].map(([label, value], index) => (
                  <span key={label} className="flex items-center gap-2">
                    {index > 0 && <span className="text-gray-300">→</span>}
                    <span className="rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-xs text-gray-700">
                      {label}: <span className="font-medium">{value ?? "—"}</span>
                    </span>
                  </span>
                ))}
                <span className="text-gray-300">→</span>
                <FieldStatusBadge status={taxRuleFlow.status} />
                <span className="text-xs text-gray-500">{taxRuleFlow.ruleResult}</span>
              </div>
            </div>
          )}

          {stageIssues.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
                <div>
                  <p className="text-sm font-semibold text-amber-800">Validation flagged the following</p>
                  <ul className="mt-1.5 space-y-1">
                    {stageIssues.map((issue, index) => (
                      <li key={index} className="text-sm text-amber-700">
                        • {issue}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-auto">
          <InvoiceDocumentViewer
            fileUrl={fileUrl}
            originalFilename={originalFilename}
            page={selectedLocation?.page}
            highlights={selectedLocation ? [selectedLocation] : []}
            noteMessage={selectedFieldKey && !selectedLocation ? "No document location available for the selected field." : null}
          />
        </div>
      </div>
    </div>
  );
}
