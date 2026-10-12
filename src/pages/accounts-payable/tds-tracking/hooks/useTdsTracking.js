import { useEffect, useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { tdsTrackingService } from "../services/tdsTrackingService";
import { INVOICE_HISTORY_KEY } from "../../invoice/hooks/useInvoiceHistory";
import { INVOICE_PAYMENTS_KEY } from "../../payment/hooks/usePaymentTracking";

export const TDS_TRACKING_METADATA_KEY = ["accountsPayable", "tdsTracking", "metadata"];
export const TDS_TRACKING_LIST_KEY = (params) => ["accountsPayable", "tdsTracking", "list", params];
export const TDS_TRACKING_DETAIL_KEY = (invoiceId) => ["accountsPayable", "tdsTracking", "detail", Number(invoiceId)];

const PAGE_SIZE = 20;

export function useTdsTrackingMetadata() {
  return useQuery({
    queryKey: TDS_TRACKING_METADATA_KEY,
    queryFn: () => tdsTrackingService.getMetadata(),
    staleTime: 10 * 60_000,
  });
}

export function useTdsTrackingList(filters) {
  const [page, setPage] = useState(1);
  const filtersKey = JSON.stringify(filters);
  useEffect(() => {
    setPage(1);
  }, [filtersKey]);

  const query = useQuery({
    queryKey: TDS_TRACKING_LIST_KEY({ ...filters, page }),
    queryFn: () => tdsTrackingService.getTdsInvoices({ ...filters, page, pageSize: PAGE_SIZE }),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
  const total = query.data?.total ?? 0;
  return {
    ...query,
    items: query.data?.items ?? [],
    total,
    page,
    setPage,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

export function useTdsTrackingDetail(invoiceId) {
  return useQuery({
    queryKey: TDS_TRACKING_DETAIL_KEY(invoiceId),
    queryFn: () => tdsTrackingService.getTdsDetail(invoiceId),
    enabled: Boolean(invoiceId),
    retry: false,
  });
}

function invalidate(queryClient, invoiceId) {
  queryClient.invalidateQueries({ queryKey: ["accountsPayable", "tdsTracking"] });
  queryClient.invalidateQueries({ queryKey: INVOICE_PAYMENTS_KEY(invoiceId) });
  queryClient.invalidateQueries({ queryKey: INVOICE_HISTORY_KEY(invoiceId) });
}

/** variables: {invoiceId, action, payload} */
export function useRecordTdsActivityMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ invoiceId, action, payload }) => tdsTrackingService.recordActivity(invoiceId, action, payload),
    onSuccess: (detail, { invoiceId }) => {
      queryClient.setQueryData(TDS_TRACKING_DETAIL_KEY(invoiceId), detail);
      invalidate(queryClient, invoiceId);
    },
  });
}

/** variables: {invoiceId, file, documentType} */
export function useUploadTdsDocumentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ invoiceId, file, documentType }) => tdsTrackingService.uploadDocument(invoiceId, file, documentType),
    onSuccess: (_, { invoiceId }) => invalidate(queryClient, invoiceId),
  });
}
