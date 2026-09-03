import { useQuery } from "@tanstack/react-query";
import statusMasterService from "../services/statusMasterService";

export const STATUS_MASTERS_KEY = ["accountsPayable", "systemConfig", "statuses"];

export const useStatusMasters = () =>
  useQuery({
    queryKey: STATUS_MASTERS_KEY,
    queryFn: statusMasterService.getStatuses,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    retry: 2,
  });

export default useStatusMasters;
