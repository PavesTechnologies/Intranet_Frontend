import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { departmentApi, expenseSummaryReportApi } from "./reportsApi";

export const EXPENSE_SUMMARY_REPORT_KEY = "xmsExpenseSummaryReport";

export const useExpenseSummaryReport = (from, to, { enabled = true } = {}) =>
  useQuery({
    queryKey: [EXPENSE_SUMMARY_REPORT_KEY, from, to],
    queryFn: () => expenseSummaryReportApi.get({ from, to }).then((res) => res.data?.data),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });

/** department_uuid -> department_name, from Employee Onboarding. */
export const useDepartmentNames = () =>
  useQuery({
    queryKey: ["xmsReportDepartments"],
    queryFn: async () => {
      const res = await departmentApi.getAll();
      const list = Array.isArray(res.data) ? res.data : res.data?.data || [];
      return Object.fromEntries(list.filter((d) => d?.department_uuid).map((d) => [String(d.department_uuid), d.department_name]));
    },
    staleTime: 10 * 60_000,
  });
