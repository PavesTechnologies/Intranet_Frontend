import { formatDateTime } from "../../utils/formatters";
import { useAuth } from "../../../../contexts/AuthContext";
import { useEmployeeDirectory } from "../../../expense-management/approval-engine/hooks/useEmployeeDirectory";
import { usePrTimeline } from "../hooks/usePurchaseRequisitionDetail";
import { PR_TIMELINE_EVENT_LABELS } from "../constants/procurementStatus";
import { currentUserId } from "../utils/prAuthorization";

/**
 * Backend-persisted workflow history (GET /purchase-requisitions/{pr_id}/timeline) — never
 * derived from the PR's current status. Order is left exactly as the backend returns it (already
 * chronological, oldest first — see get_pr_history's ORDER BY changed_at/audit_log_id asc).
 *
 * `performed_by` is a raw employee/user id — resolved to a name via the same employee directory
 * RequesterLabel already uses. Unlike RequesterLabel's own fallback chain, an id that can't be
 * resolved (and isn't the signed-in user) renders as "Unknown" rather than the raw id, since a
 * historical audit entry must never leak an internal identifier to the viewer.
 */
export default function PrWorkflowTimeline({ prId }) {
  const { data: events = [], isLoading, isError } = usePrTimeline(prId);
  const { user } = useAuth();
  const { data: directory } = useEmployeeDirectory();

  const resolveActorName = (employeeId) => {
    if (!employeeId) return null;
    const directoryName = directory?.get(employeeId)?.name;
    if (directoryName) return directoryName;
    const isSelf = String(currentUserId(user)) === String(employeeId);
    return isSelf ? user?.name || user?.email || "Unknown" : "Unknown";
  };

  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold text-gray-700">Workflow Timeline</h3>

      {isLoading && <p className="text-sm text-gray-500">Loading timeline…</p>}
      {isError && <p className="text-sm text-red-500">Unable to load the workflow timeline.</p>}
      {!isLoading && !isError && events.length === 0 && (
        <p className="text-sm text-gray-500">No workflow history recorded yet.</p>
      )}

      {events.length > 0 && (
        <ol className="space-y-3 border-l border-gray-200 pl-4">
          {events.map((entry) => {
            const actorName = resolveActorName(entry.performed_by);
            return (
              <li key={entry.id} className="relative">
                <span className="absolute -left-[21px] top-1 h-2 w-2 rounded-full bg-[#0A0082]" />
                <p className="text-sm font-medium text-gray-900">
                  {PR_TIMELINE_EVENT_LABELS[entry.event] || entry.event}
                </p>
                <p className="text-xs text-gray-500">
                  {formatDateTime(entry.created_at)}
                  {actorName ? ` · By ${actorName}` : null}
                </p>
                {entry.reason && <p className="mt-0.5 text-xs text-gray-600">Reason: {entry.reason}</p>}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
