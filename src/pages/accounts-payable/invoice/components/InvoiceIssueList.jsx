import { AlertCircle, AlertTriangle, Info, CheckCircle2 } from "lucide-react";
import { toast } from "react-toastify";
import Button from "../../../../components/Button/Button";
import { ISSUE_SEVERITY, ISSUE_STATUS } from "../../constants/invoiceIssues";
import { useApPermissions } from "../../hooks/useApPermissions";
import { useResolveInvoiceIssueMutation } from "../hooks/useInvoiceMutations";
import { getApiErrorMessage } from "../../utils/apiError";

const SEVERITY_STYLES = {
  [ISSUE_SEVERITY.ERROR]: { icon: AlertCircle, badgeClass: "bg-red-100 text-red-700", cardClass: "border-red-200 bg-red-50" },
  [ISSUE_SEVERITY.WARNING]: { icon: AlertTriangle, badgeClass: "bg-yellow-100 text-yellow-700", cardClass: "border-yellow-200 bg-yellow-50" },
  [ISSUE_SEVERITY.INFO]: { icon: Info, badgeClass: "bg-blue-100 text-blue-700", cardClass: "border-blue-200 bg-blue-50" },
};

/**
 * Reusable across the Detail page and, in future, the OCR/Validation queue pages — issue text
 * always comes from the InvoiceIssue record (issue.description etc.), never hardcoded here.
 */
export default function InvoiceIssueList({ invoiceId, issues = [] }) {
  const { canReviewOcr, canValidateInvoice } = useApPermissions();
  const resolveIssue = useResolveInvoiceIssueMutation();
  const canResolve = canReviewOcr || canValidateInvoice;

  if (issues.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
        <CheckCircle2 className="h-4 w-4" /> No issues found for this invoice.
      </div>
    );
  }

  const handleResolve = (issueId) => {
    resolveIssue.mutate(
      { issueId, invoiceId },
      {
        onSuccess: () => toast.success("Issue marked as resolved."),
        onError: (error) => toast.error(getApiErrorMessage(error, "Could not resolve this issue.")),
      }
    );
  };

  return (
    <ul className="space-y-2">
      {issues.map((issue) => {
        const style = SEVERITY_STYLES[issue.severity] || SEVERITY_STYLES[ISSUE_SEVERITY.INFO];
        const Icon = style.icon;
        const isOpen = issue.status === ISSUE_STATUS.OPEN;

        return (
          <li key={issue.id} className={`rounded-lg border p-3 ${style.cardClass}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2">
                <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${style.badgeClass}`}>
                      {issue.severity}
                    </span>
                    <span className="text-xs text-gray-500">{issue.issueSource}</span>
                  </div>
                  <p className="mt-1 text-sm font-medium text-gray-800">{issue.description}</p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    Status: {issue.status}
                    {!isOpen && issue.resolvedBy ? ` · Resolved by ${issue.resolvedBy}` : ""}
                  </p>
                </div>
              </div>
              {isOpen && canResolve && (
                <Button
                  variant="outline"
                  size="small"
                  onClick={() => handleResolve(issue.id)}
                  loading={resolveIssue.isPending}
                >
                  Resolve
                </Button>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
