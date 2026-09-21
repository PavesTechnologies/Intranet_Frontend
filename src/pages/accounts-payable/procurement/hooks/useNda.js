import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import ndaService from "../services/ndaService";
import { asId } from "../constants/vendorOnboarding";
import { PR_DETAIL_KEY } from "./usePurchaseRequisitionDetail";
import { ONBOARDING_REQUESTS_KEY, ONBOARDING_REQUEST_KEY } from "./useVendorOnboarding";
import { RFQ_ELIGIBILITY_KEY } from "./useRfqEligibility";

export const NDA_KEY = ["accountsPayable", "procurement", "nda"];

export const VENDOR_NDA_KEY = (vendorId, departmentId, purchaseCategoryId) => [
  ...NDA_KEY,
  "vendor",
  asId(vendorId),
  asId(departmentId),
  asId(purchaseCategoryId),
];

export const NDA_DETAIL_KEY = (ndaId) => [...NDA_KEY, "detail", asId(ndaId)];

/**
 * Existing-NDA lookup for a vendor in one department/category scope
 * (GET /apm/nda/vendor/{vendor_id}). The `outcome` — VALID / NOT_FOUND / INVALID / EXPIRED —
 * is the backend's, and is what decides whether an NDA can be reused; the UI only renders it.
 */
export const useVendorNda = (vendorId, { departmentId, purchaseCategoryId, enabled = true } = {}) =>
  useQuery({
    queryKey: VENDOR_NDA_KEY(vendorId, departmentId, purchaseCategoryId),
    queryFn: () => ndaService.getVendorNda(vendorId, { departmentId, purchaseCategoryId }),
    enabled: Boolean(vendorId) && enabled,
    staleTime: 0,
    gcTime: 5 * 60_000,
    retry: 1,
  });

export const useNdaDetail = (ndaId) =>
  useQuery({
    queryKey: NDA_DETAIL_KEY(ndaId),
    queryFn: () => ndaService.getNda(ndaId),
    enabled: Boolean(ndaId),
    staleTime: 0,
    gcTime: 5 * 60_000,
    retry: 1,
  });

/** An NDA transition changes RFQ eligibility and the onboarding request's readiness. */
const invalidateNdaGraph = (qc, { prId, requestId } = {}) => {
  qc.invalidateQueries({ queryKey: NDA_KEY });
  qc.invalidateQueries({ queryKey: RFQ_ELIGIBILITY_KEY });
  qc.invalidateQueries({ queryKey: ONBOARDING_REQUESTS_KEY });

  if (requestId) qc.invalidateQueries({ queryKey: ONBOARDING_REQUEST_KEY(requestId) });
  if (prId) qc.invalidateQueries({ queryKey: PR_DETAIL_KEY(prId) });
};

/** POST /apm/nda/generate — may return an existing NDA instead (`reused: true`). */
export const useGenerateNda = ({ prId, requestId } = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => ndaService.generateNda(payload),
    onSuccess: () => invalidateNdaGraph(qc, { prId, requestId }),
  });
};

/**
 * POST /apm/nda/{nda_id}/send. A delivery failure is reported as `sent: false` with an
 * `error` on a 200 response, so callers must inspect the result rather than rely on onError.
 */
export const useSendNda = ({ prId, requestId } = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ndaId) => ndaService.sendNda(ndaId),
    onSuccess: () => invalidateNdaGraph(qc, { prId, requestId }),
  });
};

/**
 * POST /apm/nda/{nda_id}/signed-document.
 *
 * Nothing is updated optimistically — the backend decides the resulting status, so the cache
 * is only invalidated once it has answered. That also means a failed upload leaves both the
 * UI and the server exactly as they were.
 */
export const useUploadSignedNda = ({ prId, requestId } = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ndaId, file }) => ndaService.uploadSignedDocument(ndaId, file),
    onSuccess: () => invalidateNdaGraph(qc, { prId, requestId }),
  });
};

/** PATCH /apm/nda/{nda_id}/status */
export const useUpdateNdaStatus = ({ prId, requestId } = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ndaId, statusCode, reason, signedDocumentKey }) =>
      ndaService.updateNdaStatus(ndaId, { statusCode, reason, signedDocumentKey }),
    onSuccess: () => invalidateNdaGraph(qc, { prId, requestId }),
  });
};

export default useVendorNda;
