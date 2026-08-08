import { useQuery } from "@tanstack/react-query";
import vendorService from "../services/vendorService";

export const VENDOR_DETAIL_KEY = (vendorId) => ["accountsPayable", "vendor", vendorId];

/**
 * Fetches a vendor's full profile. The backend eagerly nests addresses,
 * banks, and each address's tax registrations in a single response, so no
 * separate list calls are needed here.
 * @param {string|number} vendorId
 */
export const useVendorDetail = (vendorId) => {
  const vendorQuery = useQuery({
    queryKey: VENDOR_DETAIL_KEY(vendorId),
    queryFn: () => vendorService.getVendorById(vendorId),
    enabled: !!vendorId,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    retry: 1,
  });

  return {
    vendor: vendorQuery.data,
    addresses: vendorQuery.data?.vendor_address || [],
    banks: vendorQuery.data?.vendor_bank || [],
    isLoading: vendorQuery.isLoading,
    isError: vendorQuery.isError,
    error: vendorQuery.error,
    refetchVendor: vendorQuery.refetch,
  };
};

export default useVendorDetail;
