import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { invoiceHandoffService } from "@/pages/expense-management/api/expenseReportsApi";

/**
 * react-query wiring for the invoice-team handoff queue (Epic 8), matching the
 * useApPayments.js / useFinanceVerification.js hook convention used elsewhere in
 * Expense Management — this file is only the query wiring, the actual axios calls
 * live in expenseReportsApi.js's invoiceHandoffService.
 */

export const ELIGIBLE_KEY = (filters, page, size) => ["invoiceHandoffEligible", filters, page, size];

const unwrap = (res) => (res?.data?.data !== undefined ? res.data.data : res?.data);

/** PageResponse<InvoiceHandoffEligibleExpenseResponse> — finance-verified, client-billable, not yet handed off. */
export const useEligibleExpenses = (filters = {}, page = 0, size = 20) =>
  useQuery({
    queryKey: ELIGIBLE_KEY(filters, page, size),
    queryFn: () =>
      invoiceHandoffService
        .getEligibleExpenses({ ...filters, page, size })
        .then(unwrap),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    retry: 2,
  });

export const useHandoffSummary = () =>
  useQuery({
    queryKey: ["invoiceHandoffSummary"],
    queryFn: () => invoiceHandoffService.getSummary().then(unwrap),
    staleTime: 30_000,
  });

/** PageResponse<InvoiceHandoffRecordResponse> — every completed handoff, newest first. */
export const useHandedOff = (page = 0, size = 20) =>
  useQuery({
    queryKey: ["invoiceHandedOff", page, size],
    queryFn: () => invoiceHandoffService.getHandedOff({ page, size }).then(unwrap),
    staleTime: 30_000,
  });

export const useMarkHandedOff = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ lineItemId, payload }) => invoiceHandoffService.markHandedOff(lineItemId, payload).then(unwrap),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["invoiceHandoffEligible"] });
      qc.invalidateQueries({ queryKey: ["invoiceHandoffSummary"] });
      qc.invalidateQueries({ queryKey: ["invoiceHandedOff"] });
    },
  });
};

export const useHandoffHistory = (lineItemId) =>
  useQuery({
    queryKey: ["invoiceHandoffHistory", lineItemId],
    queryFn: () => invoiceHandoffService.getHistory(lineItemId).then(unwrap),
    enabled: !!lineItemId,
    staleTime: 15_000,
  });
