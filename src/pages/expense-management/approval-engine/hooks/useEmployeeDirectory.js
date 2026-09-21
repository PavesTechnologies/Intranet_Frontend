import { useQuery } from "@tanstack/react-query";
import { employeeDirectoryApi } from "../api/employeeDirectoryApi";

export const EMPLOYEE_DIRECTORY_KEY = ["approvalEmployeeDirectory"];

/**
 * Resolves employeeId -> { name, email } across every approval-engine screen (queue/history lists,
 * review panel, department approvers, delegations). One shared query so the directory (which
 * rarely changes) is fetched once and cached, not once per page.
 *
 * Indexed by BOTH identity shapes seen across this app: the numeric employee_id (e.g. AP audit
 * log's changed_by, JWT user_id — "5100031") and the UUID identity CDC-synced tables actually use
 * (e.g. invoice_approval_step_approver.user_uuid, ap.ums_user_cache — "019e68eb-..."). The core-
 * employee-details response carries both fields per record (confirmed via CoreEmployeeDetailsDashboard.jsx's
 * own `user_uuid: emp.employee_uuid` mapping) — this was previously only indexed by the numeric
 * id, so any UUID-keyed lookup (ApproverLabel) could never resolve and silently fell back to a
 * truncated uuid for every approver, in every panel that shows one.
 */
export const useEmployeeDirectory = () =>
  useQuery({
    queryKey: EMPLOYEE_DIRECTORY_KEY,
    queryFn: async () => {
      const res = await employeeDirectoryApi.getAll();
      const raw = Array.isArray(res.data) ? res.data : res.data?.content || res.data?.data || [];
      const map = new Map();
      raw.forEach((e) => {
        const employeeId = e.employee_id ?? e.employeeId;
        const employeeUuid = e.employee_uuid ?? e.employeeUuid ?? e.user_uuid ?? e.userUuid;
        if (!employeeId && !employeeUuid) return;
        const name = [e.first_name ?? e.firstName, e.last_name ?? e.lastName].filter(Boolean).join(" ").trim();
        const entry = { name: name || null, email: e.work_email ?? e.workEmail ?? "" };
        if (employeeId) map.set(employeeId, entry);
        if (employeeUuid) map.set(employeeUuid, entry);
      });
      return map;
    },
    staleTime: 10 * 60_000,
    gcTime: 30 * 60_000,
    retry: 1,
  });

/** `map.get(id)?.name` with the null-map/not-found cases collapsed to a single fallback. */
export const resolveEmployeeName = (map, employeeId) => {
  if (!employeeId) return "—";
  return map?.get(employeeId)?.name || employeeId;
};
