import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { departmentApproverApi } from "../api/departmentApproverApi";

export const DEPARTMENT_APPROVERS_KEY = ["departmentApprovers"];

const unwrap = (res) => res.data?.data;

export const useDepartmentApprovers = () =>
  useQuery({
    queryKey: DEPARTMENT_APPROVERS_KEY,
    queryFn: () => departmentApproverApi.getAll().then(unwrap),
    staleTime: 30_000,
  });

export const useSaveDepartmentApprover = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) =>
      (id ? departmentApproverApi.update(id, payload) : departmentApproverApi.create(payload)).then(unwrap),
    onSuccess: () => qc.invalidateQueries({ queryKey: DEPARTMENT_APPROVERS_KEY }),
  });
};

export const useDeleteDepartmentApprover = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => departmentApproverApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: DEPARTMENT_APPROVERS_KEY }),
  });
};
