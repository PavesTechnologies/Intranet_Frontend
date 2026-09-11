import { useQuery } from "@tanstack/react-query";
import statusMasterService from "../services/statusMasterService";

export const STATUS_MASTER_DETAIL_KEY = (statusId) => [
  "accountsPayable",
  "systemConfig",
  "status",
  statusId,
];

export const useStatusMasterDetail = (statusId) =>
  useQuery({
    queryKey: STATUS_MASTER_DETAIL_KEY(statusId),
    queryFn: () => statusMasterService.getStatusById(statusId),
    enabled: statusId != null,
    staleTime: 30_000,
  });

export default useStatusMasterDetail;
