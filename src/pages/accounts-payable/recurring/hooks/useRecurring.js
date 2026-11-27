import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import recurringService from "../services/recurringService";

export const RECURRING_KEY = ["accountsPayable", "recurring"];

export function useRecurringOverview() {
  return useQuery({ queryKey: RECURRING_KEY, queryFn: () => recurringService.overview(), staleTime: 30_000 });
}

/** Any change refreshes the schedules and the Action Center (missing / variance alerts). */
function useRecurringMutation(mutationFn) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RECURRING_KEY });
      queryClient.invalidateQueries({ queryKey: ["accountsPayable", "actionCenter"] });
    },
  });
}

export const useSaveSchedule = () =>
  useRecurringMutation(({ scheduleId, body }) => (scheduleId ? recurringService.update(scheduleId, body) : recurringService.create(body)));
export const useSkipPeriod = () => useRecurringMutation(({ occurrenceId, reason }) => recurringService.skip(occurrenceId, reason));
export const useLinkInvoice = () => useRecurringMutation(({ occurrenceId, invoiceId }) => recurringService.link(occurrenceId, invoiceId));
