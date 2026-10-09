import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { departmentApproverApi } from "../api/departmentApproverApi";

export const DEPARTMENT_APPROVERS_KEY = ["departmentApprovers"];
export const DEPARTMENT_OVERVIEW_KEY = ["departmentApproverOverview"];
export const APPROVER_CANDIDATES_KEY = ["departmentApproverCandidates"];

const unwrap = (res) => res.data?.data;

export const useDepartmentApprovers = () =>
  useQuery({
    queryKey: DEPARTMENT_APPROVERS_KEY,
    queryFn: () => departmentApproverApi.getAll().then(unwrap),
    staleTime: 30_000,
  });

/** Departments from Employee Onboarding, each with its configured approver. */
export const useDepartmentOverview = () =>
  useQuery({
    queryKey: DEPARTMENT_OVERVIEW_KEY,
    queryFn: () => departmentApproverApi.getDepartments().then(unwrap),
    staleTime: 30_000,
  });

/** Employees from UMS that can be picked as an approver. Only fetched while the picker is open. */
export const useApproverCandidates = ({ enabled = true } = {}) =>
  useQuery({
    queryKey: APPROVER_CANDIDATES_KEY,
    queryFn: () => departmentApproverApi.getApproverCandidates().then(unwrap),
    enabled,
    staleTime: 5 * 60_000,
  });

const invalidateAll = (qc) => {
  qc.invalidateQueries({ queryKey: DEPARTMENT_APPROVERS_KEY });
  qc.invalidateQueries({ queryKey: DEPARTMENT_OVERVIEW_KEY });
};

export const useSaveDepartmentApprover = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) =>
      (id ? departmentApproverApi.update(id, payload) : departmentApproverApi.create(payload)).then(unwrap),
    onSuccess: () => invalidateAll(qc),
  });
};

export const useDeleteDepartmentApprover = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => departmentApproverApi.delete(id),
    onSuccess: () => invalidateAll(qc),
  });
};
