import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import vendorNoteService from "../services/vendorNoteService";

export const VENDOR_NOTES_KEY = ["accountsPayable", "vendorNotes"];

export function useVendorNotes(filters) {
  return useQuery({ queryKey: [...VENDOR_NOTES_KEY, filters], queryFn: () => vendorNoteService.list(filters), staleTime: 30_000 });
}

export function useApplicableInvoices(vendorId) {
  return useQuery({
    queryKey: [...VENDOR_NOTES_KEY, "applicable", vendorId],
    queryFn: () => vendorNoteService.applicableInvoices(vendorId),
    enabled: Boolean(vendorId),
  });
}

/** A note changes what is owed: refresh notes, payments, dashboards and the GST register. */
function useNoteMutation(mutationFn) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      for (const key of [VENDOR_NOTES_KEY, ["accountsPayable", "payments"], ["accountsPayable", "actionCenter"],
        ["accountsPayable", "roleDashboard"], ["accountsPayable", "gstItc"]]) {
        queryClient.invalidateQueries({ queryKey: key });
      }
    },
  });
}

export const useRecordNote = () => useNoteMutation(({ payload, file }) => vendorNoteService.record(payload, file));
export const useApplyNote = () => useNoteMutation(({ noteId, invoiceId }) => vendorNoteService.apply(noteId, invoiceId));
export const useCancelNote = () => useNoteMutation(({ noteId, reason }) => vendorNoteService.cancel(noteId, reason));
