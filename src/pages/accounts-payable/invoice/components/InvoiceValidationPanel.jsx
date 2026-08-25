import { Info } from "lucide-react";
import { PageCard, PageCardContent } from "../../../../components/Cards/PageCard";

/**
 * There's no persisted per-check validation result model on the backend — validate-fields only
 * ever runs once, inline, during upload (see InvoiceOcrReviewQueuePage / the AP Integration
 * Ledger). Previously this panel inferred PASS/WARNING/ERROR per check by keyword-matching the
 * invoice's issues list, but that list is always empty (see InvoiceIssueList) so every check
 * would silently render as a fabricated PASS. Rendering an honest "not available" note instead.
 */
export default function InvoiceValidationPanel() {
  return (
    <PageCard>
      <PageCardContent>
        <h3 className="mb-3 text-sm font-semibold text-gray-700">Validation</h3>
        <div className="flex items-start gap-2 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-3 text-sm text-gray-500">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Per-check validation results aren't available from the backend for existing invoices —
            field validation only runs once, automatically, during upload.
          </p>
        </div>
      </PageCardContent>
    </PageCard>
  );
}
