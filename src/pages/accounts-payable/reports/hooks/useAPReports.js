import { useQuery } from "@tanstack/react-query";
import apReportsService from "../services/apReportsService";

export const AP_REPORTS_KEYS = {
  aging: ["accountsPayable", "reports", "aging"],
  vendorSpend: ["accountsPayable", "reports", "vendorSpend"],
  paymentMethod: ["accountsPayable", "reports", "paymentMethod"],
};

const QUERY_DEFAULTS = {
  staleTime: 60_000,
  gcTime: 5 * 60_000,
  retry: 2,
};

export const useAPReports = () => {
  const agingQuery = useQuery({
    queryKey: AP_REPORTS_KEYS.aging,
    queryFn: apReportsService.getAgingReport,
    ...QUERY_DEFAULTS,
  });

  const vendorSpendQuery = useQuery({
    queryKey: AP_REPORTS_KEYS.vendorSpend,
    queryFn: apReportsService.getVendorSpendReport,
    ...QUERY_DEFAULTS,
  });

  const paymentMethodQuery = useQuery({
    queryKey: AP_REPORTS_KEYS.paymentMethod,
    queryFn: apReportsService.getPaymentMethodReport,
    ...QUERY_DEFAULTS,
  });

  return {
    isLoading: agingQuery.isLoading || vendorSpendQuery.isLoading || paymentMethodQuery.isLoading,
    isError: agingQuery.isError || vendorSpendQuery.isError || paymentMethodQuery.isError,
    aging: agingQuery.data ?? [],
    vendorSpend: vendorSpendQuery.data ?? [],
    paymentMethod: paymentMethodQuery.data ?? [],
  };
};

export default useAPReports;
