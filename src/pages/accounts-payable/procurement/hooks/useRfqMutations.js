import { useMutation, useQueryClient } from "@tanstack/react-query";

import rfqService from "../services/rfqService";

import {
  RFQ_DETAIL_KEY,
  RFQ_VENDORS_KEY,
  RFQ_LISTS_KEY,
} from "./useRfqs";

import {
  PR_DETAIL_KEY,
  PR_TIMELINE_KEY,
} from "./usePurchaseRequisitionDetail";

const normalizeId = (id) => String(id ?? "").trim();

const invalidateRfqLists = async (queryClient) => {
  await queryClient.invalidateQueries({
    queryKey: RFQ_LISTS_KEY,
    refetchType: "active",
  });
};

/**
 * Invalidate the owning PR when the RFQ changes.
 */
const invalidateOwningPr = async (queryClient, rfqId) => {
  const normalizedRfqId = normalizeId(rfqId);

  const cachedRfq = queryClient.getQueryData(
    RFQ_DETAIL_KEY(normalizedRfqId)
  );

  const prId = cachedRfq?.pr_id;

  if (!prId) return;

  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: PR_DETAIL_KEY(prId),
      refetchType: "active",
    }),
    queryClient.invalidateQueries({
      queryKey: PR_TIMELINE_KEY(prId),
      refetchType: "active",
    }),
  ]);
};

/**
 * Create RFQ.
 */
export const useCreateRfq = (prId) => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (dueDate) =>
      rfqService.createRfq(prId, dueDate),

    onSuccess: async () => {
      await Promise.all([
        invalidateRfqLists(qc),

        qc.invalidateQueries({
          queryKey: PR_DETAIL_KEY(prId),
          refetchType: "active",
        }),

        qc.invalidateQueries({
          queryKey: PR_TIMELINE_KEY(prId),
          refetchType: "active",
        }),
      ]);
    },
  });
};

/**
 * Invite vendors to RFQ.
 *
 * Important:
 * After successful invitation, explicitly refetch the active
 * RFQ detail and vendor queries so the Send RFQ button can
 * appear immediately.
 */
export const useInviteVendors = (rfqId) => {
  const qc = useQueryClient();

  const normalizedRfqId = normalizeId(rfqId);

  return useMutation({
    mutationFn: (vendorIds) =>
      rfqService.inviteVendors(
        normalizedRfqId,
        vendorIds
      ),

    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({
          queryKey: RFQ_DETAIL_KEY(normalizedRfqId),
          refetchType: "active",
        }),

        qc.invalidateQueries({
          queryKey: RFQ_VENDORS_KEY(normalizedRfqId),
          refetchType: "active",
        }),

        invalidateRfqLists(qc),

        invalidateOwningPr(qc, normalizedRfqId),
      ]);

      /*
       * Force the currently mounted RFQ detail/vendor queries
       * to receive the latest server state immediately.
       */
      await Promise.all([
        qc.refetchQueries({
          queryKey: RFQ_DETAIL_KEY(normalizedRfqId),
          type: "active",
        }),

        qc.refetchQueries({
          queryKey: RFQ_VENDORS_KEY(normalizedRfqId),
          type: "active",
        }),
      ]);
    },
  });
};

/**
 * Send RFQ to invited vendors.
 */
export const useSendRfq = (rfqId) => {
  const qc = useQueryClient();

  const normalizedRfqId = normalizeId(rfqId);

  return useMutation({
    mutationFn: () =>
      rfqService.sendRfq(normalizedRfqId),

    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({
          queryKey: RFQ_DETAIL_KEY(normalizedRfqId),
          refetchType: "active",
        }),

        invalidateRfqLists(qc),

        invalidateOwningPr(qc, normalizedRfqId),
      ]);

      await qc.refetchQueries({
        queryKey: RFQ_DETAIL_KEY(normalizedRfqId),
        type: "active",
      });
    },
  });
};

/**
 * Close RFQ.
 */
export const useCloseRfq = (rfqId) => {
  const qc = useQueryClient();

  const normalizedRfqId = normalizeId(rfqId);

  return useMutation({
    mutationFn: () =>
      rfqService.closeRfq(normalizedRfqId),

    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({
          queryKey: RFQ_DETAIL_KEY(normalizedRfqId),
          refetchType: "active",
        }),

        invalidateRfqLists(qc),
      ]);

      await qc.refetchQueries({
        queryKey: RFQ_DETAIL_KEY(normalizedRfqId),
        type: "active",
      });
    },
  });
};