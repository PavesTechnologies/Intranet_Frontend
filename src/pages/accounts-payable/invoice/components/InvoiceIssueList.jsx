import { AlertCircle, AlertTriangle, Info } from "lucide-react";
import { ISSUE_SEVERITY, ISSUE_STATUS } from "../../constants/invoiceIssues";

const SEVERITY_STYLES = {
  [ISSUE_SEVERITY.ERROR]: { icon: AlertCircle, badgeClass: "bg-red-100 text-red-700", cardClass: "border-red-200 bg-red-50" },
  [ISSUE_SEVERITY.WARNING]: { icon: AlertTriangle, badgeClass: "bg-yellow-100 text-yellow-700", cardClass: "border-yellow-200 bg-yellow-50" },
  [ISSUE_SEVERITY.INFO]: { icon: Info, badgeClass: "bg-blue-100 text-blue-700", cardClass: "border-blue-200 bg-blue-50" },
};

/**
 * The backend has no persisted, queryable "issues for invoice X" list or resolve action — the
 * only error data it returns is the transient ValidationResult.errors[] from the upload
 * pipeline, which invoiceMapper.js can't carry forward (it isn't returned again by
 * InvoiceDetailsResponse). `issues` is therefore always empty today; this stays a distinct
 * message from "no issues" so it doesn't read as a false all-clear.
 */
export default function InvoiceIssueList({ issues = [] }) {
  if (issues.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-3 text-sm text-gray-500">
        Issue tracking isn't available from the backend for existing invoices yet.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {issues.map((issue) => {
        const style = SEVERITY_STYLES[issue.severity] || SEVERITY_STYLES[ISSUE_SEVERITY.INFO];
        const Icon = style.icon;
        const isOpen = issue.status === ISSUE_STATUS.OPEN;

        return (
          <li key={issue.id} className={`rounded-lg border p-3 ${style.cardClass}`}>
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
          </li>
        );
      })}
    </ul>
  );
}
