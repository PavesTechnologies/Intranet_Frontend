import { useMutation, useQueryClient } from "@tanstack/react-query";
import departmentService from "../services/departmentService";
import { DEPARTMENTS_KEY } from "./useDepartments";

const invalidateDepartments = (qc) => qc.invalidateQueries({ queryKey: DEPARTMENTS_KEY });

export const useCreateDepartment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => departmentService.createDepartment(payload),
    onSuccess: () => invalidateDepartments(qc),
  });
};

export const useUpdateDepartment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ departmentId, payload }) => departmentService.updateDepartment(departmentId, payload),
    onSuccess: () => invalidateDepartments(qc),
  });
};

export const useDeleteDepartment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (departmentId) => departmentService.deleteDepartment(departmentId),
    onSuccess: () => invalidateDepartments(qc),
  });
};
