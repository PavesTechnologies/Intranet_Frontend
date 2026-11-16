import { useQuery } from "@tanstack/react-query";
import { cashAdvanceApi } from "@/pages/expense-management/api/cashAdvanceApi";
import { expenseReportService } from "@/pages/expense-management/api/expenseReportsApi";

// The employee's own advances and reports, from the same endpoints their list pages use. Shared by the activity list
// and the "Needs your action" reminders, so the two are fetched once. A role that cannot call one of these gets an
// error for that source only; the other source still shows.

const unwrapList = (body) => {
  const payload = body?.data ?? body;
  if (Array.isArray(payload)) return payload;
  return payload?.content || payload?.items || payload?.reports || payload?.expenseReports || [];
};

export function useEmployeeAdvances(enabled = true) {
  return useQuery({
    queryKey: ["xmsEmployeeAdvances"],
    queryFn: () => cashAdvanceApi.getMyAdvances({ size: 50 }).then((res) => unwrapList(res.data)),
    enabled,
    staleTime: 60_000,
    retry: false,
  });
}

export function useEmployeeReports(enabled = true) {
  return useQuery({
    queryKey: ["xmsEmployeeReports"],
    queryFn: () => expenseReportService.getAll({ page: 1, limit: 50 }).then((res) => unwrapList(res.data)),
    enabled,
    staleTime: 60_000,
    retry: false,
  });
}
