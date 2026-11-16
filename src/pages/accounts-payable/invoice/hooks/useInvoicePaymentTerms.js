import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { paymentTermService } from "../services/paymentTermService";
import { INVOICE_DETAIL_KEY } from "./useInvoiceDetail";
import { INVOICE_HISTORY_KEY } from "./useInvoiceHistory";

// Normalized to a number — see useInvoiceDetail.js's INVOICE_DETAIL_KEY for why this matters.
export const INVOICE_PAYMENT_TERMS_KEY = (invoiceId) => ["accountsPayable", "invoicePaymentTerms", Number(invoiceId)];
export const VENDOR_AGREEMENTS_KEY = (vendorId) => ["accountsPayable", "vendorAgreements", Number(vendorId)];

function invalidateTerms(queryClient, invoiceId) {
  queryClient.invalidateQueries({ queryKey: INVOICE_PAYMENT_TERMS_KEY(invoiceId) });
  queryClient.invalidateQueries({ queryKey: INVOICE_DETAIL_KEY(invoiceId) });
  queryClient.invalidateQueries({ queryKey: INVOICE_HISTORY_KEY(invoiceId) });
  queryClient.invalidateQueries({ queryKey: ["accountsPayable", "invoices"] });
  queryClient.invalidateQueries({ queryKey: ["accountsPayable", "payments"] });
}

/** The invoice's payment-term compliance record (status, sources, due dates). */
export function useInvoicePaymentTerms(invoiceId, { enabled = true } = {}) {
  return useQuery({
    queryKey: INVOICE_PAYMENT_TERMS_KEY(invoiceId),
    queryFn: () => paymentTermService.getInvoicePaymentTerms(invoiceId),
    enabled: Boolean(invoiceId) && enabled,
    retry: false,
  });
}

export function useRecheckPaymentTermsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (invoiceId) => paymentTermService.recheckInvoicePaymentTerms(invoiceId),
    onSuccess: (_, invoiceId) => invalidateTerms(queryClient, invoiceId),
  });
}

/** @param {{invoiceId, appliedTermDays, dueBasis, remarks}} variables */
export function useVerifyPaymentTermsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ invoiceId, ...body }) => paymentTermService.verifyInvoicePaymentTerms(invoiceId, body),
    onSuccess: (_, variables) => invalidateTerms(queryClient, variables.invoiceId),
  });
}

// ── Vendor agreements ────────────────────────────────────────────────────

export function useVendorAgreements(vendorId, { enabled = true } = {}) {
  return useQuery({
    queryKey: VENDOR_AGREEMENTS_KEY(vendorId),
    queryFn: () => paymentTermService.listVendorAgreements(vendorId),
    enabled: Boolean(vendorId) && enabled,
  });
}

function invalidateAgreements(queryClient, vendorId) {
  queryClient.invalidateQueries({ queryKey: VENDOR_AGREEMENTS_KEY(vendorId) });
  // Activation re-checks the vendor's open invoices on the backend.
  queryClient.invalidateQueries({ queryKey: ["accountsPayable", "invoicePaymentTerms"] });
  queryClient.invalidateQueries({ queryKey: ["accountsPayable", "payments"] });
}

export function useExtractAgreementMutation(vendorId) {
  return useMutation({ mutationFn: (file) => paymentTermService.extractVendorAgreement(vendorId, file) });
}

export function useCreateAgreementMutation(vendorId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ file, fields }) => paymentTermService.createVendorAgreement(vendorId, file, fields),
    onSuccess: () => invalidateAgreements(queryClient, vendorId),
  });
}

export function useVerifyAgreementMutation(vendorId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ agreementId, remarks }) => paymentTermService.verifyVendorAgreement(agreementId, remarks),
    onSuccess: () => invalidateAgreements(queryClient, vendorId),
  });
}

export function useRejectAgreementMutation(vendorId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ agreementId, remarks }) => paymentTermService.rejectVendorAgreement(agreementId, remarks),
    onSuccess: () => invalidateAgreements(queryClient, vendorId),
  });
}
