import { useQuery } from "@tanstack/react-query";
import { employeeDirectoryApi } from "../api/employeeDirectoryApi";

export const EMPLOYEE_DIRECTORY_KEY = ["approvalEmployeeDirectory"];

/**
 * Resolves employeeId -> { name, email } across every approval-engine screen (queue/history lists,
 * review panel, department approvers, delegations). One shared query so the directory (which
 * rarely changes) is fetched once and cached, not once per page.
 */
export const useEmployeeDirectory = () =>
  useQuery({
    queryKey: EMPLOYEE_DIRECTORY_KEY,
    queryFn: async () => {
      const res = await employeeDirectoryApi.getAll();
      const raw = Array.isArray(res.data) ? res.data : res.data?.content || res.data?.data || [];
      const map = new Map();
      raw.forEach((e) => {
        const id = e.employee_id ?? e.employeeId;
        if (!id) return;
        const name = [e.first_name ?? e.firstName, e.last_name ?? e.lastName].filter(Boolean).join(" ").trim();
        map.set(id, { name: name || null, email: e.work_email ?? e.workEmail ?? "" });
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
