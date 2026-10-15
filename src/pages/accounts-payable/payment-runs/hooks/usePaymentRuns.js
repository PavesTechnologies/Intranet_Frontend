import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import paymentRunService from "../services/paymentRunService";

export const PAYMENT_RUNS_KEY = ["accountsPayable", "paymentRuns"];

export const usePaymentRuns = () => useQuery({ queryKey: PAYMENT_RUNS_KEY, queryFn: () => paymentRunService.list(), staleTime: 30_000 });
export const usePaymentRun = (id) =>
  useQuery({ queryKey: [...PAYMENT_RUNS_KEY, "run", Number(id)], queryFn: () => paymentRunService.detail(id), enabled: Boolean(id) });
export const useRunCandidates = (dueBy, enabled = true) =>
  useQuery({ queryKey: [...PAYMENT_RUNS_KEY, "candidates", dueBy || "all"], queryFn: () => paymentRunService.candidates(dueBy), enabled });

/** A run step moves money: refresh runs, payments, dashboards. */
function useRunMutation(mutationFn) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      for (const key of [PAYMENT_RUNS_KEY, ["accountsPayable", "payments"], ["accountsPayable", "actionCenter"],
        ["accountsPayable", "roleDashboard"]]) {
        queryClient.invalidateQueries({ queryKey: key });
      }
    },
  });
}

export const useCreateRun = () => useRunMutation((body) => paymentRunService.create(body));
export const useRunStep = () => useRunMutation(({ runId, step, remarks }) => paymentRunService.step(runId, step, remarks));
export const useRemoveRunInvoice = () => useRunMutation(({ runId, invoiceId }) => paymentRunService.removeInvoice(runId, invoiceId));
export const useConfirmRun = () => useRunMutation(({ runId, results }) => paymentRunService.confirm(runId, results));
export const useConfirmRunFile = () => useRunMutation(({ runId, file }) => paymentRunService.confirmFile(runId, file));
