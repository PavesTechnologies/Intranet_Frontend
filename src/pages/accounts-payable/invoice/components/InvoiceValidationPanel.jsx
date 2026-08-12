import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { toast } from "react-toastify";
import { PageCard, PageCardContent } from "../../../../components/Cards/PageCard";
import Button from "../../../../components/Button/Button";
import { VALIDATION_CHECKS, CHECK_RESULT, ISSUE_SEVERITY, ISSUE_STATUS } from "../../constants/invoiceIssues";
import { useValidateInvoiceMutation, useRejectValidationMutation } from "../hooks/useInvoiceMutations";
import { getApiErrorMessage } from "../../utils/apiError";

const RESULT_STYLES = {
  [CHECK_RESULT.PASS]: { icon: CheckCircle2, className: "text-green-600" },
  [CHECK_RESULT.WARNING]: { icon: AlertTriangle, className: "text-yellow-600" },
  [CHECK_RESULT.ERROR]: { icon: XCircle, className: "text-red-600" },
};

/**
 * No backend ValidationCheckResult model exists yet, so each check's PASS/WARNING/ERROR outcome
 * is inferred here from the invoice's own issues list — a real backend would return per-check
 * results directly (see PART Y), at which point this function is deleted, not the component.
 */
function resultForCheck(checkLabel, issues) {
  const keyword = checkLabel.toLowerCase().split(" ")[0];
  const matching = issues.find(
    (issue) => issue.status === ISSUE_STATUS.OPEN && issue.description.toLowerCase().includes(keyword)
  );
  if (!matching) return CHECK_RESULT.PASS;
  return matching.severity === ISSUE_SEVERITY.ERROR ? CHECK_RESULT.ERROR : CHECK_RESULT.WARNING;
}

/**
 * Validation is a backend processing stage, not a top-level Invoice Management tab — the
 * checklist below is rendered on every invoice's detail page (readOnly) so results stay visible
 * via the Status filter / detail page, per the "Validation should not be a primary tab" rule.
 * The Submit/Reject actions only render when the invoice is actually at this pipeline stage
 * (Validation Pending / Validation Failed, i.e. `readOnly` is false).
 */
export default function InvoiceValidationPanel({ invoice, readOnly = false }) {
  const validateInvoice = useValidateInvoiceMutation();
  const rejectValidation = useRejectValidationMutation();

  const hasOpenErrors = invoice.issues.some(
    (issue) => issue.severity === ISSUE_SEVERITY.ERROR && issue.status === ISSUE_STATUS.OPEN
  );

  const handleValidate = () => {
    validateInvoice.mutate(
      { invoiceId: invoice.id },
      {
        onSuccess: () => toast.success("Invoice validated — submitted for approval."),
        onError: (error) => toast.error(getApiErrorMessage(error, "Could not validate this invoice.")),
      }
    );
  };

  const handleReject = () => {
    rejectValidation.mutate(
      { invoiceId: invoice.id },
      {
        onSuccess: () => toast.success("Invoice sent back for correction."),
        onError: (error) => toast.error(getApiErrorMessage(error, "Could not reject this invoice.")),
      }
    );
  };

  return (
    <PageCard>
      <PageCardContent>
        <h3 className="mb-3 text-sm font-semibold text-gray-700">Validation</h3>
        <ul className="space-y-2">
          {Object.values(VALIDATION_CHECKS).map((checkLabel) => {
            const result = resultForCheck(checkLabel, invoice.issues);
            const style = RESULT_STYLES[result];
            const Icon = style.icon;
            return (
              <li key={checkLabel} className="flex items-center justify-between text-sm">
                <span className="text-gray-700">{checkLabel}</span>
                <span className={`flex items-center gap-1 font-medium ${style.className}`}>
                  <Icon className="h-4 w-4" /> {result}
                </span>
              </li>
            );
          })}
        </ul>

        {!readOnly && (
          <>
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <Button variant="outline" onClick={handleReject} loading={rejectValidation.isPending}>
                Reject
              </Button>
              <Button
                variant="primary"
                onClick={handleValidate}
                loading={validateInvoice.isPending}
                disabled={hasOpenErrors}
              >
                Submit for Approval
              </Button>
            </div>
            {hasOpenErrors && (
              <p className="mt-2 text-right text-xs text-red-600">Resolve all open errors below before submitting.</p>
            )}
          </>
        )}
      </PageCardContent>
    </PageCard>
  );
}
