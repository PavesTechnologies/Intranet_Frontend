import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { teamExpensesApi } from "./teamExpensesApi";

export const TEAM_EXPENSES_KEY = ["teamExpenses"];

const unwrap = (res) => res.data?.data;

// Drop empty filters so the backend sees "no filter" rather than an empty string.
const cleanParams = (params) =>
  Object.fromEntries(Object.entries(params || {}).filter(([, v]) => v !== "" && v !== null && v !== undefined));

export const useTeamMembers = () =>
  useQuery({
    queryKey: [...TEAM_EXPENSES_KEY, "members"],
    queryFn: () => teamExpensesApi.getMembers().then(unwrap),
    staleTime: 5 * 60_000,
  });

export const useTeamExpenseReports = (params) => {
  const cleaned = cleanParams(params);
  return useQuery({
    queryKey: [...TEAM_EXPENSES_KEY, "reports", cleaned],
    queryFn: () => teamExpensesApi.getReports(cleaned).then(unwrap),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
};

export const useTeamExpenseSummary = () =>
  useQuery({
    queryKey: [...TEAM_EXPENSES_KEY, "summary"],
    queryFn: () => teamExpensesApi.getSummary().then(unwrap),
    staleTime: 30_000,
  });
