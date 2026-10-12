import { useEffect, useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { paymentService } from "../services/paymentService";
import { INVOICE_DETAIL_KEY } from "../../invoice/hooks/useInvoiceDetail";
import { INVOICE_SUMMARY_KEY } from "../../invoice/hooks/useInvoiceSummary";
import { INVOICE_HISTORY_KEY } from "../../invoice/hooks/useInvoiceHistory";

export const PAYMENT_METADATA_KEY = ["accountsPayable", "paymentMetadata"];
export const READY_FOR_PAYMENT_KEY = (params) => ["accountsPayable", "payments", "ready", params];
export const PAYMENT_HISTORY_LIST_KEY = (params) => ["accountsPayable", "payments", "history", params];
export const INVOICE_PAYMENTS_KEY = (invoiceId) => ["accountsPayable", "payments", "invoice", Number(invoiceId)];

const PAGE_SIZE = 20;

export function usePaymentMetadata() {
  return useQuery({
    queryKey: PAYMENT_METADATA_KEY,
    queryFn: () => paymentService.getPaymentMetadata(),
    staleTime: 10 * 60_000,
  });
}

/** Shared paging for the two server-paginated lists ({items,total,page,pageSize}). */
function usePagedList(keyFn, fetcher, filters) {
  const [page, setPage] = useState(1);
  const filtersKey = JSON.stringify(filters);

  useEffect(() => {
    setPage(1);
  }, [filtersKey]);

  const query = useQuery({
    queryKey: keyFn({ ...filters, page }),
    queryFn: () => fetcher({ ...filters, page, pageSize: PAGE_SIZE }),
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

/** @param {{search?: string, status?: string, overdue?: boolean, dueFrom?: string, dueTo?: string}} filters */
export function useReadyForPayment(filters) {
  return usePagedList(READY_FOR_PAYMENT_KEY, (p) => paymentService.getReadyForPayment(p), filters);
}

/** @param {{search?: string, status?: string, paymentMode?: string, paidFrom?: string, paidTo?: string}} filters */
export function usePaymentHistoryList(filters) {
  return usePagedList(PAYMENT_HISTORY_LIST_KEY, (p) => paymentService.getPaymentHistory(p), filters);
}

export function useInvoicePayments(invoiceId, { enabled = true } = {}) {
  return useQuery({
    queryKey: INVOICE_PAYMENTS_KEY(invoiceId),
    queryFn: () => paymentService.getInvoicePayments(invoiceId),
    enabled: Boolean(invoiceId) && enabled,
    retry: false,
  });
}

function invalidateAfterPayment(queryClient, invoiceId) {
  // Payment lists, this invoice's payment detail, the invoice itself (status / amount paid),
  // its activity history and the dashboard summary all change after a payment.
  queryClient.invalidateQueries({ queryKey: ["accountsPayable", "payments"] });
  queryClient.invalidateQueries({ queryKey: ["accountsPayable", "invoices"] });
  queryClient.invalidateQueries({ queryKey: ["accountsPayable", "tdsTracking"] });
  queryClient.invalidateQueries({ queryKey: INVOICE_SUMMARY_KEY });
  if (invoiceId != null) {
    queryClient.invalidateQueries({ queryKey: INVOICE_DETAIL_KEY(invoiceId) });
    queryClient.invalidateQueries({ queryKey: INVOICE_HISTORY_KEY(invoiceId) });
  }
}

/** variables: {invoiceId, payload} */
export function useRecordPaymentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ invoiceId, payload }) => paymentService.recordPayment(invoiceId, payload),
    onSuccess: (detail, { invoiceId }) => {
      queryClient.setQueryData(INVOICE_PAYMENTS_KEY(invoiceId), detail);
      invalidateAfterPayment(queryClient, invoiceId);
    },
  });
}

/** variables: {invoiceId, file} - read-only receipt auto-fill (nothing is recorded). */
export function useExtractReceiptMutation() {
  return useMutation({ mutationFn: ({ invoiceId, file }) => paymentService.extractReceipt(invoiceId, file) });
}

/** variables: {invoiceId, paymentId, file, documentType} */
export function useUploadPaymentDocumentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ paymentId, file, documentType }) => paymentService.uploadPaymentDocument(paymentId, file, documentType),
    onSuccess: (_, { invoiceId }) => invalidateAfterPayment(queryClient, invoiceId),
  });
}
