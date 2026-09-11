import { useQuery } from "@tanstack/react-query";
import departmentService from "../services/departmentService";

export const DEPARTMENTS_KEY = ["accountsPayable", "systemConfig", "departments"];

export const useDepartments = () =>
  useQuery({
    queryKey: DEPARTMENTS_KEY,
    queryFn: departmentService.getDepartments,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    retry: 2,
  });

export default useDepartments;
