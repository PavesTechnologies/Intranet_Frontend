import { useMutation, useQueryClient } from "@tanstack/react-query";

import procurementService from "../services/procurementService";

import { PR_QUOTATIONS_KEY } from "./useQuotations";

import {
  PR_DETAIL_KEY,
} from "./usePurchaseRequisitionDetail";

import {
  RFQ_DETAIL_KEY,
  RFQ_QUOTATIONS_KEY,
  RFQ_LISTS_KEY,
} from "./useRfqs";

const normalizeId = (id) => String(id ?? "").trim();

export const useCreateQuotation = (prId) => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (data) =>
      procurementService.createQuotation(prId, data),

    onSuccess: async (_result, variables) => {
      const rfqId = normalizeId(variables?.rfqId);

      const tasks = [
        qc.invalidateQueries({
          queryKey: PR_QUOTATIONS_KEY(prId),
          refetchType: "active",
        }),

        qc.invalidateQueries({
          queryKey: PR_DETAIL_KEY(prId),
          refetchType: "active",
        }),

        qc.invalidateQueries({
          queryKey: [
            "accountsPayable",
            "procurement",
            "purchaseRequisitions",
          ],
          refetchType: "active",
        }),
      ];

      if (rfqId) {
        tasks.push(
          qc.invalidateQueries({
            queryKey: RFQ_DETAIL_KEY(rfqId),
            refetchType: "active",
          }),

          qc.invalidateQueries({
            queryKey: RFQ_QUOTATIONS_KEY(rfqId),
            refetchType: "active",
          }),

          qc.invalidateQueries({
            queryKey: RFQ_LISTS_KEY,
            refetchType: "active",
          })
        );
      }

      await Promise.all(tasks);

      /*
       * Force immediate refresh of the mounted RFQ detail
       * and quotation queries.
       *
       * This is required because adding a quotation can change:
       *
       * SENT → RESPONSE_RECEIVED
       *
       * and the new quotation must be available immediately
       * for the Close RFQ button condition.
       */
      if (rfqId) {
        await Promise.all([
          qc.refetchQueries({
            queryKey: RFQ_DETAIL_KEY(rfqId),
            type: "active",
          }),

          qc.refetchQueries({
            queryKey: RFQ_QUOTATIONS_KEY(rfqId),
            type: "active",
          }),
        ]);
      }
    },
  });
};

export const useDeleteQuotation = (prId) => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (quotationId) =>
      procurementService.deleteQuotation(quotationId),

    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({
          queryKey: PR_QUOTATIONS_KEY(prId),
          refetchType: "active",
        }),

        qc.invalidateQueries({
          queryKey: PR_DETAIL_KEY(prId),
          refetchType: "active",
        }),
      ]);
    },
  });
};