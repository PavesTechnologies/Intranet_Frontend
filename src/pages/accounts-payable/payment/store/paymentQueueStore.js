import { create } from "zustand";

/**
 * Small in-memory store that carries the Payment Queue's selected invoice IDs
 * into the Payment Processing page. No persistence needed — selection is
 * meant to be a short-lived, single-session workflow state.
 */
export const usePaymentQueueStore = create((set, get) => ({
  selectedInvoiceIds: [],

  toggleInvoice: (id) => {
    set((state) => {
      const isSelected = state.selectedInvoiceIds.includes(id);
      return {
        selectedInvoiceIds: isSelected
          ? state.selectedInvoiceIds.filter((invoiceId) => invoiceId !== id)
          : [...state.selectedInvoiceIds, id],
      };
    });
  },

  setSelected: (ids) => set({ selectedInvoiceIds: ids }),

  clearSelection: () => set({ selectedInvoiceIds: [] }),
}));

export default usePaymentQueueStore;
